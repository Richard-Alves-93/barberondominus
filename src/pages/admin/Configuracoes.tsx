import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { KeyRound, Webhook, ExternalLink, Save, Info } from "lucide-react";
import { toast } from "sonner";

type Plan = {
  id: string; name: string; adhesion_fee: number; monthly_price: number;
  adhesion_link: string | null; monthly_link: string | null;
};

const WEBHOOK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/asaas-webhook`;

export default function AdminConfiguracoes() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { adhesion_link: string; monthly_link: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("plans").select("id,name,adhesion_fee,monthly_price,adhesion_link,monthly_link")
      .order("monthly_price");
    const list = (data ?? []) as Plan[];
    setPlans(list);
    setDrafts(Object.fromEntries(list.map(p => [p.id, {
      adhesion_link: p.adhesion_link ?? "", monthly_link: p.monthly_link ?? "",
    }])));
  };
  useEffect(() => { load(); }, []);

  const save = async (id: string) => {
    setSaving(id);
    const d = drafts[id];
    const { error } = await supabase.from("plans").update({
      adhesion_link: d.adhesion_link.trim() || null,
      monthly_link: d.monthly_link.trim() || null,
    }).eq("id", id);
    setSaving(null);
    if (error) return toast.error(error.message);
    toast.success("Links atualizados"); load();
  };

  const copy = (s: string) => { navigator.clipboard.writeText(s); toast.success("Copiado"); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações Globais</h1>
        <p className="text-muted-foreground">Chaves do Asaas e links manuais de cobrança</p>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-amber-500" />
          <h2 className="font-semibold">Chaves de integração (variáveis de ambiente)</h2>
        </div>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Por segurança, as chaves nunca aparecem no frontend nem no banco. Elas devem ser cadastradas como
            <strong> Secrets</strong> do projeto e ficam acessíveis apenas pelas Edge Functions (servidor).
          </AlertDescription>
        </Alert>
        <div className="grid gap-3 md:grid-cols-2">
          <SecretCard
            name="ASAAS_API_KEY"
            description="Token de API do Asaas (Sandbox ou Produção). Obtenha em Asaas → Configurações → Integrações."
          />
          <SecretCard
            name="ASAAS_WEBHOOK_TOKEN"
            description="Token usado para validar requisições recebidas do Asaas no webhook. Defina o mesmo valor no painel do Asaas."
          />
          <SecretCard
            name="ASAAS_ENV"
            description='Defina "production" para usar a API real. Em branco ou "sandbox" usa o ambiente de homologação.'
            optional
          />
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Webhook className="h-5 w-5 text-amber-500" />
          <h2 className="font-semibold">Webhook do Asaas</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          No painel do Asaas, em <em>Integrações → Webhooks</em>, cadastre a URL abaixo e o mesmo token salvo em <code>ASAAS_WEBHOOK_TOKEN</code>:
        </p>
        <div className="flex gap-2">
          <Input readOnly value={WEBHOOK_URL} className="font-mono text-xs" />
          <Button variant="outline" onClick={() => copy(WEBHOOK_URL)}>Copiar</Button>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5 text-amber-500" />
          <h2 className="font-semibold">Links de cobrança manuais por plano</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Quando preenchidos, o sistema exibe esses links (ex.: InfinitePay) em vez de gerar uma cobrança automática no Asaas.
        </p>

        <div className="space-y-3">
          {plans.map(p => {
            const d = drafts[p.id] ?? { adhesion_link: "", monthly_link: "" };
            return (
              <Card key={p.id} className="p-4 space-y-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{p.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      Adesão {fmt(p.adhesion_fee)} · Mensalidade {fmt(p.monthly_price)}
                    </p>
                  </div>
                  {(p.adhesion_link || p.monthly_link) && <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30">Manual</Badge>}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label className="text-xs">Link da adesão</Label>
                    <Input placeholder="https://..." value={d.adhesion_link}
                      onChange={e => setDrafts({ ...drafts, [p.id]: { ...d, adhesion_link: e.target.value } })} />
                  </div>
                  <div>
                    <Label className="text-xs">Link da mensalidade</Label>
                    <Input placeholder="https://..." value={d.monthly_link}
                      onChange={e => setDrafts({ ...drafts, [p.id]: { ...d, monthly_link: e.target.value } })} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => save(p.id)} disabled={saving === p.id}>
                    <Save className="h-4 w-4 mr-1" /> Salvar
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function SecretCard({ name, description, optional }: { name: string; description: string; optional?: boolean }) {
  return (
    <div className="border rounded-lg p-3 space-y-1 bg-card">
      <div className="flex items-center gap-2">
        <code className="text-xs px-2 py-0.5 bg-muted rounded">{name}</code>
        {optional && <Badge variant="outline" className="text-[10px]">opcional</Badge>}
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n) || 0);
