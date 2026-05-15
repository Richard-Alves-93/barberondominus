-- Adicionar limites e informações extras para o Painel Master
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS barber_limit integer NOT NULL DEFAULT 999;

-- Atualizar planos existentes com limites sugeridos
UPDATE public.plans SET barber_limit = 2 WHERE name ILIKE '%Básico%' OR name ILIKE '%Plano A%';
UPDATE public.plans SET barber_limit = 5 WHERE name ILIKE '%Profissional%' OR name ILIKE '%Plano B%';
UPDATE public.plans SET barber_limit = 999 WHERE name ILIKE '%Performance%';

-- Adicionar campos detalhados em profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS billing_mode text DEFAULT 'fixed' CHECK (billing_mode IN ('fixed', 'percent')),
  ADD COLUMN IF NOT EXISTS adhesion_date date DEFAULT CURRENT_DATE;

-- Atualizar adesão com data de criação se for nula
UPDATE public.profiles SET adhesion_date = created_at::date WHERE adhesion_date IS NULL;
