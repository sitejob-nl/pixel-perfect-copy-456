
-- LinkedIn webhook events table for storing incoming webhook notifications
CREATE TABLE public.linkedin_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  notification_id text NOT NULL,
  event_type text NOT NULL,
  resource_type text,
  payload jsonb NOT NULL DEFAULT '{}',
  linkedin_user_id text,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  processed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint for deduplication
CREATE UNIQUE INDEX idx_linkedin_webhook_events_notification_id ON public.linkedin_webhook_events(notification_id);

-- Index for querying by org
CREATE INDEX idx_linkedin_webhook_events_org ON public.linkedin_webhook_events(organization_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.linkedin_webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS: org members can read their own events
CREATE POLICY "Org members can view webhook events"
  ON public.linkedin_webhook_events FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()));

-- Service role inserts (edge function uses service role)
