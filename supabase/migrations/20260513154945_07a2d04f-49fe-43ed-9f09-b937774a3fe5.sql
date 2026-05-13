-- Profiles: add Asaas billing fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS billing_method TEXT DEFAULT 'PIX',
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_monthly_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_monthly_calc_at TIMESTAMPTZ;

-- Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  plan_id UUID,
  asaas_payment_id TEXT UNIQUE,
  asaas_subscription_id TEXT,
  type TEXT NOT NULL CHECK (type IN ('adhesion','monthly')),
  amount NUMERIC NOT NULL DEFAULT 0,
  base_revenue NUMERIC DEFAULT 0,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  billing_type TEXT,
  invoice_url TEXT,
  bank_slip_url TEXT,
  pix_payload TEXT,
  pix_qr_image TEXT,
  paid_at TIMESTAMPTZ,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  manual BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invoices_owner ON public.invoices(owner_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_type ON public.invoices(type);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner views own invoices" ON public.invoices
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Admins view all invoices" ON public.invoices
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update invoices" ON public.invoices
  FOR UPDATE USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_invoices_updated
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Billing logs
CREATE TABLE IF NOT EXISTS public.billing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID,
  invoice_id UUID,
  action TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'outbound',
  success BOOLEAN NOT NULL DEFAULT true,
  http_status INT,
  request JSONB,
  response JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_billing_logs_owner ON public.billing_logs(owner_id);
CREATE INDEX IF NOT EXISTS idx_billing_logs_created ON public.billing_logs(created_at DESC);

ALTER TABLE public.billing_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner views own billing_logs" ON public.billing_logs
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Admins view all billing_logs" ON public.billing_logs
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));