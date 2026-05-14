// Cria cliente Asaas (se necessário) + cobrança única de adesão
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { asaasFetch, getAdmin, corsHeaders } from "../_shared/asaas.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const billingType = ["PIX", "BOLETO", "CREDIT_CARD"].includes(body.billingType) ? body.billingType : "PIX";
    const planId = body.planId as string | undefined;

    const admin = getAdmin();
    const { data: profile } = await admin.from("profiles").select("*").eq("id", user.id).single();
    if (!profile) return json({ error: "profile not found" }, 404);

    const targetPlanId = planId ?? profile.plan_id;
    if (!targetPlanId) return json({ error: "plan required" }, 400);
    const billingMode = ["fixed", "percent"].includes(body.billingMode) ? body.billingMode : (profile.billing_mode ?? "fixed");
    const { data: plan } = await admin.from("plans").select("*").eq("id", targetPlanId).single();
    if (!plan) return json({ error: "plan not found" }, 404);

    // Se houver link manual configurado pelo Master, priorizá-lo
    if (plan.adhesion_link) {
      await admin.from("profiles").update({
        plan_id: targetPlanId, billing_mode: billingMode, billing_method: billingType, adhesion_status: "pending", status: "pending",
      }).eq("id", user.id);
      const { data: invoice } = await admin.from("invoices").insert({
        owner_id: user.id, plan_id: targetPlanId, type: "adhesion",
        amount: Number(plan.adhesion_fee), status: "pending", billing_type: "EXTERNAL_LINK",
        invoice_url: plan.adhesion_link, manual: true, metadata: { source: "external_link" },
      }).select().single();
      await admin.from("billing_logs").insert({
        owner_id: user.id, invoice_id: invoice?.id, action: "external_link_used", success: true,
        response: { url: plan.adhesion_link },
      });
      return json({ ok: true, invoice, external: true });
    }

    // 1) Customer
    let customerId = profile.asaas_customer_id;
    if (!customerId) {
      const cust = await asaasFetch("/customers", {
        method: "POST",
        body: JSON.stringify({
          name: profile.barbershop_name ?? profile.full_name ?? user.email,
          email: user.email,
          externalReference: user.id,
        }),
        logCtx: { owner_id: user.id, action: "create_customer" },
      } as any);
      if (!cust.ok) return json({ error: "asaas_customer_failed", details: cust.data }, 502);
      customerId = cust.data.id;
      await admin.from("profiles").update({ asaas_customer_id: customerId, plan_id: targetPlanId, billing_method: billingType }).eq("id", user.id);
    } else {
      await admin.from("profiles").update({ plan_id: targetPlanId, billing_method: billingType }).eq("id", user.id);
    }

    // 2) Cobrança avulsa
    const due = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const charge = await asaasFetch("/payments", {
      method: "POST",
      body: JSON.stringify({
        customer: customerId,
        billingType,
        value: Number(plan.adhesion_fee),
        dueDate: due,
        description: `Adesão Barber On — ${plan.name}`,
        externalReference: `adhesion:${user.id}`,
      }),
      logCtx: { owner_id: user.id, action: "create_adhesion_payment" },
    } as any);
    if (!charge.ok) return json({ error: "asaas_payment_failed", details: charge.data }, 502);

    // 3) Pix QR (se PIX)
    let pix: any = null;
    if (billingType === "PIX") {
      const r = await asaasFetch(`/payments/${charge.data.id}/pixQrCode`, {
        method: "GET",
        logCtx: { owner_id: user.id, action: "get_pix_qr" },
      } as any);
      if (r.ok) pix = r.data;
    }

    const { data: invoice } = await admin.from("invoices").insert({
      owner_id: user.id,
      plan_id: targetPlanId,
      asaas_payment_id: charge.data.id,
      type: "adhesion",
      amount: Number(plan.adhesion_fee),
      due_date: due,
      status: "pending",
      billing_type: billingType,
      invoice_url: charge.data.invoiceUrl,
      bank_slip_url: charge.data.bankSlipUrl,
      pix_payload: pix?.payload ?? null,
      pix_qr_image: pix?.encodedImage ? `data:image/png;base64,${pix.encodedImage}` : null,
      metadata: charge.data,
    }).select().single();

    await admin.from("profiles").update({ adhesion_status: "pending", status: "pending" }).eq("id", user.id);

    return json({ ok: true, invoice });
  } catch (e: any) {
    return json({ error: e.message ?? String(e) }, 500);
  }
});

function json(b: any, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
