-- SQL Script para Atualizar o Banco de Dados para o Editor de Documentos

-- 1. Atualizar a tabela 'documentos' existente (se ela existir) para suportar status e versões
DO $$ 
BEGIN
    IF exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'documentos') THEN
        -- Adicionar coluna 'status' se não existir
        IF NOT exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'documentos' and column_name = 'status') THEN
            ALTER TABLE public.documentos ADD COLUMN status text DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'finalizado'));
        END IF;

        -- Adicionar coluna 'versao_atual' se não existir
        IF NOT exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'documentos' and column_name = 'versao_atual') THEN
            ALTER TABLE public.documentos ADD COLUMN versao_atual integer DEFAULT 1;
        END IF;
    ELSE
        -- Criar a tabela 'documentos' se ela não existir (apenas para garantir)
        CREATE TABLE public.documentos (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            titulo text NOT NULL,
            pasta text,
            tamanho text,
            data text,
            empresa_id text NOT NULL,
            status text DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'finalizado')),
            versao_atual integer DEFAULT 1,
            created_at timestamptz DEFAULT now()
        );
        -- Enable RLS
        ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
        
        -- Drop old policy if exists to avoid conflicts
        DROP POLICY IF EXISTS "Permitir acesso total a documentos autenticados" ON public.documentos;
        DROP POLICY IF EXISTS "Permitir SELECT a documentos" ON public.documentos;
        DROP POLICY IF EXISTS "Permitir INSERT a documentos" ON public.documentos;
        DROP POLICY IF EXISTS "Permitir UPDATE a documentos" ON public.documentos;
        DROP POLICY IF EXISTS "Permitir DELETE a documentos" ON public.documentos;
        
        -- Create explicit policies
        CREATE POLICY "Permitir SELECT a documentos" ON public.documentos FOR SELECT USING (auth.role() = 'authenticated');
        -- Using auth.uid() IS NOT NULL for more reliable auth checks
        CREATE POLICY "Permitir INSERT a documentos" ON public.documentos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
        CREATE POLICY "Permitir UPDATE a documentos" ON public.documentos FOR UPDATE USING (auth.uid() IS NOT NULL);
        CREATE POLICY "Permitir DELETE a documentos" ON public.documentos FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
END $$;


-- 2. Criar a tabela 'document_templates'
CREATE TABLE IF NOT EXISTS public.document_templates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nome text NOT NULL,
    descricao text,
    conteudo_html text NOT NULL,
    empresa_id text NOT NULL, -- Para vincular o template a um tenant específico
    criado_em timestamptz DEFAULT now(),
    atualizado_em timestamptz DEFAULT now()
);

-- Enable RLS for templates
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir acesso total a templates autenticados" ON public.document_templates;
DROP POLICY IF EXISTS "Permitir SELECT a templates" ON public.document_templates;
DROP POLICY IF EXISTS "Permitir INSERT a templates" ON public.document_templates;
DROP POLICY IF EXISTS "Permitir UPDATE a templates" ON public.document_templates;
DROP POLICY IF EXISTS "Permitir DELETE a templates" ON public.document_templates;
CREATE POLICY "Permitir SELECT a templates" ON public.document_templates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir INSERT a templates" ON public.document_templates FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Permitir UPDATE a templates" ON public.document_templates FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir DELETE a templates" ON public.document_templates FOR DELETE USING (auth.role() = 'authenticated');


-- 3. Criar a tabela 'document_versions' (Histórico)
CREATE TABLE IF NOT EXISTS public.document_versions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    documento_id uuid REFERENCES public.documentos(id) ON DELETE CASCADE,
    numero_versao integer NOT NULL,
    caminho_storage text NOT NULL, -- Caminho no storage ex: 'final/doc_id_v1.html'
    comentario_alteracao text,
    criado_por text, -- ID do usuário que fez a versão
    criado_em timestamptz DEFAULT now()
);

-- Enable RLS for versions
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir acesso total a versões autenticadas" ON public.document_versions;
DROP POLICY IF EXISTS "Permitir SELECT a versões" ON public.document_versions;
DROP POLICY IF EXISTS "Permitir INSERT a versões" ON public.document_versions;
DROP POLICY IF EXISTS "Permitir UPDATE a versões" ON public.document_versions;
DROP POLICY IF EXISTS "Permitir DELETE a versões" ON public.document_versions;
CREATE POLICY "Permitir SELECT a versões" ON public.document_versions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir INSERT a versões" ON public.document_versions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Permitir UPDATE a versões" ON public.document_versions FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir DELETE a versões" ON public.document_versions FOR DELETE USING (auth.role() = 'authenticated');


-- 4. Supabase Storage: Garantir que o bucket existe
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documentos-saas', 'documentos-saas', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas explícitas para o Storage do Supabase (storage.objects)
-- Isso resolve o erro "new row violates row-level security policy" no upload!
CREATE POLICY "Permitir SELECT no Storage" ON storage.objects FOR SELECT
USING (bucket_id = 'documentos-saas');

CREATE POLICY "Permitir INSERT no Storage" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documentos-saas');

CREATE POLICY "Permitir UPDATE no Storage" ON storage.objects FOR UPDATE
USING (bucket_id = 'documentos-saas');

CREATE POLICY "Permitir DELETE no Storage" ON storage.objects FOR DELETE
USING (bucket_id = 'documentos-saas');
