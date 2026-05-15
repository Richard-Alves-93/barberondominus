-- Atualizar enum de roles para incluir novos papéis
ALTER TYPE public.app_role ADD VALUE 'gerente' BEFORE 'admin';
ALTER TYPE public.app_role ADD VALUE 'atendente' BEFORE 'admin';

-- Criar tabela de funcionários com informações detalhadas
CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  position text NOT NULL CHECK (position IN ('admin', 'gerente', 'atendente', 'barbeiro')),
  salary_type text NOT NULL DEFAULT 'fixed' CHECK (salary_type IN ('fixed', 'commission', 'hybrid')),
  base_salary numeric(10,2) NOT NULL DEFAULT 0,
  commission_enabled boolean NOT NULL DEFAULT false,
  service_commission_percent numeric(5,2) NOT NULL DEFAULT 0,
  product_commission_percent numeric(5,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  hire_date date NOT NULL DEFAULT CURRENT_DATE,
  termination_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_employees_owner ON public.employees(owner_id);
CREATE INDEX IF NOT EXISTS idx_employees_user ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_active ON public.employees(active);

CREATE POLICY "Owners manage employees" ON public.employees
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Employees view own info" ON public.employees
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins view all employees" ON public.employees
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Tabela de folha de pagamento / comissões de equipe
CREATE TABLE IF NOT EXISTS public.payroll_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  entry_type text NOT NULL CHECK (entry_type IN ('service', 'product', 'bonus', 'deduction', 'fixed_salary')),
  gross_amount numeric(10,2) NOT NULL,
  commission_percent numeric(5,2) NOT NULL DEFAULT 0,
  commission_amount numeric(10,2) NOT NULL,
  description text,
  paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  payment_method text,
  reference_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_payroll_owner ON public.payroll_entries(owner_id);
CREATE INDEX IF NOT EXISTS idx_payroll_employee ON public.payroll_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_reference_date ON public.payroll_entries(reference_date);
CREATE INDEX IF NOT EXISTS idx_payroll_paid ON public.payroll_entries(paid);

CREATE POLICY "Owners manage payroll" ON public.payroll_entries
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Employees view own payroll" ON public.payroll_entries
  FOR SELECT USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Admins view all payroll" ON public.payroll_entries
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at
CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_payroll_entries_updated_at BEFORE UPDATE ON public.payroll_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função para calcular comissão de funcionário em venda
CREATE OR REPLACE FUNCTION public.calculate_employee_commission_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee record;
  v_commission_percent numeric(5,2);
  v_commission_amount numeric(10,2);
  v_entry_type text;
BEGIN
  -- Se sale não tem barber_id, não calcular comissão
  IF NEW.barber_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar dados do funcionário (via barber_id)
  SELECT e.id, e.commission_enabled, e.service_commission_percent, e.product_commission_percent
  INTO v_employee
  FROM public.employees e
  INNER JOIN public.barbers b ON e.id = b.id
  WHERE b.id = NEW.barber_id;

  -- Se funcionário não existe ou comissão não habilitada, retornar
  IF v_employee IS NULL OR v_employee.commission_enabled = false THEN
    RETURN NEW;
  END IF;

  -- Determinar tipo de entrada
  v_entry_type := 'service';
  v_commission_percent := v_employee.service_commission_percent;

  -- Calcular comissão
  v_commission_amount := (NEW.total * v_commission_percent) / 100;

  -- Inserir entrada de folha
  INSERT INTO public.payroll_entries (
    owner_id,
    employee_id,
    sale_id,
    entry_type,
    gross_amount,
    commission_percent,
    commission_amount,
    description
  ) VALUES (
    NEW.owner_id,
    v_employee.id,
    NEW.id,
    v_entry_type,
    NEW.total,
    v_commission_percent,
    v_commission_amount,
    'Comissão de venda'
  );

  RETURN NEW;
END;
$$;

-- Trigger para calcular comissão ao criar venda
DROP TRIGGER IF EXISTS trg_calculate_employee_commission_on_sale ON public.sales;
CREATE TRIGGER trg_calculate_employee_commission_on_sale
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_employee_commission_on_sale();

-- Função para obter comissões pendentes de um funcionário
CREATE OR REPLACE FUNCTION public.get_employee_pending_payroll(p_employee_id uuid)
RETURNS TABLE (
  total_gross numeric,
  total_commission numeric,
  entry_count integer
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(gross_amount), 0::numeric)::numeric as total_gross,
    COALESCE(SUM(commission_amount), 0::numeric)::numeric as total_commission,
    COUNT(*)::integer as entry_count
  FROM public.payroll_entries
  WHERE employee_id = p_employee_id AND paid = false;
$$;

-- Função para obter resumo de folha de pagamento por período
CREATE OR REPLACE FUNCTION public.get_payroll_summary_by_period(
  p_owner_id uuid,
  p_start_date date,
  p_end_date date,
  p_employee_id uuid DEFAULT NULL
)
RETURNS TABLE (
  employee_id uuid,
  employee_name text,
  position text,
  total_gross numeric,
  total_commission numeric,
  total_service_entries integer,
  total_product_entries integer,
  total_paid_entries integer,
  pending_commission numeric
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id,
    e.name,
    e.position,
    COALESCE(SUM(CASE WHEN pe.reference_date BETWEEN p_start_date AND p_end_date THEN pe.gross_amount ELSE 0 END), 0::numeric)::numeric as total_gross,
    COALESCE(SUM(CASE WHEN pe.reference_date BETWEEN p_start_date AND p_end_date THEN pe.commission_amount ELSE 0 END), 0::numeric)::numeric as total_commission,
    COUNT(CASE WHEN pe.reference_date BETWEEN p_start_date AND p_end_date AND pe.entry_type = 'service' THEN 1 END)::integer as total_service_entries,
    COUNT(CASE WHEN pe.reference_date BETWEEN p_start_date AND p_end_date AND pe.entry_type = 'product' THEN 1 END)::integer as total_product_entries,
    COUNT(CASE WHEN pe.reference_date BETWEEN p_start_date AND p_end_date AND pe.paid = true THEN 1 END)::integer as total_paid_entries,
    COALESCE(SUM(CASE WHEN pe.paid = false THEN pe.commission_amount ELSE 0 END), 0::numeric)::numeric as pending_commission
  FROM public.employees e
  LEFT JOIN public.payroll_entries pe ON e.id = pe.employee_id
  WHERE e.owner_id = p_owner_id
    AND e.active = true
    AND (p_employee_id IS NULL OR e.id = p_employee_id)
  GROUP BY e.id, e.name, e.position
  ORDER BY e.name;
$$;
