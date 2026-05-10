import { supabase } from "@/integrations/supabase/client";

export async function logActivity(params: {
  owner_id: string;
  action: string;
  entity?: string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("audit_logs").insert({
    owner_id: params.owner_id,
    actor_id: user?.id ?? null,
    actor_email: user?.email ?? null,
    action: params.action,
    entity: params.entity ?? null,
    entity_id: params.entity_id ?? null,
    metadata: params.metadata ?? {},
  });
}
