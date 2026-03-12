
-- Internal notes for contacts/leads with author tracking
CREATE TABLE public.contact_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_contact_notes_contact ON public.contact_notes(contact_id);
CREATE INDEX idx_contact_notes_org ON public.contact_notes(organization_id);

-- Auto-update updated_at
CREATE TRIGGER set_contact_notes_updated_at
  BEFORE UPDATE ON public.contact_notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.contact_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notes in their org"
  ON public.contact_notes FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "Users can insert notes in their org"
  ON public.contact_notes FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()) AND user_id = auth.uid());

CREATE POLICY "Users can update own notes"
  ON public.contact_notes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own notes or admins"
  ON public.contact_notes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.user_has_role(organization_id, ARRAY['owner', 'admin']));
