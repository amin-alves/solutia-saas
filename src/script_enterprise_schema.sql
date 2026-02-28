-- ==============================================================================
-- 🚀 SCRIPT FASE 2: ENTERPRISE WORKFLOWS, AUDITORIA & VERSIONAMENTO DE ARQUIVOS
-- ==============================================================================
-- IMPORTANTE: Rode este script APENAS UMA VEZ no SQL Editor do seu Supabase.

-- 1. ATUALIZAÇÃO: Tabela de Perfis -> Padroniza nível de acesso e altera o valor default
ALTER TABLE public.perfis ALTER COLUMN role SET DEFAULT 'operador';

-- 2. ATUALIZAÇÃO: Tabela de Documentos -> Prepara a tabela para ser a "Capa" com Soft Delete
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS criado_por UUID REFERENCES public.perfis(id) ON DELETE SET NULL;
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Ativo';

-- 3. CRIAÇÃO: Tabela de Versionamento de Documentos (A Prova de Sobrescrita)
CREATE TABLE IF NOT EXISTS public.documento_versoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    documento_id UUID REFERENCES public.documentos(id) ON DELETE CASCADE,
    versao INTEGER NOT NULL DEFAULT 1,
    url_arquivo TEXT NOT NULL,
    tamanho TEXT NOT NULL,
    enviado_por UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativa RLS para Versões de Documentos (Garante que só a empresa dona acesse as versões)
ALTER TABLE public.documento_versoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura de versoes isolada por empresa" 
ON public.documento_versoes FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.documentos d
        WHERE d.id = documento_id 
        AND d.empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())
    )
);

-- 4. CRIAÇÃO: Tabela de Workflows (Processos Administrativos)
CREATE TABLE IF NOT EXISTS public.workflows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    criado_por UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
    responsavel_atual_id UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
    titulo TEXT NOT NULL,
    descricao TEXT,
    status TEXT NOT NULL DEFAULT 'Aberto', -- Valores sugeridos: Aberto, Em Análise, Devolvido, Concluído
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativa RLS para Workflows
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura de processos isolada por empresa" 
ON public.workflows FOR SELECT 
TO authenticated 
USING (
   empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())
);

-- 5. CRIAÇÃO: Tabela de Histórico (Auditoria) do Workflow (Não pode haver DELETE via sistema)
CREATE TABLE IF NOT EXISTS public.workflow_historico (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
    acao TEXT NOT NULL,
    detalhes TEXT,
    data_acao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativa RLS para Histórico
ALTER TABLE public.workflow_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura de trilha de auditoria por empresa" 
ON public.workflow_historico FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.workflows w
        WHERE w.id = workflow_id 
        AND w.empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())
    )
);

-- 6. DADOS MOCKADOS: Vamos inserir 1 Workflow de teste para a "A.M.I. Engenharia" e "Solutia Tech" usarem no Dashboard
-- Pega o ID das empresas e de algum admin para jogar os dados
DO $$ 
DECLARE
    empresa_ami_id UUID;
    empresa_sol_id UUID;
    perfil_ami_id UUID;
    perfil_sol_id UUID;
    workflow_ami_id UUID := gen_random_uuid();
    workflow_sol_id UUID := gen_random_uuid();
BEGIN
    SELECT id INTO empresa_ami_id FROM public.empresas WHERE nome = 'A.M.I. Engenharia' LIMIT 1;
    SELECT id INTO empresa_sol_id FROM public.empresas WHERE nome = 'Solutia Tech' LIMIT 1;
    
    SELECT id INTO perfil_ami_id FROM public.perfis WHERE empresa_id = empresa_ami_id LIMIT 1;
    SELECT id INTO perfil_sol_id FROM public.perfis WHERE empresa_id = empresa_sol_id LIMIT 1;

    -- Cria o Workflow para A.M.I (se houver perfil)
    IF empresa_ami_id IS NOT NULL AND perfil_ami_id IS NOT NULL THEN
        INSERT INTO public.workflows (id, empresa_id, criado_por, responsavel_atual_id, titulo, descricao, status)
        VALUES (workflow_ami_id, empresa_ami_id, perfil_ami_id, perfil_ami_id, 'Aprovação de Orçamento Saneamento', 'Aguardando validação da diretoria.', 'Em Análise');
        
        -- Insere Histórico de Auditoria correspondente
        INSERT INTO public.workflow_historico (workflow_id, usuario_id, acao, detalhes)
        VALUES (workflow_ami_id, perfil_ami_id, 'CRIOU PROCESSO', 'Processo gerado via painel WEB.');
    END IF;

    -- Cria o Workflow para Solutia Tech (se houver perfil)
    IF empresa_sol_id IS NOT NULL AND perfil_sol_id IS NOT NULL THEN
        INSERT INTO public.workflows (id, empresa_id, criado_por, responsavel_atual_id, titulo, descricao, status)
        VALUES (workflow_sol_id, empresa_sol_id, perfil_sol_id, perfil_sol_id, 'Revisão Código Fonte (SaaS)', 'Analisar repositório corporativo.', 'Aberto');
        
        -- Insere Histórico de Auditoria correspondente
        INSERT INTO public.workflow_historico (workflow_id, usuario_id, acao, detalhes)
        VALUES (workflow_sol_id, perfil_sol_id, 'CRIOU PROCESSO', 'Processo gerado via painel WEB.');
    END IF;
END $$;
