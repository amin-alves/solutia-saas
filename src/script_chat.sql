-- ==============================================================================
-- SCRIPT: Chat em tempo real entre usuários
-- ==============================================================================
-- Rode este script UMA VEZ no SQL Editor do Supabase.

-- 1. Tabela de conversas
CREATE TABLE IF NOT EXISTS public.conversas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome TEXT, -- NULL = DM (conversa 1-a-1)
    tipo TEXT NOT NULL DEFAULT 'dm' CHECK (tipo IN ('dm', 'grupo')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Participantes das conversas
CREATE TABLE IF NOT EXISTS public.conversa_participantes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversa_id UUID NOT NULL REFERENCES public.conversas(id) ON DELETE CASCADE,
    perfil_id UUID NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(conversa_id, perfil_id)
);

-- 3. Mensagens
CREATE TABLE IF NOT EXISTS public.mensagens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversa_id UUID NOT NULL REFERENCES public.conversas(id) ON DELETE CASCADE,
    enviada_por UUID NOT NULL REFERENCES public.perfis(id),
    conteudo TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes para performance
CREATE INDEX IF NOT EXISTS idx_mensagens_conversa ON public.mensagens(conversa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_participantes_perfil ON public.conversa_participantes(perfil_id);
CREATE INDEX IF NOT EXISTS idx_participantes_conversa ON public.conversa_participantes(conversa_id);
CREATE INDEX IF NOT EXISTS idx_conversas_empresa ON public.conversas(empresa_id);

-- ==============================================================================
-- RLS POLICIES
-- ==============================================================================

ALTER TABLE public.conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversa_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;

-- CONVERSAS: só vê conversas da sua empresa e onde é participante
CREATE POLICY "conversas_select" ON public.conversas FOR SELECT USING (
    empresa_id IN (SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid()))
    AND id IN (SELECT conversa_id FROM public.conversa_participantes WHERE perfil_id = (select auth.uid()))
);

CREATE POLICY "conversas_insert" ON public.conversas FOR INSERT WITH CHECK (
    empresa_id IN (SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid()))
);

CREATE POLICY "conversas_update" ON public.conversas FOR UPDATE USING (
    empresa_id IN (SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid()))
    AND id IN (SELECT conversa_id FROM public.conversa_participantes WHERE perfil_id = (select auth.uid()))
);

-- PARTICIPANTES: ver e adicionar nas conversas que participa
CREATE POLICY "participantes_select" ON public.conversa_participantes FOR SELECT USING (
    conversa_id IN (SELECT conversa_id FROM public.conversa_participantes WHERE perfil_id = (select auth.uid()))
);

CREATE POLICY "participantes_insert" ON public.conversa_participantes FOR INSERT WITH CHECK (
    conversa_id IN (
        SELECT id FROM public.conversas WHERE empresa_id IN (
            SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid())
        )
    )
);

CREATE POLICY "participantes_delete" ON public.conversa_participantes FOR DELETE USING (
    perfil_id = (select auth.uid())
);

-- MENSAGENS: ver mensagens das conversas que participa, enviar nas que participa
CREATE POLICY "mensagens_select" ON public.mensagens FOR SELECT USING (
    conversa_id IN (SELECT conversa_id FROM public.conversa_participantes WHERE perfil_id = (select auth.uid()))
);

CREATE POLICY "mensagens_insert" ON public.mensagens FOR INSERT WITH CHECK (
    enviada_por = (select auth.uid())
    AND conversa_id IN (SELECT conversa_id FROM public.conversa_participantes WHERE perfil_id = (select auth.uid()))
);

-- ==============================================================================
-- REALTIME: Habilitar para mensagens (necessário para chat em tempo real)
-- ==============================================================================
-- No Supabase Dashboard: Database > Replication > Selecione a tabela 'mensagens'
-- Ou via SQL:
ALTER PUBLICATION supabase_realtime ADD TABLE public.mensagens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversas;
