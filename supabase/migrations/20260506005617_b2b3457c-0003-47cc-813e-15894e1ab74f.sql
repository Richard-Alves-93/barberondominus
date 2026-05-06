
-- Plans table
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  billing_type text NOT NULL CHECK (billing_type IN ('fixed','percent')),
  monthly_price numeric(10,2) NOT NULL DEFAULT 0,
  revenue_percent numeric(5,2) NOT NULL DEFAULT 0,
  adhesion_fee numeric(10,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans" ON public.plans
  FOR SELECT USING (active = true OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins insert plans" ON public.plans
  FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins update plans" ON public.plans
  FOR UPDATE USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins delete plans" ON public.plans
  FOR DELETE USING (public.has_role(auth.uid(),'admin'));

-- Profiles: status + plan_id + suspended_at
ALTER TABLE public.profiles
  ADD COLUMN status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  ADD COLUMN plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  ADD COLUMN suspended_at timestamptz;

-- Allow admins to update any profile (status, plan)
CREATE POLICY "Admins update any profile" ON public.profiles
  FOR UPDATE USING (public.has_role(auth.uid(),'admin'));

-- Updated_at trigger reused
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER plans_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default plans
INSERT INTO public.plans (name, description, billing_type, monthly_price, revenue_percent, adhesion_fee) VALUES
  ('Básico', 'Mensalidade fixa para pequenas barbearias', 'fixed', 99.90, 0, 0),
  ('Profissional', 'Mensalidade fixa com recursos completos', 'fixed', 199.90, 0, 0),
  ('Performance', 'Sem mensalidade - paga % sobre faturamento', 'percent', 0, 5.00, 499.00);
