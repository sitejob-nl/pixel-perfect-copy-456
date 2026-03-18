
-- entity_attachments table
CREATE TABLE IF NOT EXISTS public.entity_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_entity_attachments_entity ON public.entity_attachments(entity_type, entity_id);

ALTER TABLE public.entity_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read attachments"
  ON public.entity_attachments FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Org members can insert attachments"
  ON public.entity_attachments FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Org members can delete attachments"
  ON public.entity_attachments FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('entity-attachments', 'entity-attachments', false) ON CONFLICT DO NOTHING;

CREATE POLICY "Auth users can upload entity attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'entity-attachments');

CREATE POLICY "Auth users can read entity attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'entity-attachments');

CREATE POLICY "Auth users can delete entity attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'entity-attachments');
