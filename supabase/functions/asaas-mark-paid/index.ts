// Master/admin marca uma fatura como paga manualmente (offline)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getAdmin, corsHeaders } from "../_shared/asaas.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return j({ error: "unauthorized" }, 401);
    const { data: roles } = await userClient.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
    if (!roles?.length) return j({ error: "forbidden" }, 403);

    const { invoice_id } = await req.json();
    const admin = getAdmin();
    const { data: inv } = await admin.from("invoices").select("*").eq("id", invoice_id).single();
    if (!inv) return j({ error: "not found" }, 404);

    await admin.from("invoices").update({ status: "paid", paid_at: new Date().toISOString(), manual: true }).eq("id", invoice_id);
    if (inv.type === "adhesion") {
      await admin.from("profiles").update({
        adhesion_status: "paid", adhesion_paid_at: new Date().toISOString(),
        status: "active", current_period_start: new Date().toISOString(),
      }).eq("id", inv.owner_id);
    } else {
      await admin.from("profiles").update({ status: "active", current_period_start: new Date().toISOString() }).eq("id", inv.owner_id);
    }
    await admin.from("billing_logs").insert({
      owner_id: inv.owner_id, invoice_id, action: "manual_paid", success: true,
      response: { by: user.email },
    });
    return j({ ok: true });
  } catch (e: any) { return j({ error: e.message }, 500); }
});
const j = (b: any, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
