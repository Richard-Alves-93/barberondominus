import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/Logo";
import { Shield, Users, Building2, LogOut } from "lucide-react";
import { toast } from "sonner";

type Profile = {
  id: string;
  full_name: string | null;
  barbershop_name: string | null;
  plan: string | null;
  created_at: string;
};

const Admin = () => {
  const { signOut, user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else setProfiles(data ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b bg-card">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Logo />
            <Badge variant="secondary" className="gap-1">
              <Shield className="h-3 w-3" /> Admin Master
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Painel Administrativo</h1>
          <p className="text-muted-foreground">Gestão global da plataforma Barber On</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Building2 className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Barbearias</p>
                <p className="text-2xl font-bold">{profiles.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10"><Users className="h-5 w-5 text-accent" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Planos ativos</p>
                <p className="text-2xl font-bold">{profiles.filter(p => p.plan).length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Shield className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Sem plano</p>
                <p className="text-2xl font-bold">{profiles.filter(p => !p.plan).length}</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Barbearias cadastradas</h2>
          </div>
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">Carregando…</div>
          ) : profiles.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">Nenhuma barbearia cadastrada ainda.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="p-3 font-medium">Barbearia</th>
                    <th className="p-3 font-medium">Responsável</th>
                    <th className="p-3 font-medium">Plano</th>
                    <th className="p-3 font-medium">Cadastro</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map(p => (
                    <tr key={p.id} className="border-t">
                      <td className="p-3 font-medium">{p.barbershop_name ?? "—"}</td>
                      <td className="p-3 text-muted-foreground">{p.full_name ?? "—"}</td>
                      <td className="p-3">
                        {p.plan ? <Badge>{p.plan}</Badge> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};

export default Admin;
