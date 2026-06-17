// @ts-nocheck
// Centralized "new sale detected" side effects:
// in-app notification + web push + Utmify + LowTrack.
// Called from rlx-webhook, webhook-payment, and creditSellerIfPending (dashboard polling / immediate checkout).

async function logIntegrationCall(
  supabaseAdmin: any,
  opts: {
    userId: string;
    txId: string;
    provider: "utmify" | "lowtrack" | "pushcut";
    statusCode?: number | null;
    ok?: boolean;
    payload?: any;
    response?: string | null;
    error?: string | null;
  },
) {
  const tag = `[sale:${opts.txId}][${opts.provider}]`;
  if (opts.error) console.log(`${tag} ERROR`, opts.error);
  else console.log(`${tag} → HTTP ${opts.statusCode} ok=${opts.ok}`, (opts.response || "").slice(0, 300));
  try {
    await supabaseAdmin.from("integration_logs").insert({
      user_id: opts.userId,
      transaction_id: opts.txId,
      provider: opts.provider,
      status_code: opts.statusCode ?? null,
      ok: opts.ok ?? null,
      request_payload: opts.payload ?? null,
      response_body: opts.response ?? null,
      error: opts.error ?? null,
    });
  } catch (e) {
    console.log(`${tag} log insert failed`, e);
  }
}


export async function notifyNewSale(supabaseAdmin: any, txId: string) {
  const { data: tx } = await supabaseAdmin
    .from("transactions")
    .select("*")
    .eq("id", txId)
    .maybeSingle();
  if (!tx) return;

  const userId = tx.user_id;

  // Read merchant preferences
  let currency = "MZN";
  let notificationsEnabled = true;
  try {
    const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId);
    const meta = user?.user?.user_metadata ?? {};
    if (meta.currency) currency = String(meta.currency);
    if (meta.notifications_enabled === false) notificationsEnabled = false;
  } catch {}

  // Read merchant integration bundle
  const { data: bundle } = await supabaseAdmin
    .from("integration_settings")
    .select("push_custom, pushcut, utmify, mozesms")
    .eq("user_id", userId)
    .eq("integration_key", "_bundle")
    .maybeSingle();

  let productName: string | null = null;
  let productUtmifyId: string | null = null;
  let productLowtrackId: string | null = null;
  if (tx.product_id) {
    const { data: prod } = await supabaseAdmin
      .from("products")
      .select("name,utimify_id,lawtracker_id")
      .eq("id", tx.product_id)
      .maybeSingle();
    productName = prod?.name ?? null;
    productUtmifyId = prod?.utimify_id ?? null;
    productLowtrackId = prod?.lawtracker_id ?? null;
  }

  const { convertAmount } = await import("@/lib/currency.functions");

  // ---------- In-app + web push ----------
  if (notificationsEnabled) {
    const pushCurrency = (bundle?.push_custom?.currency as string) || currency;
    const formattedAmount = Number(tx.amount_mzn).toLocaleString("pt-MZ", {
      style: "currency",
      currency: pushCurrency,
    });
    const fillVars = (s: string) =>
      s
        .replaceAll("{valor}", formattedAmount)
        .replaceAll("{produto}", productName ?? "")
        .replaceAll("{cliente}", tx.customer_name ?? "Cliente");

    const customTitle = (bundle?.push_custom?.title as string) || "💰 Nova venda aprovada!";
    const customBody = (bundle?.push_custom?.body as string) || `{valor} — {cliente}`;
    const title = fillVars(customTitle);
    const body = fillVars(customBody);

    // In-app notification (idempotent: skip if one already exists for this tx)
    try {
      const { data: existing } = await supabaseAdmin
        .from("notifications")
        .select("id")
        .eq("user_id", userId)
        .eq("type", "sale")
        .contains("data", { transaction_id: tx.id })
        .maybeSingle();
      if (!existing) {
        await supabaseAdmin.from("notifications").insert({
          user_id: userId,
          type: "sale",
          title,
          message: body,
          data: {
            transaction_id: tx.id,
            amount_mzn: Number(tx.amount_mzn),
            currency: pushCurrency,
            customer_name: tx.customer_name ?? null,
            product_name: productName,
          },
        });
      }
    } catch (e) {
      console.log("[notifyNewSale] in-app insert failed", e);
    }

    // Web push
    try {
      const { sendPushToUser } = await import("@/lib/push.functions");
      const r = await sendPushToUser(supabaseAdmin, userId, title, body, "/dashboard/transactions");
      if (!r.ok) console.log("[notifyNewSale] push not sent:", r.reason);
    } catch (e) {
      console.log("[notifyNewSale] push error", e);
    }

    // PUSHcut
    try {
      const pushcutUrl = bundle?.pushcut?.enabled ? (bundle?.pushcut?.webhook_url as string) : null;
      if (pushcutUrl) {
        fetch(pushcutUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title, text: body, input: String(tx.id) }),
        }).catch(() => {});
      }
    } catch {}
  }

  // ---------- Utmify ----------
  try {
    let utmifyToken = bundle?.utmify?.enabled ? (bundle?.utmify?.api_token as string | undefined) : undefined;
    if (!utmifyToken) {
      const { data: utmifyCfg } = await supabaseAdmin
        .from("integration_settings")
        .select("settings")
        .eq("user_id", userId)
        .eq("integration_key", "utimify")
        .maybeSingle();
      utmifyToken = utmifyCfg?.settings?.api_token as string | undefined;
    }
    if (utmifyToken) {
      const utmifyCurrency = (bundle?.utmify?.currency as string) || "BRL";
      const convertedAmount = await convertAmount(Number(tx.amount_mzn), "MZN", utmifyCurrency);
      const convertedNet = await convertAmount(Number(tx.net_mzn || 0), "MZN", utmifyCurrency);
      const amountCents = Math.round(convertedAmount * 100);
      const netCents = Math.round(convertedNet * 100);
      const feeCents = Math.max(0, amountCents - netCents);
      const nowIso = new Date().toISOString().replace("T", " ").slice(0, 19);
      const createdIso = new Date(tx.created_at).toISOString().replace("T", " ").slice(0, 19);
      const trk = (tx.metadata as any)?.tracking || {};
      const utmifyBody = {
        orderId: String(tx.id),
        platform: "RedoxPay",
        paymentMethod: "pix",
        status: "paid",
        createdAt: createdIso,
        approvedDate: nowIso,
        refundedAt: null,
        customer: {
          name: tx.customer_name ?? "",
          email: tx.customer_email ?? "",
          phone: tx.customer_phone ?? "",
          document: null,
          country: "MZ",
          ip: "0.0.0.0",
        },
        products: [
          {
            id: productUtmifyId ?? String(tx.product_id ?? tx.id),
            name: productName ?? "Produto",
            planId: null,
            planName: null,
            quantity: 1,
            priceInCents: amountCents,
          },
        ],
        trackingParameters: {
          src: trk.src ?? null,
          sck: trk.sck ?? null,
          utm_source: trk.utm_source ?? null,
          utm_campaign: trk.utm_campaign ?? null,
          utm_medium: trk.utm_medium ?? null,
          utm_content: trk.utm_content ?? null,
          utm_term: trk.utm_term ?? null,
        },
        commission: {
          totalPriceInCents: amountCents,
          gatewayFeeInCents: feeCents,
          userCommissionInCents: netCents,
        },
        isTest: false,
      };
      fetch("https://api.utmify.com.br/api-credentials/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-token": utmifyToken },
        body: JSON.stringify(utmifyBody),
      })
        .then(async (r) => {
          const t = await r.text().catch(() => "");
          await logIntegrationCall(supabaseAdmin, {
            userId, txId: tx.id, provider: "utmify",
            statusCode: r.status, ok: r.ok, payload: utmifyBody, response: t,
          });
        })
        .catch(async (e) => {
          await logIntegrationCall(supabaseAdmin, {
            userId, txId: tx.id, provider: "utmify",
            payload: utmifyBody, error: String(e?.message ?? e),
          });
        });

    }
  } catch (e) {
    console.log("[notifyNewSale] utmify error", e);
  }

  // ---------- LowTrack ----------
  try {
    const { data: lowtrackCfg } = await supabaseAdmin
      .from("integration_settings")
      .select("settings")
      .eq("user_id", userId)
      .eq("integration_key", "lowtrack")
      .maybeSingle();
    const lowtrackUrl = lowtrackCfg?.settings?.webhook_url as string | undefined;
    const lowtrackEnabled = lowtrackCfg?.settings?.enabled !== false;
    const lowtrackToken = lowtrackCfg?.settings?.api_token as string | undefined;
    if (lowtrackUrl && lowtrackEnabled) {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (lowtrackToken) headers["Authorization"] = `Bearer ${lowtrackToken}`;
      const lowtrackCurrency = (lowtrackCfg?.settings?.currency as string) || "BRL";
      const ltAmount =
        Math.round((await convertAmount(Number(tx.amount_mzn), "MZN", lowtrackCurrency)) * 100) / 100;
      const ltBody = {
        event: "sale.approved",
        status: "paid",
        transaction_id: String(tx.id),
        amount: ltAmount,
        sale_amount: ltAmount,
        currency: lowtrackCurrency,
        product_id: productLowtrackId || undefined,
        offer_id: productLowtrackId || undefined,
        product_name: productName || undefined,
        customer: {
          name: tx.customer_name || "",
          phone: tx.customer_phone || "",
          email: tx.customer_email || "",
        },
        created_at: tx.created_at,
      };
      fetch(lowtrackUrl, { method: "POST", headers, body: JSON.stringify(ltBody) })
        .then(async (r) => {
          const t = await r.text().catch(() => "");
          console.log("[LowTrack] →", r.status, t.slice(0, 200));
        })
        .catch((e) => console.log("[LowTrack] error", e));
    }
  } catch (e) {
    console.log("[notifyNewSale] lowtrack error", e);
  }
}
