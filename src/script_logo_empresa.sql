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
CREATE POLICY "Leitura Publica Logos"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'logos_empresas');

-- Permite que os usuários autenticados da plataforma façam upload e subscrevam
-- as imagens das suas próprias empresas. (Checagem poderia ser mais restrita ao admin local)
CREATE POLICY "Upload Logos Empresas"
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'logos_empresas');

CREATE POLICY "Atualizacao Logos Empresas"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'logos_empresas');

CREATE POLICY "Exclusao Logos Empresas"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'logos_empresas');
