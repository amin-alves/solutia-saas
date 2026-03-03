-- ==============================================================================
-- 🚀 SCRIPT GED: PASTAS HIERÁRQUICAS + ASSINATURAS ELETRÔNICAS
-- ==============================================================================
-- Rode este script UMA VEZ no SQL Editor do Supabase.

-- ============================
-- 1. TABELA: pastas (árvore hierárquica de pastas)
-- ============================
CREATE TABLE IF NOT EXISTS public.pastas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    pasta_pai_id UUID REFERENCES public.pastas(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.pastas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura de pastas da propria empresa"
ON public.pastas FOR SELECT TO authenticated
USING (empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()));

CREATE POLICY "Insercao de pastas para a propria empresa"
ON public.pastas FOR INSERT TO authenticated
WITH CHECK (empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()));

CREATE POLICY "Atualizacao de pastas da propria empresa"
ON public.pastas FOR UPDATE TO authenticated
USING (empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()));

CREATE POLICY "Delecao de pastas da propria empresa"
ON public.pastas FOR DELETE TO authenticated
USING (empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()));

-- ============================
-- 2. ATUALIZAÇÃO: documentos -> adicionar referência à pasta
-- ============================
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS pasta_id UUID REFERENCES public.pastas(id) ON DELETE SET NULL;
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS tipo_arquivo TEXT DEFAULT 'documento';
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS extensao TEXT;
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS caminho_storage TEXT;

-- ============================
-- 3. TABELA: assinaturas (assinatura eletrônica simples)
-- ============================
CREATE TABLE IF NOT EXISTS public.assinaturas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    documento_id UUID NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
    versao_id UUID REFERENCES public.documento_versoes(id),
    assinante_id UUID REFERENCES public.perfis(id),
    nome_assinante TEXT NOT NULL,
    email_assinante TEXT,
    ip_address TEXT,
    hash_documento TEXT NOT NULL,
    assinatura_imagem TEXT,  -- Base64 do canvas de assinatura
    assinado_em TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura de assinaturas da propria empresa"
ON public.assinaturas FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.documentos d
        WHERE d.id = documento_id
        AND d.empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())
    )
);

CREATE POLICY "Insercao de assinaturas da propria empresa"
ON public.assinaturas FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.documentos d
        WHERE d.id = documento_id
        AND d.empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())
    )
);

-- Pastas padrão para cada empresa existente
DO $$
DECLARE
    emp RECORD;
BEGIN
    FOR emp IN SELECT id FROM public.empresas LOOP
        INSERT INTO public.pastas (empresa_id, nome, pasta_pai_id)
        VALUES
            (emp.id, 'Contratos', NULL),
            (emp.id, 'RH', NULL),
            (emp.id, 'Financeiro', NULL),
            (emp.id, 'Propostas', NULL),
            (emp.id, 'Geral', NULL)
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;
