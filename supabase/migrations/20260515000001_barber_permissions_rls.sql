-- Atualizar RLS para permissões de barbeiros

-- Função auxiliar para verificar se usuário é barbeiro
CREATE OR REPLACE FUNCTION public.has_role_or_is_barber(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  ) OR EXISTS (
    SELECT 1 FROM public.barbers
    WHERE user_id = _user_id
  )
$$;

-- Políticas para Barbers verem seus próprios dados
CREATE POLICY "Barbers view own profile" ON public.barbers
  FOR SELECT USING (auth.uid() = user_id);

-- Políticas para Appointments
-- Barbeiros podem ver apenas seus agendamentos
CREATE POLICY "Barbers view own appointments" ON public.appointments
  FOR SELECT USING (
    barber_id IN (SELECT id FROM public.barbers WHERE user_id = auth.uid())
  );

-- Barbeiros podem atualizar apenas seus agendamentos
CREATE POLICY "Barbers update own appointments" ON public.appointments
  FOR UPDATE USING (
    barber_id IN (SELECT id FROM public.barbers WHERE user_id = auth.uid())
  ) WITH CHECK (
    barber_id IN (SELECT id FROM public.barbers WHERE user_id = auth.uid())
  );

-- Políticas para Clients
-- Barbeiros podem ver clientes que já atenderam
CREATE OR REPLACE POLICY "Barbers view served clients" ON public.clients
  FOR SELECT USING (
    owner_id = auth.uid() OR
    id IN (
      SELECT DISTINCT a.client_id
      FROM public.appointments a
      WHERE a.barber_id IN (SELECT id FROM public.barbers WHERE user_id = auth.uid())
      AND a.client_id IS NOT NULL
    )
  );

-- Políticas para Sales
-- Barbeiros podem ver vendas que realizaram
CREATE POLICY "Barbers view own sales" ON public.sales
  FOR SELECT USING (
    barber_id IN (SELECT id FROM public.barbers WHERE user_id = auth.uid())
  );

-- Função para verificar se um usuário é o dono de uma barbearia
CREATE OR REPLACE FUNCTION public.is_barbershop_owner(_user_id UUID, _owner_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id = _owner_id;
$$;

-- Função para obter o dono da barbearia de um barbeiro
CREATE OR REPLACE FUNCTION public.get_barber_owner_id(_barber_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT owner_id FROM public.barbers WHERE id = _barber_id;
$$;

-- Função para calcular comissões totais por período
CREATE OR REPLACE FUNCTION public.get_barber_commissions_by_period(
  p_barber_id uuid,
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS TABLE (
  total_gross numeric,
  total_commission numeric,
  commission_count integer,
  paid_count integer,
  pending_count integer
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(gross_amount), 0::numeric)::numeric as total_gross,
    COALESCE(SUM(commission_amount), 0::numeric)::numeric as total_commission,
    COUNT(*)::integer as commission_count,
    COUNT(CASE WHEN paid = true THEN 1 END)::integer as paid_count,
    COUNT(CASE WHEN paid = false THEN 1 END)::integer as pending_count
  FROM public.commissions_generated
  WHERE barber_id = p_barber_id
    AND created_at >= p_start_date
    AND created_at < p_end_date;
$$;

-- Função para marcar comissões como pagas
CREATE OR REPLACE FUNCTION public.mark_commissions_as_paid(
  p_barber_id uuid,
  p_commission_ids uuid[]
)
RETURNS TABLE (
  id uuid,
  paid boolean,
  paid_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commission_id uuid;
BEGIN
  FOREACH v_commission_id IN ARRAY p_commission_ids
  LOOP
    UPDATE public.commissions_generated
    SET paid = true, paid_at = now()
    WHERE id = v_commission_id
      AND barber_id = p_barber_id;
  END LOOP;

  RETURN QUERY
  SELECT cg.id, cg.paid, cg.paid_at
  FROM public.commissions_generated cg
  WHERE cg.id = ANY(p_commission_ids);
END;
$$;

-- Função para calcular comissão com base em configuração por serviço
CREATE OR REPLACE FUNCTION public.calculate_service_specific_commission(
  p_barber_id uuid,
  p_service_id uuid,
  p_sale_amount numeric
)
RETURNS numeric
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT scc.commission_percent FROM public.service_commission_configs scc
     WHERE scc.barber_id = p_barber_id
     AND scc.service_id = p_service_id
     AND scc.active = true
     LIMIT 1),
    (SELECT b.service_commission_percent FROM public.barbers b
     WHERE b.id = p_barber_id),
    0::numeric
  ) * p_sale_amount / 100;
$$;
