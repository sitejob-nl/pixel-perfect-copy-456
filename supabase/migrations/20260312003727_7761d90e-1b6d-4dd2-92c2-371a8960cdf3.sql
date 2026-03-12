
-- Per-user module access overrides
-- NULL = inherit from role defaults, true = explicit grant, false = explicit deny
CREATE TABLE public.member_module_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id, module_key)
);

ALTER TABLE public.member_module_overrides ENABLE ROW LEVEL SECURITY;

-- Org members can view overrides
CREATE POLICY "Org member read access" ON public.member_module_overrides
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT user_organization_ids()));

-- Only owners/admins can manage overrides
CREATE POLICY "Org admins manage overrides" ON public.member_module_overrides
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = member_module_overrides.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
      AND organization_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = member_module_overrides.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
      AND organization_members.is_active = true
    )
  );

CREATE POLICY "Service role full access" ON public.member_module_overrides
  FOR ALL USING (auth.role() = 'service_role');

-- Updated_at trigger
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.member_module_overrides
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
