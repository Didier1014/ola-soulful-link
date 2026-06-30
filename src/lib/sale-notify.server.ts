// @ts-nocheck
// Centralized "new sale detected" side effects:
// in-app notification + web push + Utmify + LowTrack.
// Called from createCheckout/payLink e pelo
// safety-net em listMyTransactions/checkTransactionStatus.

async function logIntegrationCall(
  supabaseAdmin: any,
  opts: {
    userId: string;
    txId: string;
    provider: "webpush" | "utmify" | "lowtrack" | "pushcut";
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
    const { error } = await supabaseAdmin.from("integration_logs").insert({
      user_id: opts.userId,
      transaction_id: opts.txId,
      provider: opts.provider,
      status_code: opts.statusCode ?? null,
      ok: opts.ok ?? null,
      request_payload: opts.payload ?? null,
      response_body: opts.response ?? null,
      error: opts.error ?? null,
    });
    if (error) {
      // 23505 = unique_violation against integration_logs_unique_success
      // Means a concurrent attempt already logged ok=true for this (tx,provider).
      // Treat as graceful "already sent" — not a real failure.
      if ((error as any).code === "23505") {
        console.log(`${tag} duplicate success log suppressed (concurrent send won the race)`);
      } else {
        console.log(`${tag} log insert failed`, (error as any).message);
      }
    }
  } catch (e) {
    console.log(`${tag} log insert failed`, e);
  }
}

/**
 * Per-sale processing lock to serialize concurrent webhooks for the same sale.
 * First caller inserts the row and proceeds. Concurrent callers hit the PK
 * conflict and skip — the winner writes the ok=true logs, so by the time the
 * loser would have run, hasSuccessfulIntegration() short-circuits each channel.
 * Returns true if we acquired the lock (caller should proceed).
 */
async function acquireSaleLock(supabaseAdmin: any, txId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from("sale_processing_locks")
      .insert({ transaction_id: txId });
    if (!error) return true;
    if ((error as any).code === "23505") {
      console.log(`[sale:${txId}] lock already held — concurrent webhook in progress, skipping`);
      return false;
    }
    // Unknown error — don't block delivery; per-channel unique index still
    // protects against duplicate sends.
    console.log(`[sale:${txId}] lock insert error (proceeding without lock):`, (error as any).message);
    return true;
  } catch (e) {
    console.log(`[sale:${txId}] lock insert threw (proceeding without lock):`, e);
    return true;
  }
}

async function hasSuccessfulIntegration(supabaseAdmin: any, userId: string, txId: string, provider: string) {
  const { data } = await supabaseAdmin
    .from("integration_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("transaction_id", txId)
    .eq("provider", provider)
    .eq("ok", true)
    .limit(1)
    .maybeSingle();
  return Boolean(data?.id);
}

async function postJsonWithTimeout(
  url: string,
  init: { headers?: Record<string, string>; body: any },
  timeoutMs = 4500,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: init.headers,
      body: JSON.stringify(init.body),
      signal: controller.signal,
    });
    const text = await res.text().catch(() => "");
    return { status: res.status, ok: res.ok, text };
  } finally {
    clearTimeout(timer);
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
  console.log(`[sale:${tx.id}] notifyNewSale start user=${userId} status=${tx.status}`);
  if (tx.status !== "paid") {
    console.log(`[sale:${tx.id}] skipped — status is ${tx.status}`);
    return;
  }

  // Serialize concurrent webhooks for the same sale. If another invocation
  // is already processing this transaction, skip — it will (or already did)
  // write the ok=true integration logs.
  const gotLock = await acquireSaleLock(supabaseAdmin, tx.id);
  if (!gotLock) return;

  try {



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
  let productPushcutUrl: string | null = null;
  if (tx.product_id) {
    const { data: prod } = await supabaseAdmin
      .from("products")
      .select("name,utimify_id,lawtracker_id,config")
      .eq("id", tx.product_id)
      .maybeSingle();
    productName = prod?.name ?? null;
    productUtmifyId = prod?.utimify_id ?? null;
    productLowtrackId = prod?.lawtracker_id ?? null;
    productPushcutUrl = (prod?.config as any)?.pushcut_webhook_url || null;
  }

  const { convertAmount } = await import("@/lib/currency.functions");

  // ---------- In-app + web push ----------
  if (notificationsEnabled) {
    const pushCurrency = (bundle?.push_custom?.currency as string) || currency;
    const displayAmount =
      pushCurrency === "MZN"
        ? Number(tx.amount_mzn)
        : await convertAmount(Number(tx.amount_mzn), "MZN", pushCurrency);
    const localeMap: Record<string, string> = {
      MZN: "pt-MZ",
      BRL: "pt-BR",
      USD: "en-US",
      EUR: "de-DE",
      ZAR: "en-ZA",
    };
    const formattedAmount = displayAmount.toLocaleString(localeMap[pushCurrency] ?? "pt-MZ", {
      style: "currency",
      currency: pushCurrency,
    });
    console.log(`[sale:${tx.id}][notification] amount converted ${tx.amount_mzn} MZN → ${displayAmount} ${pushCurrency}`);
    const fillVars = (s: string) =>
      s
        .replaceAll("{valor}", formattedAmount)
        .replaceAll("{produto}", productName ?? "")
        .replaceAll("{cliente}", tx.customer_name ?? "Cliente");

    const customTitle = (bundle?.push_custom?.title as string) || "💰 Nova venda aprovada!";
    const customBody = (bundle?.push_custom?.body as string) || `{valor} — {cliente}`;
    const title = fillVars(customTitle);
    const body = fillVars(customBody);

    // In-app notification (idempotent; does NOT gate push/tracking)
    let wasInserted = false;
    try {
      const { data: existing } = await supabaseAdmin
        .from("notifications")
        .select("id")
        .eq("user_id", userId)
        .eq("type", "sale")
        .contains("data", { transaction_id: tx.id })
        .maybeSingle();
      if (!existing) {
        const { error: insErr } = await supabaseAdmin.from("notifications").insert({
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
        if (!insErr) wasInserted = true;
        else console.log(`[sale:${tx.id}][notification] insert error`, insErr.message);
      } else {
        console.log(`[sale:${tx.id}][notification] already exists`);
      }
    } catch (e) {
      console.log("[notifyNewSale] in-app insert failed", e);
    }
    if (wasInserted) console.log(`[sale:${tx.id}][notification] inserted`);

    // Web push
    try {
      if (await hasSuccessfulIntegration(supabaseAdmin, userId, tx.id, "webpush")) {
        console.log(`[sale:${tx.id}][webpush] already sent — skipping`);
      } else {
        console.log(`[sale:${tx.id}][webpush] dispatching user=${userId}`);
        const { sendPushToUser } = await import("@/lib/push.functions");
        const r = await sendPushToUser(supabaseAdmin, userId, title, body, "/dashboard/transactions");
        await logIntegrationCall(supabaseAdmin, {
          userId,
          txId: tx.id,
          provider: "webpush",
          ok: r.ok,
          payload: { title, body, url: "/dashboard/transactions" },
          response: JSON.stringify(r),
          error: r.ok ? null : r.reason ?? "push_failed",
        });
        if (!r.ok) console.log(`[sale:${tx.id}][webpush] not sent:`, r.reason);
      }
    } catch (e) {
      const err = String((e as any)?.message ?? e);
      await logIntegrationCall(supabaseAdmin, { userId, txId: tx.id, provider: "webpush", ok: false, payload: { title, body }, error: err });
      console.log(`[sale:${tx.id}][webpush] error`, e);
    }

    // PUSHcut
    try {
      const pushcutUrl = productPushcutUrl || (bundle?.pushcut?.enabled ? (bundle?.pushcut?.webhook_url as string) : null);
      if (pushcutUrl) {
        if (await hasSuccessfulIntegration(supabaseAdmin, userId, tx.id, "pushcut")) {
          console.log(`[sale:${tx.id}][pushcut] already sent — skipping`);
        } else {
          const payload = { title, text: body, input: String(tx.id) };
          const r = await postJsonWithTimeout(pushcutUrl, { headers: { "content-type": "application/json" }, body: payload });
          await logIntegrationCall(supabaseAdmin, { userId, txId: tx.id, provider: "pushcut", statusCode: r.status, ok: r.ok, payload, response: r.text });
        }
      }
    } catch (e) {
      await logIntegrationCall(supabaseAdmin, { userId, txId: tx.id, provider: "pushcut", ok: false, error: String((e as any)?.message ?? e) });
    }
  }

  // ---------- MozeSMS (Hexmo) ----------
  try {
    const sms = bundle?.mozesms as any;
    if (sms?.enabled && sms?.template && tx.customer_phone) {
      if (await hasSuccessfulIntegration(supabaseAdmin, userId, tx.id, "mozesms")) {
        console.log(`[sale:${tx.id}][mozesms] already sent — skipping`);
      } else {
        const formatted = `${Number(tx.amount_mzn).toLocaleString("pt-MZ", { style: "currency", currency: "MZN" })}`;
        const message = String(sms.template)
          .replaceAll("{nome}", tx.customer_name || "Cliente")
          .replaceAll("{produto}", productName || "")
          .replaceAll("{valor}", formatted)
          .replaceAll("{email}", tx.customer_email || "")
          .replaceAll("{suporte}", sms.support_phone || "")
          .replaceAll("{suporte2}", sms.support_phone2 || "");
        const { hexmoSendSms } = await import("@/lib/hexmo.server");
        const r = await hexmoSendSms({
          recipient: String(tx.customer_phone),
          sender_id: (sms.sender_id || "RedoxPay").slice(0, 11),
          message,
        });
        await logIntegrationCall(supabaseAdmin, {
          userId, txId: tx.id, provider: "mozesms",
          statusCode: r.status, ok: r.ok,
          payload: { to: tx.customer_phone, sender_id: sms.sender_id, message },
          response: typeof r.raw === "string" ? r.raw : JSON.stringify(r.raw ?? null),
          error: r.ok ? null : (r.error || "sms_failed"),
        });
        await supabaseAdmin.from("sms_logs").insert({
          user_id: userId,
          phone: tx.customer_phone,
          message,
          status: r.ok ? "sent" : "failed",
        });
      }
    }
  } catch (e) {
    await logIntegrationCall(supabaseAdmin, { userId, txId: tx.id, provider: "mozesms", ok: false, error: String((e as any)?.message ?? e) });
    console.log(`[sale:${tx.id}][mozesms] error`, e);
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
      if (await hasSuccessfulIntegration(supabaseAdmin, userId, tx.id, "utmify")) {
        console.log(`[sale:${tx.id}][utmify] already sent — skipping`);
      } else {
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
      console.log(`[sale:${tx.id}][utmify] dispatching orderId=${utmifyBody.orderId}`);
      const r = await postJsonWithTimeout("https://api.utmify.com.br/api-credentials/orders", {
        headers: { "Content-Type": "application/json", "x-api-token": utmifyToken },
        body: utmifyBody,
      });
      await logIntegrationCall(supabaseAdmin, {
        userId, txId: tx.id, provider: "utmify",
        statusCode: r.status, ok: r.ok, payload: utmifyBody, response: r.text,
      });
      }
    } else {
      console.log(`[sale:${tx.id}][utmify] not configured/enabled`);
    }
  } catch (e) {
    await logIntegrationCall(supabaseAdmin, { userId, txId: tx.id, provider: "utmify", ok: false, error: String((e as any)?.message ?? e) });
    console.log(`[sale:${tx.id}][utmify] error`, e);
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
      if (await hasSuccessfulIntegration(supabaseAdmin, userId, tx.id, "lowtrack")) {
        console.log(`[sale:${tx.id}][lowtrack] already sent — skipping`);
      } else {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (lowtrackToken) headers["Authorization"] = `Bearer ${lowtrackToken}`;
      const lowtrackCurrency = (lowtrackCfg?.settings?.currency as string) || "BRL";
      const ltAmount =
        Math.round((await convertAmount(Number(tx.amount_mzn), "MZN", lowtrackCurrency)) * 100) / 100;
      const trk = (tx.metadata as any)?.tracking || {};
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
        tracking: {
          src: trk.src ?? null,
          sck: trk.sck ?? null,
          utm_source: trk.utm_source ?? null,
          utm_campaign: trk.utm_campaign ?? null,
          utm_medium: trk.utm_medium ?? null,
          utm_content: trk.utm_content ?? null,
          utm_term: trk.utm_term ?? null,
          fbp: trk.fbp ?? null,
          fbc: trk.fbc ?? null,
        },
        created_at: tx.created_at,
      };
      console.log(`[sale:${tx.id}][lowtrack] dispatching url=${lowtrackUrl}`);
      const r = await postJsonWithTimeout(lowtrackUrl, { headers, body: ltBody });
      await logIntegrationCall(supabaseAdmin, {
        userId, txId: tx.id, provider: "lowtrack",
        statusCode: r.status, ok: r.ok,
        payload: { url: lowtrackUrl, body: ltBody }, response: r.text,
      });
      }
    } else {
      console.log(`[sale:${tx.id}][lowtrack] not configured/enabled`);
    }
  } catch (e) {
    await logIntegrationCall(supabaseAdmin, { userId, txId: tx.id, provider: "lowtrack", ok: false, error: String((e as any)?.message ?? e) });
    console.log(`[sale:${tx.id}][lowtrack] error`, e);
  }
  } finally {
    // Always release the per-sale lock, even on error, so legitimate retries
    // (sequential, after a failure) are not blocked by a stale lock row.
    try {
      await supabaseAdmin
        .from("sale_processing_locks")
        .delete()
        .eq("transaction_id", tx.id);
      console.log(`[sale:${tx.id}] lock released`);
    } catch (e) {
      console.log(`[sale:${tx.id}] lock release failed`, e);
    }
  }
}
