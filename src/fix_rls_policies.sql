-- Corrige conversas
DROP POLICY IF EXISTS "conversas_select" ON public.conversas;
CREATE POLICY "conversas_select" ON public.conversas FOR SELECT USING (
    empresa_id IN (SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid()))
    AND id IN (SELECT conversa_id FROM public.conversa_participantes WHERE perfil_id = (select auth.uid()))
);

DROP POLICY IF EXISTS "conversas_insert" ON public.conversas;
CREATE POLICY "conversas_insert" ON public.conversas FOR INSERT WITH CHECK (
    empresa_id IN (SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid()))
);

DROP POLICY IF EXISTS "conversas_update" ON public.conversas;
CREATE POLICY "conversas_update" ON public.conversas FOR UPDATE USING (
    empresa_id IN (SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid()))
    AND id IN (SELECT conversa_id FROM public.conversa_participantes WHERE perfil_id = (select auth.uid()))
);

-- Corrige participantes de conversas
DROP POLICY IF EXISTS "participantes_select" ON public.conversa_participantes;
CREATE POLICY "participantes_select" ON public.conversa_participantes FOR SELECT USING (
    conversa_id IN (SELECT conversa_id FROM public.conversa_participantes WHERE perfil_id = (select auth.uid()))
);

DROP POLICY IF EXISTS "participantes_insert" ON public.conversa_participantes;
CREATE POLICY "participantes_insert" ON public.conversa_participantes FOR INSERT WITH CHECK (
    conversa_id IN (
        SELECT id FROM public.conversas WHERE empresa_id IN (
            SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid())
        )
    )
);

DROP POLICY IF EXISTS "participantes_delete" ON public.conversa_participantes;
CREATE POLICY "participantes_delete" ON public.conversa_participantes FOR DELETE USING (
    perfil_id = (select auth.uid())
);

-- Corrige mensagens
DROP POLICY IF EXISTS "mensagens_select" ON public.mensagens;
CREATE POLICY "mensagens_select" ON public.mensagens FOR SELECT USING (
    conversa_id IN (SELECT conversa_id FROM public.conversa_participantes WHERE perfil_id = (select auth.uid()))
);

DROP POLICY IF EXISTS "mensagens_insert" ON public.mensagens;
CREATE POLICY "mensagens_insert" ON public.mensagens FOR INSERT WITH CHECK (
    enviada_por = (select auth.uid())
    AND conversa_id IN (SELECT conversa_id FROM public.conversa_participantes WHERE perfil_id = (select auth.uid()))
);

-- Corrige convites
DROP POLICY IF EXISTS "Leitura de convites da empresa" ON public.convites;
CREATE POLICY "Leitura de convites da empresa" 
ON public.convites FOR SELECT 
TO authenticated 
USING (
    empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid()))
);

DROP POLICY IF EXISTS "Insercao de convites na propria empresa" ON public.convites;
CREATE POLICY "Insercao de convites na propria empresa" 
ON public.convites FOR INSERT 
TO authenticated 
WITH CHECK (
    empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid()))
);

DROP POLICY IF EXISTS "Apagar convites da propria empresa" ON public.convites;
CREATE POLICY "Apagar convites da propria empresa" 
ON public.convites FOR DELETE 
TO authenticated 
USING (
    empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid()))
);

-- Corrige workflows
DROP POLICY IF EXISTS "Leitura de processos isolada por empresa" ON public.workflows;
CREATE POLICY "Leitura de processos isolada por empresa" 
ON public.workflows FOR SELECT 
TO authenticated 
USING (
   empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid()))
);

DROP POLICY IF EXISTS "Leitura de trilha de auditoria por empresa" ON public.workflow_historico;
CREATE POLICY "Leitura de trilha de auditoria por empresa" 
ON public.workflow_historico FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.workflows w
        WHERE w.id = workflow_id 
        AND w.empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid()))
    )
);

-- Corrige Documentos e Pastas
DROP POLICY IF EXISTS "Leitura de documentos da propria empresa" ON public.documentos;
CREATE POLICY "Leitura de documentos da propria empresa"
ON public.documentos FOR SELECT
TO authenticated
USING (
    empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid()))
);

DROP POLICY IF EXISTS "Insercao de documentos para a propria empresa" ON public.documentos;
CREATE POLICY "Insercao de documentos para a propria empresa"
ON public.documentos FOR INSERT
TO authenticated
WITH CHECK (
    empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid()))
);

DROP POLICY IF EXISTS "Atualizacao de documentos da propria empresa" ON public.documentos;
CREATE POLICY "Atualizacao de documentos da propria empresa"
ON public.documentos FOR UPDATE
TO authenticated
USING (
    empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid()))
);

DROP POLICY IF EXISTS "Delecao de documentos da propria empresa" ON public.documentos;
CREATE POLICY "Delecao de documentos da propria empresa"
ON public.documentos FOR DELETE
TO authenticated
USING (
    empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid()))
);

DROP POLICY IF EXISTS "Leitura de pastas da propria empresa" ON public.pastas;
CREATE POLICY "Leitura de pastas da propria empresa"
ON public.pastas FOR SELECT TO authenticated
USING (empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid())));

DROP POLICY IF EXISTS "Insercao de pastas para a propria empresa" ON public.pastas;
CREATE POLICY "Insercao de pastas para a propria empresa"
ON public.pastas FOR INSERT TO authenticated
WITH CHECK (empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid())));

DROP POLICY IF EXISTS "Atualizacao de pastas da propria empresa" ON public.pastas;
CREATE POLICY "Atualizacao de pastas da propria empresa"
ON public.pastas FOR UPDATE TO authenticated
USING (empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid())));

DROP POLICY IF EXISTS "Delecao de pastas da propria empresa" ON public.pastas;
CREATE POLICY "Delecao de pastas da propria empresa"
ON public.pastas FOR DELETE TO authenticated
USING (empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid())));

-- Corrige versoes de documentos
DROP POLICY IF EXISTS "Leitura de versoes isolada por empresa" ON public.documento_versoes;
CREATE POLICY "Leitura de versoes isolada por empresa" 
ON public.documento_versoes FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.documentos d
        WHERE d.id = documento_id 
        AND d.empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid()))
    )
);

DROP POLICY IF EXISTS "Insercao de versoes da propria empresa" ON public.documento_versoes;
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

DROP POLICY IF EXISTS "Atualizacao de versoes da propria empresa" ON public.documento_versoes;
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

DROP POLICY IF EXISTS "Delecao de versoes da propria empresa" ON public.documento_versoes;
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

-- Corrige assinaturas
DROP POLICY IF EXISTS "Leitura de assinaturas da propria empresa" ON public.assinaturas;
CREATE POLICY "Leitura de assinaturas da propria empresa"
ON public.assinaturas FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.documentos d
        WHERE d.id = documento_id
        AND d.empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid()))
    )
);

DROP POLICY IF EXISTS "Insercao de assinaturas da propria empresa" ON public.assinaturas;
CREATE POLICY "Insercao de assinaturas da propria empresa"
ON public.assinaturas FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.documentos d
        WHERE d.id = documento_id
        AND d.empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = (select auth.uid()))
    )
);

-- Corrige storage e perfis
DROP POLICY IF EXISTS "Leitura Publica Logos" ON storage.objects;
CREATE POLICY "Leitura Publica Logos"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'logos_empresas');

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

DROP POLICY IF EXISTS "Permitir Upload para pasta da empresa" ON storage.objects;
CREATE POLICY "Permitir Upload para pasta da empresa" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
    bucket_id = 'documentos_corporativos' AND
    (storage.foldername(name))[1] = (SELECT empresa_id::text FROM public.perfis WHERE id = (select auth.uid()))
);

DROP POLICY IF EXISTS "Permitir Leitura da pasta da empresa" ON storage.objects;
CREATE POLICY "Permitir Leitura da pasta da empresa" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (
    bucket_id = 'documentos_corporativos' AND
    (storage.foldername(name))[1] = (SELECT empresa_id::text FROM public.perfis WHERE id = (select auth.uid()))
);

DROP POLICY IF EXISTS "Permitir Update na pasta da empresa" ON storage.objects;
CREATE POLICY "Permitir Update na pasta da empresa" 
ON storage.objects FOR UPDATE
TO authenticated 
USING (
    bucket_id = 'documentos_corporativos' AND
    (storage.foldername(name))[1] = (SELECT empresa_id::text FROM public.perfis WHERE id = (select auth.uid()))
);

DROP POLICY IF EXISTS "Permitir Delete na pasta da empresa" ON storage.objects;
CREATE POLICY "Permitir Delete na pasta da empresa" 
ON storage.objects FOR DELETE
TO authenticated 
USING (
    bucket_id = 'documentos_corporativos' AND
    (storage.foldername(name))[1] = (SELECT empresa_id::text FROM public.perfis WHERE id = (select auth.uid()))
);

DROP POLICY IF EXISTS "Atualizacao do proprio perfil" ON public.perfis;
CREATE POLICY "Atualizacao do proprio perfil"
ON public.perfis FOR UPDATE
TO authenticated
USING (id = (select auth.uid()));

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
