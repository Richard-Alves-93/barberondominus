
-- Expand profile status & add Asaas fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS adhesion_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS adhesion_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS asaas_customer_id text,
  ADD COLUMN IF NOT EXISTS churned_at timestamptz;

-- Drop and recreate status check (text col, no enum)
-- Allowed: pending, active, overdue, suspended, churned
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_status_check') THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_status_check;
  END IF;
END $$;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('pending','active','overdue','suspended','churned'));

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_adhesion_status_check
  CHECK (adhesion_status IN ('pending','paid','waived'));

-- Audit log
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  entity text,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_owner_idx ON public.audit_logs(owner_id, created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all logs" ON public.audit_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members view own logs" ON public.audit_logs
  FOR SELECT USING (public.is_member_of(auth.uid(), owner_id));

CREATE POLICY "Members insert logs" ON public.audit_logs
  FOR INSERT WITH CHECK (public.is_member_of(auth.uid(), owner_id));
