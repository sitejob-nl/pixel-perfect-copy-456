ALTER TABLE public.organization_api_keys 
  ADD COLUMN IF NOT EXISTS resend_api_key_encrypted text,
  ADD COLUMN IF NOT EXISTS resend_key_set boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS resend_key_hint text,
  ADD COLUMN IF NOT EXISTS resend_key_verified_at timestamptz;