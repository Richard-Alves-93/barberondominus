// Roda diariamente: para cada barbearia ativa cujo ciclo de 30 dias venceu,
// calcula faturamento, gera fatura mensal max(fixo, %) e cria cobrança Asaas
// (cartão preferencialmente; senão Pix/Boleto).
import { asaasFetch, getAdmin, corsHeaders } from "../_shared/asaas.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = getAdmin();
  const body = await req.json().catch(() => ({}));
  const force = body?.force === true;
  const onlyOwner = body?.owner_id as string | undefined;

  let q = admin.from("profiles")
    .select("id, plan_id, status, adhesion_status, current_period_start, asaas_customer_id, billing_method, billing_mode")
    .eq("adhesion_status", "paid");
  if (onlyOwner) q = q.eq("id", onlyOwner);
  const { data: profiles } = await q;

  const results: any[] = [];
  for (const p of profiles ?? []) {
    if (!p.plan_id || !p.asaas_customer_id) continue;
    const periodStart = p.current_period_start ? new Date(p.current_period_start) : new Date();
    const periodEnd = new Date(periodStart.getTime() + 30 * 24 * 3600 * 1000);
    if (!force && periodEnd > new Date()) continue;

    const { data: plan } = await admin.from("plans").select("*").eq("id", p.plan_id).single();
    if (!plan) continue;

    // faturamento do período
    const { data: sales } = await admin.from("sales")
      .select("total")
      .eq("owner_id", p.id)
      .eq("status", "paid")
      .gte("created_at", periodStart.toISOString())
      .lt("created_at", periodEnd.toISOString());
    const revenue = (sales ?? []).reduce((s, r: any) => s + Number(r.total || 0), 0);
    const fixed = Number(plan.monthly_price);
    const pct = revenue * (Number(plan.revenue_percent) / 100);
    const mode = (p as any).billing_mode === "percent" ? "percent" : "fixed";
    const amount = mode === "percent" ? pct : fixed;

    const due = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const billingType = "CREDIT_CARD"; // mensalidade obrigatoriamente em cartão

    // Se houver link manual configurado para o plano, usá-lo (não chama Asaas)
    if (plan.monthly_link) {
      const { data: invoice } = await admin.from("invoices").insert({
        owner_id: p.id, plan_id: p.plan_id, type: "monthly",
        amount, base_revenue: revenue, due_date: due, status: "pending",
        billing_type: "EXTERNAL_LINK", invoice_url: plan.monthly_link, manual: true,
        period_start: periodStart.toISOString(), period_end: periodEnd.toISOString(),
        metadata: { source: "external_link", mode },
      }).select().single();
      await admin.from("profiles").update({
        last_monthly_amount: amount, last_monthly_calc_at: new Date().toISOString(),
      }).eq("id", p.id);
      results.push({ owner: p.id, invoice_id: invoice?.id, amount, revenue, external: true });
      continue;
    }

    const charge = await asaasFetch("/payments", {
      method: "POST",
      body: JSON.stringify({
        customer: p.asaas_customer_id,
        billingType,
        value: Number(amount.toFixed(2)),
        dueDate: due,
        description: `Mensalidade Barber On — ${plan.name} (${mode === "percent" ? `${plan.revenue_percent}% s/ ${revenue.toFixed(2)}` : "fixa"})`,
        externalReference: `monthly:${p.id}:${periodEnd.toISOString().slice(0,10)}`,
      }),
      logCtx: { owner_id: p.id, action: "create_monthly_payment" },
    } as any);

    if (!charge.ok) { results.push({ owner: p.id, error: charge.data }); continue; }

    const { data: invoice } = await admin.from("invoices").insert({
      owner_id: p.id,
      plan_id: p.plan_id,
      asaas_payment_id: charge.data.id,
      type: "monthly",
      amount,
      base_revenue: revenue,
      due_date: due,
      status: "pending",
      billing_type: billingType,
      invoice_url: charge.data.invoiceUrl,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      metadata: { ...charge.data, mode },
    }).select().single();

    await admin.from("profiles").update({
      last_monthly_amount: amount,
      last_monthly_calc_at: new Date().toISOString(),
    }).eq("id", p.id);

    results.push({ owner: p.id, invoice_id: invoice?.id, amount, revenue });
  }

  return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
