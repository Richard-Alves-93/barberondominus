// Recebe eventos do Asaas e atualiza faturas / status da barbearia
import { getAdmin, corsHeaders } from "../_shared/asaas.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = getAdmin();
  const expected = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
  const got = req.headers.get("asaas-access-token");
  if (expected && got !== expected) {
    await admin.from("billing_logs").insert({ action: "webhook_rejected", direction: "inbound", success: false, error: "bad token" });
    return new Response("forbidden", { status: 403 });
  }

  let payload: any;
  try { payload = await req.json(); } catch { return new Response("bad json", { status: 400 }); }
  const event = payload?.event as string;
  const p = payload?.payment;
  if (!event || !p?.id) return new Response("ok", { status: 200 });

  // Find invoice
  const { data: invoice } = await admin.from("invoices").select("*").eq("asaas_payment_id", p.id).maybeSingle();
  await admin.from("billing_logs").insert({
    owner_id: invoice?.owner_id ?? null,
    invoice_id: invoice?.id ?? null,
    action: `webhook:${event}`,
    direction: "inbound",
    success: true,
    response: payload,
  });

  if (!invoice) return new Response("ok", { status: 200 });

  const paidEvents = ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_RECEIVED_IN_CASH"];
  const failedEvents = ["PAYMENT_OVERDUE", "PAYMENT_REFUNDED", "PAYMENT_DELETED", "PAYMENT_CHARGEBACK_REQUESTED"];

  if (paidEvents.includes(event)) {
    await admin.from("invoices").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", invoice.id);

    if (invoice.type === "adhesion") {
      await admin.from("profiles").update({
        adhesion_status: "paid",
        adhesion_paid_at: new Date().toISOString(),
        status: "active",
        current_period_start: new Date().toISOString(),
      }).eq("id", invoice.owner_id);
    } else {
      // monthly: avança ciclo
      await admin.from("profiles").update({
        status: "active",
        current_period_start: new Date().toISOString(),
      }).eq("id", invoice.owner_id);
    }
  } else if (failedEvents.includes(event)) {
    await admin.from("invoices").update({ status: event === "PAYMENT_OVERDUE" ? "overdue" : "cancelled" }).eq("id", invoice.id);
    if (event === "PAYMENT_OVERDUE" && invoice.type === "monthly") {
      await admin.from("profiles").update({ status: "overdue" }).eq("id", invoice.owner_id);
    }
  }

  return new Response("ok", { status: 200 });
});
