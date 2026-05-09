// Cria um funcionário: usuário no auth + registro em staff_members.
// Apenas o dono autenticado (auth.uid() = owner_id do payload) pode chamar.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const owner = userData.user;

    const body = await req.json();
    const { email, password, name, permissions } = body;
    if (!email || !password || !name) {
      return new Response(JSON.stringify({ error: "missing fields" }), { status: 400, headers: corsHeaders });
    }

    const admin = createClient(SUPABASE_URL, SERVICE);

    // Verifica se já existe usuário com esse email
    let userId: string | null = null;
    const { data: existing } = await admin.auth.admin.listUsers();
    const found = existing?.users?.find((u) => u.email?.toLowerCase() === String(email).toLowerCase());
    if (found) {
      userId = found.id;
    } else {
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { full_name: name },
      });
      if (cErr || !created.user) {
        return new Response(JSON.stringify({ error: cErr?.message ?? "cannot create user" }), { status: 400, headers: corsHeaders });
      }
      userId = created.user.id;
    }

    const perms = permissions ?? {};
    const { error: insErr } = await admin.from("staff_members").upsert({
      owner_id: owner.id,
      user_id: userId,
      name,
      email,
      active: true,
      can_pdv: perms.can_pdv ?? true,
      can_agenda: perms.can_agenda ?? true,
      can_view_clients: perms.can_view_clients ?? true,
      can_view_services: perms.can_view_services ?? true,
      can_cancel_sales: perms.can_cancel_sales ?? false,
      can_view_reports: perms.can_view_reports ?? false,
      can_manage_stock: perms.can_manage_stock ?? false,
    }, { onConflict: "owner_id,user_id" });

    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ ok: true, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
