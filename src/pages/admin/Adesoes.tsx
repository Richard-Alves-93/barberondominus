import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { fmtBRL, ADHESION_LABEL } from "./lib";
import { logActivity } from "@/lib/audit";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ExternalLink, XCircle, CheckCircle } from "lucide-react";

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
  const [receipts, setReceipts] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<any>(null);
  const [reason, setReason] = useState("");

  const load = async () => {
    const [p, pl, rc] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("plans").select("id,name,adhesion_fee"),
      supabase.from("adhesion_receipts").select("*, profiles(barbershop_name, full_name)").eq("status", "pending").order("created_at", { ascending: false }),
    ]);
    setProfiles((p.data ?? []) as Profile[]);
    setPlans((pl.data ?? []) as Plan[]);
    setReceipts(rc.data ?? []);
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

  const approveReceipt = async (rc: any) => {
    setBusy(rc.id);
    try {
      // 1. Aprovar comprovante
      const { error: rcError } = await supabase.from("adhesion_receipts").update({ status: "approved" }).eq("id", rc.id);
      if (rcError) throw rcError;

      // 2. Marcar perfil como pago
      const { error: prError } = await supabase.from("profiles").update({
        adhesion_status: "paid",
        adhesion_paid_at: new Date().toISOString(),
        status: "active"
      }).eq("id", rc.owner_id);
      if (prError) throw prError;

      toast.success("Comprovante aprovado e acesso liberado!");
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const rejectReceipt = async () => {
    if (!reason.trim()) return toast.error("Informe o motivo");
    setBusy(rejecting.id);
    try {
      const { error } = await supabase.from("adhesion_receipts").update({ 
        status: "rejected",
        rejection_reason: reason
      }).eq("id", rejecting.id);
      if (error) throw error;

      toast.success("Comprovante recusado");
      setRejecting(null);
      setReason("");
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Adesões</h1>
          <p className="text-muted-foreground">Monitore os pagamentos de adesão e valide comprovantes</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-2" /> Atualizar</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/15"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div><div><p className="text-xs text-muted-foreground">Recebido</p><p className="text-2xl font-bold">{fmtBRL(totalRecebido)}</p></div></div></Card>
        <Card className="p-5"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/15"><Clock className="h-5 w-5 text-amber-600" /></div><div><p className="text-xs text-muted-foreground">A receber</p><p className="text-2xl font-bold">{fmtBRL(totalEsperado)}</p></div></div></Card>
        <Card className="p-5"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/15"><RefreshCw className="h-5 w-5 text-blue-600" /></div><div><p className="text-xs text-muted-foreground">Pendentes</p><p className="text-2xl font-bold">{pendentes.length}</p></div></div></Card>
      </div>

      <Tabs defaultValue="status" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="status">Status Geral</TabsTrigger>
          <TabsTrigger value="validar" className="relative">
            Validar Comprovantes
            {receipts.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {receipts.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status">
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
        </TabsContent>

        <TabsContent value="validar">
          <Card className="overflow-hidden">
            <div className="p-4 border-b"><h2 className="font-semibold">Comprovantes pendentes</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="p-3 font-medium">Data Envio</th>
                    <th className="p-3 font-medium">Barbearia</th>
                    <th className="p-3 font-medium">Arquivo</th>
                    <th className="p-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.length === 0 ? (
                    <tr><td colSpan={4} className="p-12 text-center text-muted-foreground">Nenhum comprovante aguardando validação</td></tr>
                  ) : receipts.map(rc => (
                    <tr key={rc.id} className="border-t">
                      <td className="p-3">{new Date(rc.created_at).toLocaleString("pt-BR")}</td>
                      <td className="p-3">
                        <div className="font-medium">{(rc.profiles as any)?.barbershop_name}</div>
                        <div className="text-xs text-muted-foreground">{(rc.profiles as any)?.full_name}</div>
                      </td>
                      <td className="p-3">
                        <Button asChild variant="outline" size="sm">
                          <a href={supabase.storage.from("adhesion-receipts").getPublicUrl(rc.file_path).data.publicUrl} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" /> Ver Comprovante
                          </a>
                        </Button>
                      </td>
                      <td className="p-3 text-right flex justify-end gap-2">
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setRejecting(rc)} disabled={busy === rc.id}>
                          <XCircle className="h-4 w-4 mr-1" /> Recusar
                        </Button>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => approveReceipt(rc)} disabled={busy === rc.id}>
                          <CheckCircle className="h-4 w-4 mr-1" /> Aprovar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Recusar Comprovante</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Informe o motivo da recusa. O usuário verá esta mensagem.</p>
            <Input placeholder="Ex: Valor incorreto, arquivo ilegível..." value={reason} onChange={e => setReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={rejectReceipt} disabled={!reason.trim() || !!busy}>Confirmar Recusa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <p className="text-xs text-muted-foreground">
        💡 A confirmação automática via webhook do Asaas pode ser conectada à edge function <code>asaas-webhook</code>.
      </p>
    </div>
  );
}
