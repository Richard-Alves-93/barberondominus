import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { fmtBRL, ADHESION_LABEL } from "./lib";
import { logActivity } from "@/lib/audit";

type Profile = {
  id: string; barbershop_name: string | null; full_name: string | null;
  plan_id: string | null; status: string;
  adhesion_status: string; adhesion_paid_at: string | null;
  asaas_customer_id: string | null; created_at: string;
};
type Plan = { id: string; name: string; adhesion_fee: number };

export default function AdminAdesoes() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const [p, pl] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("plans").select("id,name,adhesion_fee"),
    ]);
    setProfiles((p.data ?? []) as Profile[]);
    setPlans((pl.data ?? []) as Plan[]);
  };
  useEffect(() => { load(); }, []);

  const planMap = Object.fromEntries(plans.map(p => [p.id, p]));

  const markPaid = async (p: Profile) => {
    setBusy(p.id);
    const { error } = await supabase.from("profiles").update({
      adhesion_status: "paid",
      adhesion_paid_at: new Date().toISOString(),
      status: p.status === "pending" ? "active" : p.status,
    }).eq("id", p.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    await logActivity({ owner_id: p.id, action: "adhesion:paid", entity: "profile", entity_id: p.id });
    toast.success("Adesão confirmada — acesso liberado");
    load();
  };

  const reset = async (p: Profile) => {
    setBusy(p.id);
    const { error } = await supabase.from("profiles")
      .update({ adhesion_status: "pending", adhesion_paid_at: null }).eq("id", p.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    load();
  };

  const pendentes = profiles.filter(p => p.adhesion_status === "pending");
  const pagas = profiles.filter(p => p.adhesion_status === "paid");

  const totalEsperado = pendentes.reduce((s, p) => {
    const pl = p.plan_id ? planMap[p.plan_id] : null;
    return s + (pl ? Number(pl.adhesion_fee) : 0);
  }, 0);
  const totalRecebido = pagas.reduce((s, p) => {
    const pl = p.plan_id ? planMap[p.plan_id] : null;
    return s + (pl ? Number(pl.adhesion_fee) : 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Adesões</h1>
        <p className="text-muted-foreground">Monitore os pagamentos de adesão via Asaas</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/15"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div><div><p className="text-xs text-muted-foreground">Recebido</p><p className="text-2xl font-bold">{fmtBRL(totalRecebido)}</p></div></div></Card>
        <Card className="p-5"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/15"><Clock className="h-5 w-5 text-amber-600" /></div><div><p className="text-xs text-muted-foreground">A receber</p><p className="text-2xl font-bold">{fmtBRL(totalEsperado)}</p></div></div></Card>
        <Card className="p-5"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/15"><RefreshCw className="h-5 w-5 text-blue-600" /></div><div><p className="text-xs text-muted-foreground">Pendentes</p><p className="text-2xl font-bold">{pendentes.length}</p></div></div></Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b"><h2 className="font-semibold">Status das adesões</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3 font-medium">Barbearia</th>
                <th className="p-3 font-medium">Plano</th>
                <th className="p-3 font-medium">Valor</th>
                <th className="p-3 font-medium">Adesão</th>
                <th className="p-3 font-medium">Pago em</th>
                <th className="p-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map(p => {
                const pl = p.plan_id ? planMap[p.plan_id] : null;
                const ad = ADHESION_LABEL[p.adhesion_status] ?? ADHESION_LABEL.pending;
                return (
                  <tr key={p.id} className="border-t">
                    <td className="p-3 font-medium">{p.barbershop_name ?? "—"}<div className="text-xs text-muted-foreground">{p.full_name ?? ""}</div></td>
                    <td className="p-3">{pl?.name ?? "—"}</td>
                    <td className="p-3">{pl ? fmtBRL(Number(pl.adhesion_fee)) : "—"}</td>
                    <td className="p-3"><Badge variant="outline" className={ad.cls}>{ad.label}</Badge></td>
                    <td className="p-3 text-muted-foreground">{p.adhesion_paid_at ? new Date(p.adhesion_paid_at).toLocaleString("pt-BR") : "—"}</td>
                    <td className="p-3 text-right">
                      {p.adhesion_status === "paid"
                        ? <Button size="sm" variant="ghost" disabled={busy === p.id} onClick={() => reset(p)}>Reabrir</Button>
                        : <Button size="sm" disabled={busy === p.id} onClick={() => markPaid(p)}>Confirmar pagamento</Button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="text-xs text-muted-foreground">
        💡 A confirmação automática via webhook do Asaas pode ser conectada à edge function <code>asaas-webhook</code>.
      </p>
    </div>
  );
}
