
-- Tabela para comprovantes de adesão manuais
CREATE TABLE IF NOT EXISTS public.adhesion_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    file_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.adhesion_receipts ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Donos podem ver seus próprios comprovantes"
ON public.adhesion_receipts FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "Donos podem inserir seus próprios comprovantes"
ON public.adhesion_receipts FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Admins podem ver todos os comprovantes"
ON public.adhesion_receipts FOR SELECT
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'MASTER'));

CREATE POLICY "Admins podem atualizar status dos comprovantes"
ON public.adhesion_receipts FOR UPDATE
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'MASTER'));

-- Trigger para updated_at
CREATE TRIGGER trg_adhesion_receipts_updated_at
BEFORE UPDATE ON public.adhesion_receipts
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Configuração do Storage (Bucket)
-- Nota: Isso geralmente é feito via Dashboard ou API do Storage, mas podemos tentar criar a política se o bucket for criado manualmente.
-- Para fins de automação, assumimos que o bucket 'adhesion-receipts' deve ser criado.

INSERT INTO storage.buckets (id, name, public) 
VALUES ('adhesion-receipts', 'adhesion-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage
CREATE POLICY "Donos podem fazer upload de seus comprovantes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'adhesion-receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Todos podem ler comprovantes (links públicos)"
ON storage.objects FOR SELECT
USING (bucket_id = 'adhesion-receipts');

CREATE POLICY "Admins podem gerenciar todos os objetos no bucket de adesão"
ON storage.objects FOR ALL
USING (bucket_id = 'adhesion-receipts' AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'MASTER'));
