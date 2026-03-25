
-- email_inbox: elke verwerkte mail
CREATE TABLE public.email_inbox (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Gmail data
  gmail_id TEXT NOT NULL,
  gmail_thread_id TEXT,
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_email TEXT,
  subject TEXT,
  body_text TEXT,
  body_snippet TEXT,
  gmail_date TIMESTAMPTZ,
  
  -- AI classificatie
  category TEXT NOT NULL DEFAULT 'onbekend',
  confidence REAL,
  ai_summary TEXT,
  ai_action TEXT,
  ai_sentiment TEXT,
  
  -- Koppelingen
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  gmail_label TEXT,
  
  -- Draft antwoord
  draft_gmail_id TEXT,
  draft_status TEXT DEFAULT 'none',
  draft_body TEXT,
  
  -- Meta
  auto_replied BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ DEFAULT now(),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT email_inbox_gmail_id_org_unique UNIQUE (gmail_id, organization_id)
);

CREATE INDEX idx_email_inbox_category ON public.email_inbox(category);
CREATE INDEX idx_email_inbox_company ON public.email_inbox(company_id);
CREATE INDEX idx_email_inbox_draft_status ON public.email_inbox(draft_status);
CREATE INDEX idx_email_inbox_gmail_date ON public.email_inbox(gmail_date DESC);
CREATE INDEX idx_email_inbox_org ON public.email_inbox(organization_id);

-- email_rules: bekende patronen voor snelle matching
CREATE TABLE public.email_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  match_from TEXT[],
  match_subject TEXT[],
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  auto_action TEXT DEFAULT 'reply_needed',
  priority INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_email_rules_org ON public.email_rules(organization_id);

-- RLS
ALTER TABLE public.email_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_rules ENABLE ROW LEVEL SECURITY;

-- email_inbox policies
CREATE POLICY "Users can view email_inbox for their org"
  ON public.email_inbox FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Users can insert email_inbox for their org"
  ON public.email_inbox FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Users can update email_inbox for their org"
  ON public.email_inbox FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- Service role bypass for edge function
CREATE POLICY "Service role full access email_inbox"
  ON public.email_inbox FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- email_rules policies
CREATE POLICY "Users can view email_rules for their org"
  ON public.email_rules FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Users can manage email_rules for their org"
  ON public.email_rules FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Service role full access email_rules"
  ON public.email_rules FOR ALL TO service_role
  USING (true) WITH CHECK (true);
