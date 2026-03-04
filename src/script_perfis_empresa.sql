-- ==============================================================================
-- 🚀 SCRIPT FASE 4: NOVOS CAMPOS NO PERFIL E EMPRESA (Edição Dinâmica)
-- ==============================================================================

-- 1. ADICIONAR COLUNAS NAS TABELAS
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS cnpj TEXT DEFAULT NULL;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS cargo TEXT DEFAULT NULL;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS cpf TEXT DEFAULT NULL;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS registro_profissional TEXT DEFAULT NULL;

-- 2. HABILITAR RLS NA TABELA DE PERFIS PARA UPDATE (Caso não exista)
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- 3. CRIAR POLÍTICA DE UPDATE PARA O PRÓPRIO USUÁRIO (PERFIS)
DROP POLICY IF EXISTS "Atualizacao do proprio perfil" ON public.perfis;
CREATE POLICY "Atualizacao do proprio perfil"
ON public.perfis FOR UPDATE
TO authenticated
USING (id = (select auth.uid()));

-- NOTA: A política para os usuários editarem a tabela `empresas` já foi criada no
--       script anterior ("Atualizacao de Logo por Usuarios da Empresa"). Ela serve
--       igualmente para atualizar agora o nome e o cnpj da empresa.
