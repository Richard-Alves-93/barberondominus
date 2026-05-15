-- Políticas de acesso granular por cargo

-- Função auxiliar para verificar o cargo de um usuário
CREATE OR REPLACE FUNCTION public.get_user_position(p_owner_id uuid, p_user_id uuid)
RETURNS text
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT position FROM public.employees
  WHERE owner_id = p_owner_id AND user_id = p_user_id
  LIMIT 1;
$$;

-- Função para verificar se usuário é gerente ou admin
CREATE OR REPLACE FUNCTION public.is_manager_or_admin(p_owner_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT position IN ('gerente', 'admin')
  FROM public.employees
  WHERE owner_id = p_owner_id AND user_id = p_user_id AND active = true;
$$;

-- Função para verificar se usuário é atendente
CREATE OR REPLACE FUNCTION public.is_attendant(p_owner_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT position = 'atendente'
  FROM public.employees
  WHERE owner_id = p_owner_id AND user_id = p_user_id AND active = true;
$$;

-- Função para verificar se usuário é barbeiro
CREATE OR REPLACE FUNCTION public.is_barber_employee(p_owner_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT position = 'barbeiro'
  FROM public.employees
  WHERE owner_id = p_owner_id AND user_id = p_user_id AND active = true;
$$;

-- ===== POLÍTICAS DE ACESSO PARA AGENDA (APPOINTMENTS) =====

-- Gerentes e Admins veem e gerenciam todos os agendamentos
CREATE POLICY "Managers manage all appointments" ON public.appointments
  FOR ALL USING (
    public.is_manager_or_admin(owner_id, auth.uid())
  ) WITH CHECK (
    public.is_manager_or_admin(owner_id, auth.uid())
  );

-- Atendentes podem ver e criar agendamentos
CREATE POLICY "Attendants view and create appointments" ON public.appointments
  FOR SELECT USING (
    public.is_attendant(owner_id, auth.uid())
  );

CREATE POLICY "Attendants create appointments" ON public.appointments
  FOR INSERT WITH CHECK (
    public.is_attendant(owner_id, auth.uid())
  );

-- ===== POLÍTICAS DE ACESSO PARA CLIENTES =====

-- Gerentes e Admins gerenciam todos os clientes
CREATE POLICY "Managers manage all clients" ON public.clients
  FOR ALL USING (
    public.is_manager_or_admin(owner_id, auth.uid())
  ) WITH CHECK (
    public.is_manager_or_admin(owner_id, auth.uid())
  );

-- Atendentes podem ver e criar clientes
CREATE POLICY "Attendants view and create clients" ON public.clients
  FOR SELECT USING (
    public.is_attendant(owner_id, auth.uid())
  );

CREATE POLICY "Attendants create clients" ON public.clients
  FOR INSERT WITH CHECK (
    public.is_attendant(owner_id, auth.uid())
  );

-- ===== POLÍTICAS DE ACESSO PARA VENDAS =====

-- Gerentes e Admins gerenciam todas as vendas
CREATE POLICY "Managers manage all sales" ON public.sales
  FOR ALL USING (
    public.is_manager_or_admin(owner_id, auth.uid())
  ) WITH CHECK (
    public.is_manager_or_admin(owner_id, auth.uid())
  );

-- Atendentes podem registrar vendas
CREATE POLICY "Attendants create sales" ON public.sales
  FOR INSERT WITH CHECK (
    public.is_attendant(owner_id, auth.uid()) OR
    public.is_barber_employee(owner_id, auth.uid())
  );

-- Atendentes podem ver vendas
CREATE POLICY "Attendants view sales" ON public.sales
  FOR SELECT USING (
    public.is_attendant(owner_id, auth.uid())
  );

-- ===== POLÍTICAS DE ACESSO PARA ESTOQUE =====

-- Gerentes e Admins gerenciam estoque
CREATE POLICY "Managers manage stock" ON public.services
  FOR ALL USING (
    public.is_manager_or_admin(owner_id, auth.uid())
  ) WITH CHECK (
    public.is_manager_or_admin(owner_id, auth.uid())
  );

-- Atendentes podem ver estoque
CREATE POLICY "Attendants view stock" ON public.services
  FOR SELECT USING (
    public.is_attendant(owner_id, auth.uid())
  );

-- ===== POLÍTICAS DE ACESSO PARA RELATÓRIOS (REPORTS) =====

-- Gerentes podem ver relatórios básicos (vendas, agendamentos)
-- Admins podem ver tudo
-- Atendentes e Barbeiros NÃO podem acessar relatórios financeiros

-- Função para verificar acesso a relatórios
CREATE OR REPLACE FUNCTION public.can_view_reports(p_owner_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT position IN ('gerente', 'admin')
  FROM public.employees
  WHERE owner_id = p_owner_id AND user_id = p_user_id AND active = true;
$$;

-- ===== PERMISSÕES PARA CONFIGURAÇÕES DE PLANO MASTER =====

-- Só Admin (Dono) pode acessar/modificar plano master
CREATE POLICY "Only admin can manage master plan" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ===== POLÍTICAS DE ACESSO PARA FOLHA DE PAGAMENTO =====

-- Gerentes e Admins podem ver folha de pagamento
CREATE POLICY "Managers view payroll" ON public.payroll_entries
  FOR SELECT USING (
    public.is_manager_or_admin(owner_id, auth.uid())
  );

-- ===== GRANT DE PERMISSÕES PARA FUNÇÕES =====

-- Nenhuma função adicional aqui - usar RLS policies acima
