-- Atualizar tabela barbers com campos de comissão
ALTER TABLE public.barbers
  ADD COLUMN IF NOT EXISTS commission_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS service_commission_percent numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS product_commission_percent numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_barbers_user ON public.barbers(user_id);

-- Tabela de configurações de comissão por serviço
CREATE TABLE IF NOT EXISTS public.service_commission_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  barber_id uuid NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  commission_percent numeric(5,2) NOT NULL CHECK (commission_percent >= 0 AND commission_percent <= 100),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(service_id, barber_id)
);

ALTER TABLE public.service_commission_configs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_service_commission_configs_owner ON public.service_commission_configs(owner_id);
CREATE INDEX IF NOT EXISTS idx_service_commission_configs_barber ON public.service_commission_configs(barber_id);
CREATE INDEX IF NOT EXISTS idx_service_commission_configs_service ON public.service_commission_configs(service_id);

CREATE POLICY "Owners manage service commission configs" ON public.service_commission_configs
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Barbers view own service commission configs" ON public.service_commission_configs
  FOR SELECT USING (barber_id IN (SELECT id FROM public.barbers WHERE user_id = auth.uid()));
CREATE POLICY "Admins view all service commission configs" ON public.service_commission_configs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Tabela de comissões geradas
CREATE TABLE IF NOT EXISTS public.commissions_generated (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  barber_id uuid NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE,
  commission_type text NOT NULL CHECK (commission_type IN ('service', 'product', 'appointment')),
  gross_amount numeric(10,2) NOT NULL,
  commission_percent numeric(5,2) NOT NULL,
  commission_amount numeric(10,2) NOT NULL,
  paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commissions_generated ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_commissions_owner ON public.commissions_generated(owner_id);
CREATE INDEX IF NOT EXISTS idx_commissions_barber ON public.commissions_generated(barber_id);
CREATE INDEX IF NOT EXISTS idx_commissions_created ON public.commissions_generated(created_at);
CREATE INDEX IF NOT EXISTS idx_commissions_paid ON public.commissions_generated(paid);

CREATE POLICY "Owners manage commissions" ON public.commissions_generated
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Barbers view own commissions" ON public.commissions_generated
  FOR SELECT USING (barber_id IN (SELECT id FROM public.barbers WHERE user_id = auth.uid()));
CREATE POLICY "Admins view all commissions" ON public.commissions_generated
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Função para calcular e registrar comissão ao criar venda
CREATE OR REPLACE FUNCTION public.calculate_commission_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_barber_id uuid;
  v_service_commission numeric(5,2);
  v_product_commission numeric(5,2);
  v_commission_amount numeric(10,2);
BEGIN
  -- Se sale não tem barber_id, não calcular comissão
  IF NEW.barber_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_barber_id := NEW.barber_id;

  -- Verificar se barbeiro tem comissão habilitada
  SELECT commission_enabled, service_commission_percent, product_commission_percent
  INTO v_service_commission, v_product_commission, v_service_commission
  FROM public.barbers
  WHERE id = v_barber_id;

  -- Aqui seria necessário verificar se commission_enabled = true
  -- Por enquanto, calcular comissão padrão
  v_commission_amount := (NEW.total * v_service_commission) / 100;

  INSERT INTO public.commissions_generated (
    owner_id,
    barber_id,
    sale_id,
    commission_type,
    gross_amount,
    commission_percent,
    commission_amount,
    notes
  ) VALUES (
    NEW.owner_id,
    v_barber_id,
    NEW.id,
    'service',
    NEW.total,
    v_service_commission,
    v_commission_amount,
    'Comissão gerada automaticamente da venda'
  );

  RETURN NEW;
END;
$$;

-- Trigger para calcular comissão ao criar venda
DROP TRIGGER IF EXISTS trg_calculate_commission_on_sale ON public.sales;
CREATE TRIGGER trg_calculate_commission_on_sale
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_commission_on_sale();

-- Trigger para atualizar updated_at nas tabelas novas
CREATE TRIGGER trg_service_commission_configs_updated_at BEFORE UPDATE ON public.service_commission_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_commissions_generated_updated_at BEFORE UPDATE ON public.commissions_generated
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função para obter comissões pendentes de um barbeiro
CREATE OR REPLACE FUNCTION public.get_barber_pending_commissions(p_barber_id uuid)
RETURNS TABLE (
  total_gross numeric,
  total_commission numeric,
  commission_count integer
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(gross_amount), 0::numeric)::numeric as total_gross,
    COALESCE(SUM(commission_amount), 0::numeric)::numeric as total_commission,
    COUNT(*)::integer as commission_count
  FROM public.commissions_generated
  WHERE barber_id = p_barber_id AND paid = false;
$$;

-- Função para obter resumo de comissões de todos os barbeiros (para donos)
CREATE OR REPLACE FUNCTION public.get_barbershop_commissions_summary(p_owner_id uuid)
RETURNS TABLE (
  barber_id uuid,
  barber_name text,
  total_gross numeric,
  total_commission numeric,
  pending_commission numeric,
  paid_commission numeric,
  commission_count integer
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id,
    b.name,
    COALESCE(SUM(CASE WHEN cg.paid = false THEN cg.gross_amount ELSE 0 END), 0::numeric)::numeric as total_gross,
    COALESCE(SUM(CASE WHEN cg.paid = false THEN cg.commission_amount ELSE 0 END), 0::numeric)::numeric as total_commission,
    COALESCE(SUM(CASE WHEN cg.paid = false THEN cg.commission_amount ELSE 0 END), 0::numeric)::numeric as pending_commission,
    COALESCE(SUM(CASE WHEN cg.paid = true THEN cg.commission_amount ELSE 0 END), 0::numeric)::numeric as paid_commission,
    COUNT(CASE WHEN cg.paid = false THEN 1 END)::integer as commission_count
  FROM public.barbers b
  LEFT JOIN public.commissions_generated cg ON b.id = cg.barber_id
  WHERE b.owner_id = p_owner_id
  GROUP BY b.id, b.name
  ORDER BY b.name;
$$;
