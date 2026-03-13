
CREATE TABLE public.linkedin_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linkedin_user_id text NOT NULL,
  access_token_encrypted text NOT NULL,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  linkedin_name text,
  linkedin_avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

ALTER TABLE public.linkedin_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own linkedin connection"
  ON public.linkedin_connections FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    AND organization_id IN (SELECT public.user_organization_ids())
  );

CREATE POLICY "Users can delete own linkedin connection"
  ON public.linkedin_connections FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    AND organization_id IN (SELECT public.user_organization_ids())
  );

CREATE POLICY "Service role can manage linkedin connections"
  ON public.linkedin_connections FOR ALL TO service_role
  USING (true) WITH CHECK (true);
