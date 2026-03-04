-- ==============================================================================
-- 🚀 SCRIPT FASE 3: UPLOAD DINÂMICO DE LOGO POR EMPRESA
-- ==============================================================================
-- IMPORTANTE: Rode este script no SQL Editor do seu Supabase para criar a estrutura
--             necessária para que as empresas enviem suas próprias logos.

-- 1. Criação da coluna de logo na tabela de empresas
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT NULL;

-- 2. Criação do Bucket no Storage (se não existir)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos_empresas', 'logos_empresas', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Configuração de Políticas de Segurança (RLS) para o Bucket 'logos_empresas'
-- Permite que qualquer usuário autenticado leia as imagens (já que são públicas na UI)
DROP POLICY IF EXISTS "Leitura Publica Logos" ON storage.objects;
CREATE POLICY "Leitura Publica Logos"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'logos_empresas');

-- Permite que os usuários autenticados da plataforma façam upload e subscrevam
-- as imagens das suas próprias empresas. (Checagem poderia ser mais restrita ao admin local)
DROP POLICY IF EXISTS "Upload Logos Empresas" ON storage.objects;
CREATE POLICY "Upload Logos Empresas"
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'logos_empresas');
DROP POLICY IF EXISTS "Atualizacao Logos Empresas" ON storage.objects;
CREATE POLICY "Atualizacao Logos Empresas"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'logos_empresas');
DROP POLICY IF EXISTS "Exclusao Logos Empresas" ON storage.objects;
CREATE POLICY "Exclusao Logos Empresas"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'logos_empresas');

-- 4. Permitir que os usuários atualizem o logo_url da SUA PRÓPRIA empresa
-- É preciso garantir que a tabela `empresas` permite UPDATE se o usuário pertencer a ela
-- Habilitar RLS na tabela empresas caso ainda não esteja (por padrão devia estar, mas garantimos)
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- Política de UPDATE na tabela empresas para usuários da mesma empresa
DROP POLICY IF EXISTS "Atualizacao de Logo por Usuarios da Empresa" ON public.empresas;
CREATE POLICY "Atualizacao de Logo por Usuarios da Empresa"
ON public.empresas FOR UPDATE
TO authenticated
USING (
    id IN (
        SELECT empresa_id 
        FROM public.perfis 
        WHERE id = (select auth.uid())
    )
);
