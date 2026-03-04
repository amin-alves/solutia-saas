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
    empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid()))
);

-- 3. Política: Usuários logados podem INSERIR documentos para a própria empresa
CREATE POLICY "Insercao de documentos para a propria empresa"
ON public.documentos FOR INSERT
TO authenticated
WITH CHECK (
    empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid()))
);

-- 4. Política: Usuários logados podem ATUALIZAR documentos da própria empresa
CREATE POLICY "Atualizacao de documentos da propria empresa"
ON public.documentos FOR UPDATE
TO authenticated
USING (
    empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid()))
);

-- 5. Política: Usuários logados podem DELETAR documentos da própria empresa
CREATE POLICY "Delecao de documentos da propria empresa"
ON public.documentos FOR DELETE
TO authenticated
USING (
    empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid()))
);

-- ==============================================================================
-- 🚀 COMPLEMENTO FASE 6: CORREÇÃO DE PERMISSÕES DA TABELA DE VERSÕES
-- ==============================================================================
-- As regras abaixo permitem que as versões dos documentos também sejam enviadas (Erro 403 / 404 final)

-- 6. Política: Usuários logados podem INSERIR versões de documentos
CREATE POLICY "Insercao de versoes da propria empresa"
ON public.documento_versoes FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.documentos d
        WHERE d.id = documento_id 
        AND d.empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid()))
    )
);

-- 7. Política: Usuários logados podem ATUALIZAR versões de documentos
CREATE POLICY "Atualizacao de versoes da propria empresa"
ON public.documento_versoes FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.documentos d
        WHERE d.id = documento_id 
        AND d.empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid()))
    )
);

-- 8. Política: Usuários logados podem DELETAR versões de documentos
CREATE POLICY "Delecao de versoes da propria empresa"
ON public.documento_versoes FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.documentos d
        WHERE d.id = documento_id 
        AND d.empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid()))
    )
);
