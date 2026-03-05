-- ==============================================================================
-- SCRIPT: Tabela de Tramitações (Envio/Recebimento de Documentos)
-- ==============================================================================

-- 1. CRIAÇÃO: Tabela tramitacoes
CREATE TABLE IF NOT EXISTS public.tramitacoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    documento_id UUID REFERENCES public.documentos(id) ON DELETE SET NULL,
    remetente_id UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
    destinatario_id UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Pendente',
    observacao TEXT,
    prazo DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. RLS: Apenas usuários da mesma empresa podem ver/criar tramitações
ALTER TABLE public.tramitacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura de tramitacoes por empresa"
ON public.tramitacoes FOR SELECT
TO authenticated
USING (
    empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = (SELECT auth.uid()))
);

CREATE POLICY "Inserir tramitacoes por empresa"
ON public.tramitacoes FOR INSERT
TO authenticated
WITH CHECK (
    empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = (SELECT auth.uid()))
);

CREATE POLICY "Atualizar tramitacoes por empresa"
ON public.tramitacoes FOR UPDATE
TO authenticated
USING (
    empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = (SELECT auth.uid()))
);
