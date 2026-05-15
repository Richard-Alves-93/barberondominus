import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStaffRole } from "@/hooks/useStaffRole";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lock, QrCode, FileText, CreditCard, CheckCircle2, Copy, RefreshCw, Upload, Image as ImageIcon, Clock } from "lucide-react";
import { toast } from "sonner";
import { useLocation, useNavigate } from "react-router-dom";
import { useRef } from "react";

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
  const [receipt, setReceipt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const [pr, pl, inv, rc] = await Promise.all([
      supabase.from("profiles").select("id,adhesion_status,status,plan_id,barbershop_name").eq("id", user.id).single(),
      supabase.from("plans").select("*").eq("active", true).order("monthly_price"),
      supabase.from("invoices").select("*").eq("type", "adhesion").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("adhesion_receipts").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setProfile(pr.data as any);
    setPlans((pl.data ?? []) as any);
    setInvoice((inv.data ?? null) as any);
    setReceipt(rc.data ?? null);
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

  const choosePlanAndPay = async (planId: string, billingType: "PIX" | "BOLETO" | "CREDIT_CARD", billingMode: "fixed" | "percent") => {
    setCreating(planId + billingType);
    const { data, error } = await supabase.functions.invoke("asaas-create-adhesion", {
      body: { planId, billingType, billingMode },
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

        {receipt ? (
          <StatusCard receipt={receipt} onRefresh={load} />
        ) : invoice && invoice.status === "pending" ? (
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
}: { plans: Plan[]; currentPlanId: string | null | undefined; creating: string | null; onPay: (id: string, t: any, mode: "fixed" | "percent") => void }) {
  const [selected, setSelected] = useState<string | null>(currentPlanId ?? null);
  const [mode, setMode] = useState<"fixed" | "percent">("fixed");
  const selectedPlan = plans.find(p => p.id === selected);
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
        <div className="border-t pt-4 space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Modalidade da mensalidade</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <button onClick={() => setMode("fixed")} className={`text-left rounded-lg border-2 p-3 transition ${mode === "fixed" ? "border-primary bg-primary/5" : "border-border"}`}>
                <p className="font-semibold text-sm">Fixa</p>
                <p className="text-xs text-muted-foreground">Paga {fmt(Number(selectedPlan?.monthly_price ?? 0))} todo mês</p>
              </button>
              <button onClick={() => setMode("percent")} className={`text-left rounded-lg border-2 p-3 transition ${mode === "percent" ? "border-primary bg-primary/5" : "border-border"}`}>
                <p className="font-semibold text-sm">Percentual</p>
                <p className="text-xs text-muted-foreground">Paga {Number(selectedPlan?.revenue_percent ?? 0)}% sobre o faturamento do mês</p>
              </button>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Forma de pagamento da adesão</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <PayBtn icon={<QrCode className="h-4 w-4" />} label="Pix" onClick={() => onPay(selected, "PIX", mode)} loading={creating === selected + "PIX"} />
              <PayBtn icon={<FileText className="h-4 w-4" />} label="Boleto" onClick={() => onPay(selected, "BOLETO", mode)} loading={creating === selected + "BOLETO"} />
              <PayBtn icon={<CreditCard className="h-4 w-4" />} label="Cartão" onClick={() => onPay(selected, "CREDIT_CARD", mode)} loading={creating === selected + "CREDIT_CARD"} />
            </div>
            {selectedPlan?.adhesion_link && (
              <p className="text-xs text-muted-foreground mt-2">Este plano usa link de cobrança externo configurado pelo administrador.</p>
            )}
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
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const copy = (s: string) => { navigator.clipboard.writeText(s); toast.success("Copiado"); };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upError } = await supabase.storage.from("adhesion-receipts").upload(path, file);
      if (upError) throw upError;

      const { error: dbError } = await supabase.from("adhesion_receipts").insert({
        owner_id: user.id,
        invoice_id: invoice.id,
        file_path: path,
        status: "pending"
      });
      if (dbError) throw dbError;

      toast.success("Comprovante enviado para validação!");
      onRefresh();
    } catch (err: any) {
      console.error("Upload error:", err);
      if (err.message?.includes("bucket_not_found") || err.message?.includes("Bucket not found")) {
        toast.error("Erro de configuração no servidor. Por favor, contate o suporte.");
      } else {
        toast.error("Erro ao enviar: " + err.message);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-xs text-muted-foreground">Adesão pendente</p>
          <p className="text-3xl font-bold">{fmt(Number(invoice.amount))}</p>
        </div>
      </div>

      {!showUpload ? (
        <>
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

          {invoice.billing_type === "EXTERNAL_LINK" && invoice.invoice_url && (
            <div className="space-y-3">
              <Button asChild className="w-full h-12 text-base font-semibold"><a href={invoice.invoice_url} target="_blank" rel="noreferrer">Abrir link de pagamento</a></Button>
              <p className="text-xs text-muted-foreground text-center">Cobrança gerada via link externo configurado pelo administrador.</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowUpload(true)}><RefreshCw className="h-4 w-4 mr-2" /> Já paguei</Button>
            <Button variant="ghost" onClick={onChangePlan}>Trocar plano</Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">A liberação é automática assim que o Asaas confirmar o pagamento.</p>
        </>
      ) : (
        <div className="space-y-4 pt-2">
          <div className="border-2 border-dashed rounded-xl p-8 text-center space-y-3 bg-muted/20">
            <div className="p-3 bg-primary/10 rounded-full w-fit mx-auto">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Anexar Comprovante</p>
              <p className="text-xs text-muted-foreground mt-1">Imagens ou PDF. Conferência manual em até 24h.</p>
            </div>
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ImageIcon className="h-4 w-4 mr-2" />}
                Selecionar arquivo
              </Button>
              <input type="file" ref={fileRef} className="hidden" accept="image/*,application/pdf" onChange={onUpload} disabled={uploading} />
            </div>
          </div>
          <Button variant="ghost" className="w-full text-xs" onClick={() => setShowUpload(false)}>Voltar para pagamento</Button>
        </div>
      )}
    </Card>
  );
}

function StatusCard({ receipt, onRefresh }: { receipt: any, onRefresh: () => void }) {
  const isPending = receipt.status === "pending";
  const isRejected = receipt.status === "rejected";

  return (
    <Card className="p-8 text-center space-y-4">
      <div className={`p-4 rounded-full w-fit mx-auto ${isPending ? "bg-amber-500/15" : "bg-red-500/15"}`}>
        {isPending ? <Clock className="h-8 w-8 text-amber-600" /> : <Lock className="h-8 w-8 text-red-600" />}
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold">
          {isPending ? "Aguardando conferência" : "Comprovante Recusado"}
        </h2>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          {isPending 
            ? "Já recebemos seu comprovante. Um administrador irá validar o pagamento em breve para liberar seu acesso." 
            : `Não foi possível validar seu pagamento: ${receipt.rejection_reason || "Verifique o arquivo enviado."}`}
        </p>
      </div>
      <div className="pt-4 flex gap-2 justify-center">
        <Button variant="outline" size="sm" onClick={onRefresh}><RefreshCw className="h-4 w-4 mr-2" /> Atualizar status</Button>
        {isRejected && <Button size="sm" onClick={async () => {
          await supabase.from("adhesion_receipts").delete().eq("id", receipt.id);
          onRefresh();
        }}>Tentar novamente</Button>}
      </div>
    </Card>
  );
}
