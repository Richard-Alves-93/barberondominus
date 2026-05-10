import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

type Log = {
  id: string; owner_id: string; actor_email: string | null; action: string;
  entity: string | null; entity_id: string | null; metadata: any; created_at: string;
};
type Profile = { id: string; barbershop_name: string | null };

export default function AdminLogs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const [l, p] = await Promise.all([
        supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("profiles").select("id,barbershop_name"),
      ]);
      setLogs((l.data ?? []) as Log[]);
      const map: Record<string, string> = {};
      (p.data ?? []).forEach((pr: Profile) => { map[pr.id] = pr.barbershop_name ?? "—"; });
      setProfiles(map);
    })();
  }, []);

  const filtered = logs.filter(l => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (profiles[l.owner_id] ?? "").toLowerCase().includes(q) ||
      (l.actor_email ?? "").toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      (l.entity ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Log de Atividades</h1>
          <p className="text-muted-foreground">Ações críticas realizadas pelos administradores das barbearias</p>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8 w-[260px]" placeholder="Buscar por ação, e-mail, tenant..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3 font-medium">Quando</th>
                <th className="p-3 font-medium">Barbearia</th>
                <th className="p-3 font-medium">Quem</th>
                <th className="p-3 font-medium">Ação</th>
                <th className="p-3 font-medium">Entidade</th>
                <th className="p-3 font-medium">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-muted-foreground">Nenhum log encontrado.</td></tr>}
              {filtered.map(l => (
                <tr key={l.id} className="border-t">
                  <td className="p-3 text-muted-foreground whitespace-nowrap">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                  <td className="p-3 font-medium">{profiles[l.owner_id] ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{l.actor_email ?? "—"}</td>
                  <td className="p-3"><Badge variant="outline">{l.action}</Badge></td>
                  <td className="p-3 text-muted-foreground">{l.entity ?? "—"}</td>
                  <td className="p-3 text-xs font-mono text-muted-foreground max-w-[280px] truncate">{l.metadata && Object.keys(l.metadata).length ? JSON.stringify(l.metadata) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
