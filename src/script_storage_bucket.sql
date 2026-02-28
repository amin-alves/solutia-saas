-- ==============================================================================
-- 🚀 SCRIPT FASE 3: CRIAÇÃO DO STORAGE DE ARQUIVOS (BUCKET)
-- ==============================================================================
-- Rode este script UMA VEZ no SQL Editor do Supabase para criar o "HD Virtual"

-- 1. Cria o Bucket 'documentos_corporativos'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documentos_corporativos', 
    'documentos_corporativos', 
    false, -- FALSE = Acesso restrito via autenticação
    52428800, -- Limite de 50MB por arquivo
    '{application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png}'
)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 2. (Removido: O Supabase já deixa o RLS habilitado por padrão na tabela de storage)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Política: Usuários logados podem fazer UPLOAD para a pasta da própria empresa
CREATE POLICY "Permitir Upload para pasta da empresa" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
    bucket_id = 'documentos_corporativos' AND
    (storage.foldername(name))[1] = (SELECT empresa_id::text FROM public.perfis WHERE id = auth.uid())
);

-- 4. Política: Usuários logados podem LER arquivos da pasta da própria empresa
CREATE POLICY "Permitir Leitura da pasta da empresa" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (
    bucket_id = 'documentos_corporativos' AND
    (storage.foldername(name))[1] = (SELECT empresa_id::text FROM public.perfis WHERE id = auth.uid())
);

-- 5. Política: Usuários logados podem ATUALIZAR arquivos da pasta da própria empresa
CREATE POLICY "Permitir Update na pasta da empresa" 
ON storage.objects FOR UPDATE
TO authenticated 
USING (
    bucket_id = 'documentos_corporativos' AND
    (storage.foldername(name))[1] = (SELECT empresa_id::text FROM public.perfis WHERE id = auth.uid())
);

-- 6. Política: Usuários logados podem DELETAR arquivos da pasta da própria empresa
CREATE POLICY "Permitir Delete na pasta da empresa" 
ON storage.objects FOR DELETE
TO authenticated 
USING (
    bucket_id = 'documentos_corporativos' AND
    (storage.foldername(name))[1] = (SELECT empresa_id::text FROM public.perfis WHERE id = auth.uid())
);
