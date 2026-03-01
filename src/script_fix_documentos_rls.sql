-- ==============================================================================
-- 🚀 SCRIPT FASE 4: CORREÇÃO DE PERMISSÕES DA TABELA DE DOCUMENTOS
-- ==============================================================================
-- Rode este script no SQL Editor do Supabase para corrigir os erros 403 e falhas no upload

-- 1. Garante que RLS está ativado na tabela documentos
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

-- 2. Política: Usuários logados podem LER documentos da pasta da própria empresa
CREATE POLICY "Leitura de documentos da propria empresa"
ON public.documentos FOR SELECT
TO authenticated
USING (
    empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())
);

-- 3. Política: Usuários logados podem INSERIR documentos para a própria empresa
CREATE POLICY "Insercao de documentos para a propria empresa"
ON public.documentos FOR INSERT
TO authenticated
WITH CHECK (
    empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())
);

-- 4. Política: Usuários logados podem ATUALIZAR documentos da própria empresa
CREATE POLICY "Atualizacao de documentos da propria empresa"
ON public.documentos FOR UPDATE
TO authenticated
USING (
    empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())
);

-- 5. Política: Usuários logados podem DELETAR documentos da própria empresa
CREATE POLICY "Delecao de documentos da propria empresa"
ON public.documentos FOR DELETE
TO authenticated
USING (
    empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())
);
