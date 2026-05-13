// Shared Asaas helper (sandbox by default)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const ASAAS_BASE =
  Deno.env.get("ASAAS_ENV") === "production"
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";

export const getAdmin = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

export async function asaasFetch(
  path: string,
  init: RequestInit & { logCtx?: { owner_id?: string; invoice_id?: string; action: string } } = { action: "" } as any
) {
  const key = Deno.env.get("ASAAS_API_KEY");
  const { logCtx, ...rest } = init as any;
  if (!key) {
    return { ok: false, status: 500, data: { error: "ASAAS_API_KEY not configured" } };
  }
  const r = await fetch(`${ASAAS_BASE}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      access_token: key,
      "User-Agent": "BarberOn/1.0",
      ...(rest.headers || {}),
    },
  });
  let data: any = null;
  try { data = await r.json(); } catch { data = null; }
  if (logCtx) {
    try {
      await getAdmin().from("billing_logs").insert({
        owner_id: logCtx.owner_id ?? null,
        invoice_id: logCtx.invoice_id ?? null,
        action: logCtx.action,
        direction: "outbound",
        success: r.ok,
        http_status: r.status,
        request: { path, body: rest.body ? safeJson(rest.body) : null },
        response: data,
        error: r.ok ? null : (data?.errors?.[0]?.description ?? `HTTP ${r.status}`),
      });
    } catch (_) { /* ignore */ }
  }
  return { ok: r.ok, status: r.status, data };
}

function safeJson(v: any) { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return null; } }

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
