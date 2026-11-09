import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Admin-only: validates the VendusPay key stored in backend secrets (never sent from the browser). */
export const vendusValidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Acesso restrito a administradores");
    const apiKey = process.env["VENDUSPAY_API_KEY"];
    if (!apiKey) return { connected: false, status: 0, message: "Chave VendusPay não configurada" };
    const { validateVendusCredentials } = await import("./venduspay.server");
    try {
      return await validateVendusCredentials(apiKey, process.env["VENDUSPAY_CLIENT_ID"]);
    } catch {
      return { connected: false, status: 0, message: "Não foi possível contactar a VendusPay" };
    }
  });
