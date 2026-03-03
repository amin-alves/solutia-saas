-- ==============================================================================
-- SCRIPT: Colunas de metadata (auditoria) na tabela documentos
-- ==============================================================================
-- Rode este script UMA VEZ no SQL Editor do Supabase.

-- Rastrear quem alterou e quem deletou
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS atualizado_por UUID REFERENCES public.perfis(id);
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS deletado_por UUID REFERENCES public.perfis(id);
