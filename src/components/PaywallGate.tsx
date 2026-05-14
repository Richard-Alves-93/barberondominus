import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStaffRole } from "@/hooks/useStaffRole";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lock, QrCode, FileText, CreditCard, CheckCircle2, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useLocation, useNavigate } from "react-router-dom";

type Profile = { id: string; adhesion_status: string; status: string; plan_id: string | null; barbershop_name: string | null };
type Plan = { id: string; name: string; description: string | null; monthly_price: number; revenue_percent: number; adhesion_fee: number; adhesion_link: string | null };
type Invoice = {
  id: string; type: string; amount: number; status: string; billing_type: string | null;
  invoice_url: string | null; bank_slip_url: string | null; pix_payload: string | null; pix_qr_image: string | null;
  due_date: string | null; created_at: string;
};

const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export default function PaywallGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { isOwner, loading: staffLoading } = useStaffRole();
  const { pathname } = useLocation();
  const nav = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const [pr, pl, inv] = await Promise.all([
      supabase.from("profiles").select("id,adhesion_status,status,plan_id,barbershop_name").eq("id", user.id).single(),
      supabase.from("plans").select("*").eq("active", true).order("monthly_price"),
      supabase.from("invoices").select("*").eq("type", "adhesion").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setProfile(pr.data as any);
    setPlans((pl.data ?? []) as any);
    setInvoice((inv.data ?? null) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  // Realtime: ao receber webhook, atualizar UI
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("paywall-" + user.id)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, load)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "invoices", filter: `owner_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  // Staff e Admin não passam pelo paywall (usam dados do dono)
  if (staffLoading || loading) {
    return <div className="flex-1 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!isOwner) return <>{children}</>;
  if (profile?.adhesion_status === "paid") return <>{children}</>;

  const choosePlanAndPay = async (planId: string, billingType: "PIX" | "BOLETO" | "CREDIT_CARD") => {
    setCreating(planId + billingType);
    const { data, error } = await supabase.functions.invoke("asaas-create-adhesion", {
      body: { planId, billingType },
    });
    setCreating(null);
    if (error || data?.error) {
      const msg = (data?.error || error?.message || "").toString();
      if (msg.includes("ASAAS_API_KEY")) {
        toast.error("Configuração de cobrança pendente. Avise o administrador.");
      } else toast.error(msg || "Falha ao gerar cobrança");
      return;
    }
    toast.success("Cobrança gerada");
    load();
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/15"><Lock className="h-6 w-6 text-amber-600" /></div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Acesso pendente — pagamento de adesão</h1>
            <p className="text-muted-foreground">Libere o painel completo finalizando a adesão da sua barbearia.</p>
          </div>
        </div>

        {invoice && invoice.status === "pending" ? (
          <PendingInvoice invoice={invoice} onRefresh={load} onChangePlan={() => setInvoice(null)} />
        ) : (
          <PlanPicker plans={plans} currentPlanId={profile?.plan_id} creating={creating} onPay={choosePlanAndPay} />
        )}

        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={() => nav("/auth")}>Sair da conta</Button>
        </div>
      </div>
    </div>
  );
}

function PlanPicker({
  plans, currentPlanId, creating, onPay,
}: { plans: Plan[]; currentPlanId: string | null | undefined; creating: string | null; onPay: (id: string, t: any) => void }) {
  const [selected, setSelected] = useState<string | null>(currentPlanId ?? null);
  return (
    <Card className="p-6 space-y-5">
      <h2 className="text-lg font-semibold">Escolha seu plano</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {plans.map(p => {
          const active = selected === p.id;
          return (
            <button key={p.id} onClick={() => setSelected(p.id)} className={`text-left rounded-xl border-2 p-4 transition ${active ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{p.name}</h3>
                {active && <CheckCircle2 className="h-5 w-5 text-primary" />}
              </div>
              {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
              <div className="mt-3 space-y-0.5 text-sm">
                <p className="font-semibold">Adesão: {fmt(Number(p.adhesion_fee))}</p>
                <p className="text-muted-foreground text-xs">Mensalidade: {fmt(Number(p.monthly_price))} ou {Number(p.revenue_percent)}% do faturamento</p>
              </div>
            </button>
          );
        })}
      </div>
      {selected && (
        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-3">Forma de pagamento da adesão</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <PayBtn icon={<QrCode className="h-4 w-4" />} label="Pix" onClick={() => onPay(selected, "PIX")} loading={creating === selected + "PIX"} />
            <PayBtn icon={<FileText className="h-4 w-4" />} label="Boleto" onClick={() => onPay(selected, "BOLETO")} loading={creating === selected + "BOLETO"} />
            <PayBtn icon={<CreditCard className="h-4 w-4" />} label="Cartão" onClick={() => onPay(selected, "CREDIT_CARD")} loading={creating === selected + "CREDIT_CARD"} />
          </div>
        </div>
      )}
    </Card>
  );
}

function PayBtn({ icon, label, onClick, loading }: any) {
  return (
    <Button variant="outline" className="h-12 justify-center gap-2" onClick={onClick} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}<span>{label}</span>
    </Button>
  );
}

function PendingInvoice({ invoice, onRefresh, onChangePlan }: { invoice: Invoice; onRefresh: () => void; onChangePlan: () => void }) {
  const copy = (s: string) => { navigator.clipboard.writeText(s); toast.success("Copiado"); };
  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-xs text-muted-foreground">Adesão pendente</p>
          <p className="text-3xl font-bold">{fmt(Number(invoice.amount))}</p>
        </div>
        <Badge variant="outline" className="bg-amber-500/15 text-amber-700 border-amber-500/30">{invoice.billing_type}</Badge>
      </div>

      {invoice.billing_type === "PIX" && invoice.pix_qr_image && (
        <div className="space-y-3">
          <img src={invoice.pix_qr_image} alt="QR Pix" className="h-56 w-56 mx-auto rounded-lg border" />
          {invoice.pix_payload && (
            <div className="flex gap-2">
              <input readOnly value={invoice.pix_payload} className="flex-1 text-xs px-3 py-2 rounded-md border bg-muted font-mono" />
              <Button variant="outline" size="sm" onClick={() => copy(invoice.pix_payload!)}><Copy className="h-4 w-4" /></Button>
            </div>
          )}
        </div>
      )}

      {invoice.billing_type === "BOLETO" && invoice.bank_slip_url && (
        <Button asChild className="w-full"><a href={invoice.bank_slip_url} target="_blank" rel="noreferrer">Abrir boleto</a></Button>
      )}

      {invoice.billing_type === "CREDIT_CARD" && invoice.invoice_url && (
        <Button asChild className="w-full"><a href={invoice.invoice_url} target="_blank" rel="noreferrer">Pagar com cartão</a></Button>
      )}

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onRefresh}><RefreshCw className="h-4 w-4 mr-2" /> Já paguei</Button>
        <Button variant="ghost" onClick={onChangePlan}>Trocar plano</Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">A liberação é automática assim que o Asaas confirmar o pagamento.</p>
    </Card>
  );
}
