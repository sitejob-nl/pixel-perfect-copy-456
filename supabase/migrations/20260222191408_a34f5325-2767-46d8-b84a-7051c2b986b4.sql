CREATE TABLE public.ai_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Nieuw gesprek',
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org member access" ON public.ai_chat_sessions
  FOR ALL USING (organization_id IN (SELECT user_organization_ids()));

CREATE POLICY "Service role full access" ON public.ai_chat_sessions
  FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.ai_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();