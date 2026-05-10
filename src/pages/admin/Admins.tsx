import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Row = { user_id: string; created_at: string };
type Profile = { id: string; full_name: string | null; barbershop_name: string | null };

export default function AdminAdmins() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<Row[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  const load = async () => {
    const [a, p] = await Promise.all([
      supabase.from("user_roles").select("user_id,created_at").eq("role", "admin"),
      supabase.from("profiles").select("id,full_name,barbershop_name"),
    ]);
    setAdmins((a.data ?? []) as Row[]);
    const map: Record<string, Profile> = {};
    (p.data ?? []).forEach((pr: Profile) => { map[pr.id] = pr; });
    setProfiles(map);
  };
  useEffect(() => { load(); }, []);

  const revoke = async (uid: string) => {
    if (uid === user?.id) return toast.error("Você não pode remover a si mesmo");
    const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", "admin");
    if (error) return toast.error(error.message);
    toast.success("Admin removido"); load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Administradores</h1>
        <p className="text-muted-foreground">Usuários com acesso master à plataforma</p>
      </div>
      <Card className="divide-y">
        {admins.length === 0 && <div className="p-12 text-center text-muted-foreground">Nenhum admin cadastrado.</div>}
        {admins.map(a => {
          const pr = profiles[a.user_id];
          return (
            <div key={a.user_id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="font-medium">{pr?.full_name ?? pr?.barbershop_name ?? "Usuário"}</p>
                  <p className="text-xs text-muted-foreground font-mono">{a.user_id}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">desde {new Date(a.created_at).toLocaleDateString("pt-BR")}</span>
                {a.user_id !== user?.id && (
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => revoke(a.user_id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </Card>
      <p className="text-xs text-muted-foreground">
        Para promover um novo admin, atribua a role <code>admin</code> ao usuário em <code>user_roles</code>.
      </p>
    </div>
  );
}
