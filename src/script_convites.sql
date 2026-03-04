-- ==============================================================================
-- 🚀 SCRIPT FASE 5: TABELA DE CONVITES REAIS PARA A EQUIPE
-- ==============================================================================

-- 1. Cria a tabela de convites
CREATE TABLE IF NOT EXISTS public.convites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    nome TEXT,
    role TEXT DEFAULT 'Membro',
    status TEXT DEFAULT 'Pendente',
    token UUID DEFAULT gen_random_uuid(),
    enviado_por UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativar RLS para convites
ALTER TABLE public.convites ENABLE ROW LEVEL SECURITY;

-- Política de leitura: administradores/membros podem ler convites da sua empresa
CREATE POLICY "Leitura de convites da empresa" 
ON public.convites FOR SELECT 
TO authenticated 
USING (
    empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid()))
);

-- Política de inserção: membros autenticados podem criar convites para a sua empresa
CREATE POLICY "Insercao de convites na propria empresa" 
ON public.convites FOR INSERT 
TO authenticated 
WITH CHECK (
    empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid()))
);

-- Política de deleção (cancelar convite): membros autenticados podem apagar os convites da sua empresa
CREATE POLICY "Apagar convites da propria empresa" 
ON public.convites FOR DELETE 
TO authenticated 
USING (
    empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid()))
);

-- 2. Atualizar a View ou buscar do Front-End
-- Agora você poderá inserir emails reais (Gmail, Hotmail, etc) nesta tabela e
-- ela será consultada junto com os usuários já cadastrados (perfis).
