-- Melhorar a função de cálculo de comissão com lógica mais robusta

CREATE OR REPLACE FUNCTION public.calculate_commission_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_barber record;
  v_service_commission_percent numeric(5,2);
  v_commission_amount numeric(10,2);
  v_commission_type text;
BEGIN
  -- Se sale não tem barber_id, não calcular comissão
  IF NEW.barber_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar dados do barbeiro
  SELECT id, owner_id, commission_enabled, service_commission_percent, product_commission_percent
  INTO v_barber
  FROM public.barbers
  WHERE id = NEW.barber_id;

  -- Se barbeiro não existe ou comissão não está habilitada, retornar
  IF v_barber IS NULL OR v_barber.commission_enabled = false THEN
    RETURN NEW;
  END IF;

  -- Determinar tipo de comissão baseado no appointment
  v_commission_type := 'service';
  v_service_commission_percent := v_barber.service_commission_percent;

  -- Se há appointment_id associado à venda, verificar se há configuração específica
  IF NEW.appointment_id IS NOT NULL THEN
    -- Tentar buscar service_id do appointment para checar configuração específica
    DECLARE
      v_service_id uuid;
      v_specific_percent numeric(5,2);
    BEGIN
      SELECT service_id INTO v_service_id
      FROM public.appointments
      WHERE id = NEW.appointment_id;

      -- Buscar configuração específica por serviço
      IF v_service_id IS NOT NULL THEN
        SELECT commission_percent INTO v_specific_percent
        FROM public.service_commission_configs
        WHERE barber_id = NEW.barber_id
          AND service_id = v_service_id
          AND active = true
        LIMIT 1;

        -- Se houver configuração específica, usar ela
        IF v_specific_percent IS NOT NULL THEN
          v_service_commission_percent := v_specific_percent;
        END IF;
      END IF;
    END;
  END IF;

  -- Calcular comissão
  v_commission_amount := (NEW.total * v_service_commission_percent) / 100;

  -- Inserir comissão gerada
  INSERT INTO public.commissions_generated (
    owner_id,
    barber_id,
    sale_id,
    appointment_id,
    commission_type,
    gross_amount,
    commission_percent,
    commission_amount,
    notes
  ) VALUES (
    NEW.owner_id,
    NEW.barber_id,
    NEW.id,
    NEW.appointment_id,
    v_commission_type,
    NEW.total,
    v_service_commission_percent,
    v_commission_amount,
    'Comissão gerada automaticamente da venda'
  );

  RETURN NEW;
END;
$$;

-- Função para criar comissão manualmente (para agendamentos concluídos sem venda)
CREATE OR REPLACE FUNCTION public.create_commission_from_appointment(
  p_appointment_id uuid,
  p_barber_id uuid,
  p_owner_id uuid,
  p_gross_amount numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commission_id uuid;
  v_barber record;
  v_commission_percent numeric(5,2);
  v_service_id uuid;
  v_specific_percent numeric(5,2);
  v_commission_amount numeric(10,2);
BEGIN
  -- Verificar se barbeiro existe e tem comissão habilitada
  SELECT id, commission_enabled, service_commission_percent
  INTO v_barber
  FROM public.barbers
  WHERE id = p_barber_id;

  IF v_barber IS NULL OR v_barber.commission_enabled = false THEN
    RAISE EXCEPTION 'Barbeiro não encontrado ou sem comissão habilitada';
  END IF;

  -- Buscar service_id do appointment
  SELECT service_id INTO v_service_id
  FROM public.appointments
  WHERE id = p_appointment_id;

  v_commission_percent := v_barber.service_commission_percent;

  -- Verificar se há configuração específica por serviço
  IF v_service_id IS NOT NULL THEN
    SELECT commission_percent INTO v_specific_percent
    FROM public.service_commission_configs
    WHERE barber_id = p_barber_id
      AND service_id = v_service_id
      AND active = true
    LIMIT 1;

    IF v_specific_percent IS NOT NULL THEN
      v_commission_percent := v_specific_percent;
    END IF;
  END IF;

  -- Calcular comissão
  v_commission_amount := (p_gross_amount * v_commission_percent) / 100;

  -- Inserir comissão
  INSERT INTO public.commissions_generated (
    id,
    owner_id,
    barber_id,
    appointment_id,
    commission_type,
    gross_amount,
    commission_percent,
    commission_amount,
    notes
  ) VALUES (
    gen_random_uuid(),
    p_owner_id,
    p_barber_id,
    p_appointment_id,
    'appointment',
    p_gross_amount,
    v_commission_percent,
    v_commission_amount,
    'Comissão criada manualmente para agendamento concluído'
  ) RETURNING id INTO v_commission_id;

  RETURN v_commission_id;
END;
$$;

-- Função para listar todas as comissões de um período com detalhes
CREATE OR REPLACE FUNCTION public.get_detailed_commissions(
  p_barber_id uuid,
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  commission_type text,
  gross_amount numeric,
  commission_percent numeric,
  commission_amount numeric,
  paid boolean,
  paid_at timestamptz,
  notes text
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cg.id,
    cg.created_at,
    cg.commission_type,
    cg.gross_amount,
    cg.commission_percent,
    cg.commission_amount,
    cg.paid,
    cg.paid_at,
    cg.notes
  FROM public.commissions_generated cg
  WHERE cg.barber_id = p_barber_id
    AND cg.created_at >= p_start_date
    AND cg.created_at < p_end_date
  ORDER BY cg.created_at DESC;
$$;

-- Função para marcar múltiplas comissões como pagas em uma transação
CREATE OR REPLACE FUNCTION public.mark_multiple_commissions_paid(
  p_commission_ids uuid[],
  p_paid_date timestamptz DEFAULT now()
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
BEGIN
  UPDATE public.commissions_generated
  SET paid = true, paid_at = p_paid_date
  WHERE id = ANY(p_commission_ids);

  RETURN QUERY
  SELECT cg.id, cg.paid, cg.paid_at
  FROM public.commissions_generated cg
  WHERE cg.id = ANY(p_commission_ids);
END;
$$;
