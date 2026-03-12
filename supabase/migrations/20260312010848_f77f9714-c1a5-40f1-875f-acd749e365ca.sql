
-- Knowledge base documents table
CREATE TABLE public.knowledge_base_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'Algemeen',
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  file_type text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_kb_docs_org ON public.knowledge_base_documents(organization_id);
CREATE INDEX idx_kb_docs_category ON public.knowledge_base_documents(organization_id, category);

-- Updated_at trigger
CREATE TRIGGER set_kb_docs_updated_at
  BEFORE UPDATE ON public.knowledge_base_documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.knowledge_base_documents ENABLE ROW LEVEL SECURITY;

-- RLS: org members can do everything
CREATE POLICY "Org member access" ON public.knowledge_base_documents
  FOR ALL TO public
  USING (organization_id IN (SELECT user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT user_organization_ids()));

-- RLS: service role full access
CREATE POLICY "Service role full access" ON public.knowledge_base_documents
  FOR ALL TO public
  USING (auth.role() = 'service_role');

-- Storage bucket for knowledge base files
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('knowledge-base', 'knowledge-base', false, 52428800)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: org members can upload
CREATE POLICY "Org members can upload kb files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'knowledge-base');

-- Storage RLS: org members can read
CREATE POLICY "Org members can read kb files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'knowledge-base');

-- Storage RLS: org members can delete
CREATE POLICY "Org members can delete kb files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'knowledge-base');
