
-- Meta Marketing integration tables

-- 1. meta_connections: links organization to SiteJob Connect tenant
CREATE TABLE public.meta_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sitejob_tenant_id TEXT NOT NULL,
  webhook_secret_encrypted TEXT NOT NULL,
  connect_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

ALTER TABLE public.meta_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view meta_connections"
  ON public.meta_connections FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "Org members can insert meta_connections"
  ON public.meta_connections FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "Org members can update meta_connections"
  ON public.meta_connections FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "Org members can delete meta_connections"
  ON public.meta_connections FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()));

-- 2. meta_config: stores tokens and asset info (encrypted)
CREATE TABLE public.meta_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  page_id TEXT,
  page_name TEXT,
  page_access_token_encrypted TEXT,
  user_access_token_encrypted TEXT,
  instagram_account_id TEXT,
  instagram_username TEXT,
  ad_account_id TEXT,
  ad_account_name TEXT,
  business_id TEXT,
  token_expires_at TIMESTAMPTZ,
  granted_scopes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

ALTER TABLE public.meta_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view meta_config"
  ON public.meta_config FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "Org members can update meta_config"
  ON public.meta_config FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()));

-- 3. meta_leads: incoming Lead Ads
CREATE TABLE public.meta_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  meta_lead_id TEXT UNIQUE,
  form_id TEXT,
  form_name TEXT,
  ad_id TEXT,
  ad_name TEXT,
  campaign_name TEXT,
  fields JSONB DEFAULT '{}',
  raw_data JSONB,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meta_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view meta_leads"
  ON public.meta_leads FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "Org members can update meta_leads"
  ON public.meta_leads FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()));
