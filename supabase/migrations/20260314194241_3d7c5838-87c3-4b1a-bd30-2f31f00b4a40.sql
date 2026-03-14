-- Google OAuth connections (org-level and user-level)
CREATE TABLE public.google_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_level text NOT NULL CHECK (connection_level IN ('organization', 'user')),
  email text NOT NULL,
  display_name text,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_org_connection UNIQUE (organization_id, connection_level, email)
);

CREATE INDEX idx_google_connections_org ON public.google_connections(organization_id);
CREATE INDEX idx_google_connections_user ON public.google_connections(user_id);

ALTER TABLE public.google_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View org and own connections" ON public.google_connections
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT user_organization_ids())
    AND (
      connection_level = 'organization'
      OR user_id = auth.uid()
    )
  );

CREATE POLICY "Manage connections" ON public.google_connections
  FOR ALL TO authenticated
  USING (
    organization_id IN (SELECT user_organization_ids())
    AND (
      (connection_level = 'organization' AND user_has_role(organization_id, ARRAY['owner', 'admin']))
      OR (connection_level = 'user' AND user_id = auth.uid())
    )
  )
  WITH CHECK (
    organization_id IN (SELECT user_organization_ids())
    AND (
      (connection_level = 'organization' AND user_has_role(organization_id, ARRAY['owner', 'admin']))
      OR (connection_level = 'user' AND user_id = auth.uid())
    )
  );

-- Cached emails for display in CRM
CREATE TABLE public.google_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.google_connections(id) ON DELETE CASCADE,
  gmail_message_id text NOT NULL,
  thread_id text,
  subject text,
  snippet text,
  from_email text,
  from_name text,
  to_emails text[],
  cc_emails text[],
  body_preview text,
  body_html text,
  received_at timestamptz NOT NULL,
  is_read boolean DEFAULT false,
  labels text[],
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_gmail_message UNIQUE (connection_id, gmail_message_id)
);

CREATE INDEX idx_google_emails_org ON public.google_emails(organization_id);
CREATE INDEX idx_google_emails_contact ON public.google_emails(contact_id);
CREATE INDEX idx_google_emails_company ON public.google_emails(company_id);
CREATE INDEX idx_google_emails_received ON public.google_emails(received_at DESC);

ALTER TABLE public.google_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View emails" ON public.google_emails
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT user_organization_ids()));

CREATE POLICY "Manage emails" ON public.google_emails
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT user_organization_ids()));

-- Cached calendar events
CREATE TABLE public.google_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.google_connections(id) ON DELETE CASCADE,
  google_event_id text NOT NULL,
  calendar_id text NOT NULL DEFAULT 'primary',
  summary text,
  description text,
  location text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  all_day boolean DEFAULT false,
  status text DEFAULT 'confirmed',
  attendees jsonb,
  html_link text,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_calendar_event UNIQUE (connection_id, google_event_id)
);

CREATE INDEX idx_google_cal_events_org ON public.google_calendar_events(organization_id);
CREATE INDEX idx_google_cal_events_time ON public.google_calendar_events(start_time);
CREATE INDEX idx_google_cal_events_contact ON public.google_calendar_events(contact_id);

ALTER TABLE public.google_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View calendar events" ON public.google_calendar_events
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT user_organization_ids()));

CREATE POLICY "Manage calendar events" ON public.google_calendar_events
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT user_organization_ids()));

CREATE TRIGGER handle_google_connections_updated_at
  BEFORE UPDATE ON public.google_connections
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_google_cal_events_updated_at
  BEFORE UPDATE ON public.google_calendar_events
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();