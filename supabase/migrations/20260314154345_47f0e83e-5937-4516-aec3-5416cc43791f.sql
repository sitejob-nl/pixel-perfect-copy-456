
-- Create push_subscriptions table
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth_key text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own subscriptions"
  ON public.push_subscriptions FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add missing columns to notification_preferences
ALTER TABLE public.notification_preferences 
  ADD COLUMN IF NOT EXISTS whatsapp_message text DEFAULT 'push',
  ADD COLUMN IF NOT EXISTS deal_stage_change text DEFAULT 'push';

-- Function to check if a user wants push for an event
CREATE OR REPLACE FUNCTION public.user_wants_push(p_user_id uuid, p_org_id uuid, p_event text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_val text;
BEGIN
  EXECUTE format('SELECT %I FROM public.notification_preferences WHERE user_id = $1 AND organization_id = $2', p_event)
    INTO v_val USING p_user_id, p_org_id;
  RETURN COALESCE(v_val, 'push') = 'push';
END;
$$;
