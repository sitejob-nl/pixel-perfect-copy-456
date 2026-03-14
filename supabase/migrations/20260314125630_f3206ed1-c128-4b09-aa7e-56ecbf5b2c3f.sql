
-- Add SiteJob Connect fields to whatsapp_accounts
ALTER TABLE public.whatsapp_accounts
  ADD COLUMN IF NOT EXISTS tenant_id uuid,
  ADD COLUMN IF NOT EXISTS connect_webhook_secret text;

-- Create index for tenant lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_tenant_id ON public.whatsapp_accounts(tenant_id);
