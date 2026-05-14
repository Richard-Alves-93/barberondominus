ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS billing_mode text NOT NULL DEFAULT 'fixed'
  CHECK (billing_mode IN ('fixed','percent'));

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS adhesion_link text,
  ADD COLUMN IF NOT EXISTS monthly_link text;