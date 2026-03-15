ALTER TABLE public.organization_modules
  ADD COLUMN IF NOT EXISTS mod_prospecting boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mod_knowledgebase boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mod_ai_assistant boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS mod_reports boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS mod_gmail boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mod_calendar boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mod_bookings boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mod_calls boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mod_email_drafts boolean NOT NULL DEFAULT false;