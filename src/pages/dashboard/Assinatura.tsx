import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, FileText, QrCode, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString("pt-BR") : "—";

const STATUS: Record<string, { label: string; cls: string }> = {
  paid: { label: "Pago", cls: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" },
  pending: { label: "Aberto", cls: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
  overdue: { label: "Vencido", cls: "bg-red-500/15 text-red-700 border-red-500/30" },
  cancelled: { label: "Cancelado", cls: "bg-muted text-muted-foreground" },
};

export default function Assinatura() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data: pr } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(pr);
    if (pr?.plan_id) {
      const { data: pl } = await supabase.from("plans").select("*").eq("id", pr.plan_id).single();
      setPlan(pl);
    }
    const { data: inv } = await supabase.from("invoices").select("*").eq("owner_id", user.id).order("created_at", { ascending: false });
    setInvoices(inv ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const open = invoices.filter(i => i.status === "pending" || i.status === "overdue");
  const history = invoices.filter(i => i.status === "paid" || i.status === "cancelled");
  const copy = (s: string) => { navigator.clipboard.writeText(s); toast.success("Copiado"); };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assinatura e Cobrança</h1>
          <p className="text-muted-foreground">Gerencie seu plano e pagamentos da plataforma</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-5">
            <p className="text-xs text-muted-foreground">Plano atual</p>
            <p className="text-2xl font-bold">{plan?.name ?? "Sem plano"}</p>
            {plan && <p className="text-xs text-muted-foreground mt-1">{fmt(Number(plan.monthly_price))} / mês ou {Number(plan.revenue_percent)}%</p>}
          </Card>
          <Card className="p-5">
            <p className="text-xs text-muted-foreground">Status da conta</p>
            <p className="text-2xl font-bold capitalize">{profile?.status ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">Adesão: {profile?.adhesion_status === "paid" ? "paga" : "pendente"}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs text-muted-foreground">Próxima cobrança estimada</p>
            <p className="text-2xl font-bold">{fmt(Number(profile?.last_monthly_amount ?? plan?.monthly_price ?? 0))}</p>
            <p className="text-xs text-muted-foreground mt-1">Ciclo iniciado em {fmtDate(profile?.current_period_start)}</p>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">Faturas em aberto</h2>
            <Button size="sm" variant="ghost" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          </div>
          {open.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              Nenhuma fatura em aberto
            </div>
          ) : (
            <div className="divide-y">
              {open.map(inv => {
                const s = STATUS[inv.status] ?? STATUS.pending;
                return (
                  <div key={inv.id} className="p-4 grid gap-3 md:grid-cols-[1fr_auto] items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{inv.type === "adhesion" ? "Adesão" : "Mensalidade"}</span>
                        <Badge variant="outline" className={s.cls}>{s.label}</Badge>
                        <Badge variant="outline">{inv.billing_type}</Badge>
                      </div>
                      <p className="text-2xl font-bold">{fmt(Number(inv.amount))}</p>
                      <p className="text-xs text-muted-foreground">Vence em {fmtDate(inv.due_date)}</p>
                      {inv.pix_payload && (
                        <div className="flex gap-2 max-w-md">
                          <input readOnly value={inv.pix_payload} className="flex-1 text-xs px-3 py-2 rounded-md border bg-muted font-mono truncate" />
                          <Button variant="outline" size="sm" onClick={() => copy(inv.pix_payload)}><Copy className="h-4 w-4" /></Button>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 min-w-[180px]">
                      {inv.bank_slip_url && <Button asChild variant="outline" size="sm"><a href={inv.bank_slip_url} target="_blank" rel="noreferrer"><FileText className="h-4 w-4 mr-2" />Boleto</a></Button>}
                      {inv.invoice_url && <Button asChild size="sm"><a href={inv.invoice_url} target="_blank" rel="noreferrer"><QrCode className="h-4 w-4 mr-2" />Abrir cobrança</a></Button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="p-4 border-b"><h2 className="font-semibold">Histórico</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="p-3 font-medium">Data</th>
                  <th className="p-3 font-medium">Tipo</th>
                  <th className="p-3 font-medium">Valor</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Comprovante</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Sem histórico</td></tr>
                ) : history.map(inv => {
                  const s = STATUS[inv.status] ?? STATUS.pending;
                  return (
                    <tr key={inv.id} className="border-t">
                      <td className="p-3">{fmtDate(inv.paid_at ?? inv.created_at)}</td>
                      <td className="p-3">{inv.type === "adhesion" ? "Adesão" : "Mensalidade"}</td>
                      <td className="p-3 font-medium">{fmt(Number(inv.amount))}</td>
                      <td className="p-3"><Badge variant="outline" className={s.cls}>{s.label}{inv.manual ? " (manual)" : ""}</Badge></td>
                      <td className="p-3">{inv.invoice_url ? <a href={inv.invoice_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs">Ver</a> : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
