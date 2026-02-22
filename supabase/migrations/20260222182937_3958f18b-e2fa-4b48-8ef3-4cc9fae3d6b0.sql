-- ============================================================================
-- SITEJOB ERP v2 — COMPLEET NIEUW SCHEMA
-- Multi-tenant CRM/ERP met Data Intelligence Pipeline
-- ============================================================================

-- Profiles uitbreiding op auth.users
CREATE TABLE public.profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       text,
  avatar_url      text,
  phone           text,
  timezone        text DEFAULT 'Europe/Amsterdam',
  language        text DEFAULT 'nl',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Tenants / organisaties
CREATE TABLE public.organizations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  slug            text NOT NULL UNIQUE,
  logo_url        text,
  website         text,
  email           text,
  phone           text,
  address_line1   text,
  address_line2   text,
  city            text,
  postal_code     text,
  country         text DEFAULT 'NL',
  kvk_number      text,
  vat_number      text,
  iban            text,
  default_currency    text DEFAULT 'EUR',
  default_vat_rate    numeric(5,2) DEFAULT 21.00,
  invoice_prefix      text DEFAULT 'INV',
  quote_prefix        text DEFAULT 'OFF',
  project_prefix      text DEFAULT 'PRJ',
  fiscal_year_start   integer DEFAULT 1,
  plan                text DEFAULT 'starter' CHECK (plan IN ('starter', 'professional', 'enterprise')),
  max_users           integer DEFAULT 5,
  max_contacts        integer DEFAULT 1000,
  primary_color       text DEFAULT '#2563EB',
  secondary_color     text DEFAULT '#1E40AF',
  font_family         text DEFAULT 'Inter',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Leden per organisatie
CREATE TABLE public.organization_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role            text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer', 'intern')),
  is_active       boolean DEFAULT true,
  invited_at      timestamptz,
  joined_at       timestamptz DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_org_member UNIQUE (organization_id, user_id)
);

-- Uitnodigingen
CREATE TABLE public.organization_invites (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email           text NOT NULL,
  role            text NOT NULL DEFAULT 'member',
  invited_by      uuid NOT NULL REFERENCES public.profiles(id),
  token           text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex') UNIQUE,
  accepted_at     timestamptz,
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Bedrijven
CREATE TABLE public.companies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  website         text,
  phone           text,
  email           text,
  industry        text,
  company_size    text,
  annual_revenue  text,
  address_line1   text,
  address_line2   text,
  city            text,
  postal_code     text,
  country         text DEFAULT 'NL',
  kvk_number      text,
  linkedin_url    text,
  notes           text,
  google_place_id     text,
  google_rating       numeric(2,1),
  google_review_count integer,
  latitude            numeric(10,7),
  longitude           numeric(10,7),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Contactpersonen
CREATE TABLE public.contacts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id      uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  first_name      text NOT NULL,
  last_name       text,
  email           text,
  phone           text,
  mobile          text,
  job_title       text,
  linkedin_url    text,
  avatar_url      text,
  lifecycle_stage text NOT NULL DEFAULT 'lead' CHECK (lifecycle_stage IN (
                    'subscriber', 'lead', 'qualified', 'opportunity', 'customer', 'churned'
                  )),
  lead_status     text DEFAULT 'new' CHECK (lead_status IN (
                    'new', 'contacted', 'interested', 'proposal_sent', 'negotiation', 'won', 'lost', 'unqualified'
                  )),
  source          text,
  temperature     text DEFAULT 'warm' CHECK (temperature IN ('cold', 'warm', 'hot')),
  lead_score      integer DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  score_tier      text GENERATED ALWAYS AS (
                    CASE
                      WHEN lead_score >= 70 THEN 'hot'
                      WHEN lead_score >= 40 THEN 'warm'
                      ELSE 'cold'
                    END
                  ) STORED,
  assigned_to     uuid REFERENCES public.profiles(id),
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  email_opt_out   boolean DEFAULT false,
  whatsapp_opt_in boolean DEFAULT false,
  unsubscribe_token uuid DEFAULT gen_random_uuid(),
  last_activity_at    timestamptz,
  last_contacted_at   timestamptz,
  next_follow_up_at   timestamptz,
  customer_since      date,
  data_source_id      uuid,
  enrichment_status   text DEFAULT 'none' CHECK (enrichment_status IN ('none', 'pending', 'partial', 'complete')),
  tags            text[] DEFAULT '{}',
  custom_fields   jsonb DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Pipeline stages
CREATE TABLE public.pipeline_stages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  color           text DEFAULT '#3B82F6',
  sort_order      integer NOT NULL DEFAULT 0,
  is_won          boolean DEFAULT false,
  is_lost         boolean DEFAULT false,
  probability     integer DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Deals
CREATE TABLE public.deals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id      uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id      uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  stage_id        uuid NOT NULL REFERENCES public.pipeline_stages(id),
  assigned_to     uuid REFERENCES public.profiles(id),
  title           text NOT NULL,
  description     text,
  value           numeric(12,2),
  currency        text DEFAULT 'EUR',
  probability     integer,
  expected_close  date,
  closed_at       timestamptz,
  lost_reason     text,
  project_id      uuid,
  quote_id        uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Activiteiten
CREATE TABLE public.activities (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES public.profiles(id),
  contact_id      uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  company_id      uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  deal_id         uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  project_id      uuid,
  activity_type   text NOT NULL CHECK (activity_type IN (
                    'call', 'email', 'meeting', 'note', 'task', 'demo', 'proposal', 'follow_up', 'whatsapp'
                  )),
  subject         text NOT NULL,
  description     text,
  outcome         text,
  status          text DEFAULT 'completed' CHECK (status IN ('completed', 'scheduled', 'cancelled', 'in_progress')),
  priority        text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  scheduled_at    timestamptz,
  completed_at    timestamptz,
  duration_minutes integer,
  metadata        jsonb DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Tags
CREATE TABLE public.tags (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  color           text DEFAULT '#6B7280',
  entity_type     text NOT NULL CHECK (entity_type IN ('contact', 'company', 'deal', 'project')),
  CONSTRAINT uq_tag_name UNIQUE (organization_id, name, entity_type)
);

-- Custom field definitions
CREATE TABLE public.custom_field_definitions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type     text NOT NULL CHECK (entity_type IN ('contact', 'company', 'deal', 'project', 'invoice')),
  field_name      text NOT NULL,
  field_label     text NOT NULL,
  field_type      text NOT NULL CHECK (field_type IN (
                    'text', 'number', 'date', 'boolean', 'select', 'multiselect', 'textarea', 'url', 'email', 'phone', 'currency'
                  )),
  options         jsonb DEFAULT '[]'::jsonb,
  is_required     boolean DEFAULT false,
  is_active       boolean DEFAULT true,
  sort_order      integer DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_custom_field UNIQUE (organization_id, entity_type, field_name)
);

-- Projecten
CREATE TABLE public.projects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id      uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id      uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  deal_id         uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  project_number  text NOT NULL,
  name            text NOT NULL,
  description     text,
  service_type    text,
  status          text NOT NULL DEFAULT 'intake' CHECK (status IN (
                    'intake', 'quoted', 'accepted', 'in_progress', 'review',
                    'delivered', 'completed', 'on_hold', 'cancelled'
                  )),
  priority        text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  estimated_value numeric(12,2),
  actual_value    numeric(12,2),
  budget_range    text,
  start_date      date,
  end_date        date,
  deadline        date,
  preview_url     text,
  notes           text,
  primary_color   text,
  logo_url        text,
  assigned_to     uuid REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Offertes
CREATE TABLE public.quotes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id      uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  project_id      uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  deal_id         uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  quote_number    text NOT NULL,
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'expired')),
  valid_until     date,
  subtotal        numeric(12,2) DEFAULT 0,
  vat_rate        numeric(5,2) DEFAULT 21.00,
  vat_amount      numeric(12,2) DEFAULT 0,
  total_amount    numeric(12,2) DEFAULT 0,
  discount_amount numeric(12,2) DEFAULT 0,
  discount_type   text CHECK (discount_type IN ('percentage', 'fixed')),
  payment_type    text DEFAULT 'one_time' CHECK (payment_type IN ('one_time', 'monthly', 'milestone')),
  payment_terms   text,
  notes           text,
  signature_url   text,
  signed_by       text,
  signed_at       timestamptz,
  visible_in_portal boolean DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_quote_number UNIQUE (organization_id, quote_number)
);

-- Offerte regels
CREATE TABLE public.quote_lines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id        uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  description     text NOT NULL,
  quantity        numeric(10,2) NOT NULL DEFAULT 1,
  unit_price      numeric(12,2) NOT NULL DEFAULT 0,
  vat_rate        numeric(5,2) DEFAULT 21.00,
  line_total      numeric(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  sort_order      integer DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Facturen
CREATE TABLE public.invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id      uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  project_id      uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  quote_id        uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  invoice_number  text NOT NULL,
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'credited')),
  customer_name   text,
  customer_email  text,
  customer_address text,
  customer_kvk    text,
  customer_vat    text,
  subtotal        numeric(12,2) DEFAULT 0,
  vat_rate        numeric(5,2) DEFAULT 21.00,
  vat_amount      numeric(12,2) DEFAULT 0,
  total_amount    numeric(12,2) DEFAULT 0,
  payment_type    text DEFAULT 'one_time' CHECK (payment_type IN ('one_time', 'subscription', 'milestone')),
  due_date        date,
  paid_at         timestamptz,
  payment_method  text,
  payment_reference text,
  notes           text,
  visible_in_portal boolean DEFAULT true,
  accounting_id   text,
  accounting_synced_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_invoice_number UNIQUE (organization_id, invoice_number)
);

-- Factuurregels
CREATE TABLE public.invoice_lines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description     text NOT NULL,
  quantity        numeric(10,2) NOT NULL DEFAULT 1,
  unit_price      numeric(12,2) NOT NULL DEFAULT 0,
  vat_rate        numeric(5,2) DEFAULT 21.00,
  line_total      numeric(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  vat_amount      numeric(12,2) GENERATED ALWAYS AS (quantity * unit_price * vat_rate / 100) STORED,
  sort_order      integer DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Subscriptions
CREATE TABLE public.subscriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id      uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contact_id      uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  name            text NOT NULL,
  description     text,
  monthly_amount  numeric(12,2) NOT NULL,
  currency        text DEFAULT 'EUR',
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'past_due')),
  start_date      date NOT NULL,
  end_date        date,
  min_term_months integer DEFAULT 3,
  payment_day     integer DEFAULT 1,
  stripe_subscription_id text,
  stripe_customer_id     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Project bestanden
CREATE TABLE public.project_files (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id      uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  uploaded_by     uuid REFERENCES public.profiles(id),
  file_name       text NOT NULL,
  file_url        text NOT NULL,
  file_type       text,
  file_size       bigint,
  category        text DEFAULT 'general' CHECK (category IN (
                    'general', 'contract', 'invoice', 'design', 'branding', 'content', 'delivery'
                  )),
  description     text,
  visible_in_portal boolean DEFAULT false,
  uploaded_by_client boolean DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Data sources
CREATE TABLE public.data_sources (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  is_active       boolean DEFAULT true,
  provider        text NOT NULL CHECK (provider IN ('apify', 'firecrawl', 'csv', 'api', 'manual', 'mcp')),
  provider_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  target_industries text[] DEFAULT '{}',
  target_regions    text[] DEFAULT '{}',
  target_criteria   jsonb DEFAULT '{}'::jsonb,
  schedule_cron     text,
  schedule_active   boolean DEFAULT false,
  last_run_at       timestamptz,
  next_run_at       timestamptz,
  total_runs          integer DEFAULT 0,
  total_leads_found   integer DEFAULT 0,
  total_leads_imported integer DEFAULT 0,
  avg_cost_per_run    numeric(10,4) DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- FK on contacts for data_source
ALTER TABLE public.contacts
  ADD CONSTRAINT fk_contacts_data_source
  FOREIGN KEY (data_source_id) REFERENCES public.data_sources(id) ON DELETE SET NULL;

-- Scrape runs
CREATE TABLE public.scrape_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  data_source_id  uuid NOT NULL REFERENCES public.data_sources(id) ON DELETE CASCADE,
  triggered_by    uuid REFERENCES public.profiles(id),
  provider_run_id     text,
  provider_dataset_id text,
  trigger_type    text NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('scheduled', 'manual', 'ai_agent', 'webhook', 'mcp')),
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN (
                    'pending', 'running', 'processing', 'completed', 'failed', 'cancelled'
                  )),
  started_at      timestamptz,
  completed_at    timestamptz,
  error_message   text,
  raw_results_count   integer DEFAULT 0,
  after_dedup_count   integer DEFAULT 0,
  new_contacts_count  integer DEFAULT 0,
  enriched_count      integer DEFAULT 0,
  high_score_count    integer DEFAULT 0,
  cost_credits    numeric(10,4) DEFAULT 0,
  cost_euros      numeric(10,4) DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Raw leads buffer
CREATE TABLE public.raw_leads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scrape_run_id   uuid NOT NULL REFERENCES public.scrape_runs(id) ON DELETE CASCADE,
  data_source_id  uuid NOT NULL REFERENCES public.data_sources(id),
  raw_data        jsonb NOT NULL DEFAULT '{}'::jsonb,
  company_name    text,
  contact_name    text,
  email           text,
  phone           text,
  website         text,
  address         text,
  city            text,
  postal_code     text,
  industry        text,
  google_place_id     text,
  google_rating       numeric(2,1),
  google_review_count integer,
  google_categories   text[] DEFAULT '{}',
  latitude            numeric(10,7),
  longitude           numeric(10,7),
  processing_status text NOT NULL DEFAULT 'new' CHECK (processing_status IN (
                      'new', 'deduped', 'enriched', 'scored', 'imported', 'skipped', 'failed'
                    )),
  processing_error  text,
  duplicate_of_contact_id uuid REFERENCES public.contacts(id),
  duplicate_match_type    text CHECK (duplicate_match_type IN ('kvk', 'domain', 'phone', 'name_postal')),
  imported_as_contact_id  uuid REFERENCES public.contacts(id),
  lead_score              integer,
  kvk_number      text,
  expires_at      timestamptz DEFAULT (now() + interval '90 days'),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Lead enrichment
CREATE TABLE public.lead_enrichment (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id      uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  sources         text[] DEFAULT '{}',
  google_place_id     text,
  google_rating       numeric(2,1),
  google_review_count integer,
  google_categories   text[] DEFAULT '{}',
  google_maps_url     text,
  decision_makers     jsonb DEFAULT '[]'::jsonb,
  company_size        text,
  estimated_revenue   text,
  founding_year       integer,
  linkedin_url        text,
  linkedin_followers  integer,
  tech_stack          text[] DEFAULT '{}',
  has_crm             boolean,
  has_erp             boolean,
  cms_platform        text,
  mobile_friendly     boolean,
  ssl_enabled         boolean,
  page_load_speed_ms  integer,
  website_screenshots jsonb DEFAULT '[]'::jsonb,
  last_audit_at       timestamptz,
  kvk_number          text,
  kvk_trade_name      text,
  kvk_legal_form      text,
  kvk_registration_date date,
  kvk_sbi_codes       text[] DEFAULT '{}',
  ai_company_summary  text,
  ai_pain_points      text[] DEFAULT '{}',
  ai_opportunity_notes text,
  ai_pitch_brief      text,
  ai_analyzed_at      timestamptz,
  lead_score          integer DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  score_breakdown     jsonb DEFAULT '{}'::jsonb,
  score_tier          text GENERATED ALWAYS AS (
                        CASE
                          WHEN lead_score >= 70 THEN 'hot'
                          WHEN lead_score >= 40 THEN 'warm'
                          ELSE 'cold'
                        END
                      ) STORED,
  scored_at           timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_enrichment_contact UNIQUE (contact_id)
);

-- Scoring rules
CREATE TABLE public.scoring_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  category        text DEFAULT 'general' CHECK (category IN (
                    'technology', 'company', 'location', 'engagement', 'website', 'general'
                  )),
  field_path      text NOT NULL,
  operator        text NOT NULL CHECK (operator IN (
                    'exists', 'not_exists', 'equals', 'not_equals', 'contains', 'gt', 'lt', 'in'
                  )),
  value           text,
  score_delta     integer NOT NULL DEFAULT 0,
  is_active       boolean DEFAULT true,
  sort_order      integer DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Outreach sequences
CREATE TABLE public.outreach_sequences (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  is_active       boolean DEFAULT true,
  target_tier     text DEFAULT 'all' CHECK (target_tier IN ('hot', 'warm', 'cold', 'all')),
  target_industries text[] DEFAULT '{}',
  steps           jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_enrolled  integer DEFAULT 0,
  total_completed integer DEFAULT 0,
  total_replied   integer DEFAULT 0,
  total_converted integer DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Outreach enrollments
CREATE TABLE public.outreach_enrollments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sequence_id     uuid NOT NULL REFERENCES public.outreach_sequences(id) ON DELETE CASCADE,
  contact_id      uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  enrolled_by     uuid REFERENCES public.profiles(id),
  current_step    integer DEFAULT 1,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN (
                    'active', 'paused', 'completed', 'replied', 'unsubscribed', 'converted', 'bounced'
                  )),
  enrolled_at     timestamptz NOT NULL DEFAULT now(),
  last_action_at  timestamptz,
  next_action_at  timestamptz,
  completed_at    timestamptz,
  step_results    jsonb DEFAULT '[]'::jsonb,
  conversion_deal_id uuid REFERENCES public.deals(id),
  converted_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_enrollment UNIQUE (contact_id, sequence_id)
);

-- Content calendar
CREATE TABLE public.content_calendar (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by      uuid REFERENCES public.profiles(id),
  title           text NOT NULL,
  content         text,
  platform        text NOT NULL CHECK (platform IN (
                    'linkedin', 'instagram', 'facebook', 'twitter', 'blog', 'email', 'whatsapp', 'other'
                  )),
  content_type    text DEFAULT 'post' CHECK (content_type IN (
                    'post', 'story', 'reel', 'article', 'newsletter', 'ad', 'other'
                  )),
  status          text NOT NULL DEFAULT 'idea' CHECK (status IN (
                    'idea', 'draft', 'review', 'scheduled', 'published', 'archived'
                  )),
  scheduled_date  date,
  scheduled_time  time,
  published_at    timestamptz,
  published_url   text,
  media_urls      text[] DEFAULT '{}',
  thumbnail_url   text,
  performance_data jsonb DEFAULT '{}'::jsonb,
  ai_generated    boolean DEFAULT false,
  ai_prompt       text,
  contact_id      uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  project_id      uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  tags            text[] DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Audit logs
CREATE TABLE public.audit_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id         uuid REFERENCES public.profiles(id),
  action          text NOT NULL,
  entity_type     text NOT NULL,
  entity_id       uuid,
  old_values      jsonb,
  new_values      jsonb,
  ip_address      inet,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Deferred FK
ALTER TABLE public.deals
  ADD CONSTRAINT fk_deals_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_deals_quote FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL;

ALTER TABLE public.activities
  ADD CONSTRAINT fk_activities_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

-- INDEXES
CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX idx_companies_org ON public.companies(organization_id);
CREATE INDEX idx_contacts_org ON public.contacts(organization_id);
CREATE INDEX idx_contacts_company ON public.contacts(company_id);
CREATE INDEX idx_contacts_lifecycle ON public.contacts(organization_id, lifecycle_stage);
CREATE INDEX idx_contacts_score ON public.contacts(organization_id, lead_score DESC);
CREATE INDEX idx_deals_org ON public.deals(organization_id);
CREATE INDEX idx_deals_stage ON public.deals(stage_id);
CREATE INDEX idx_activities_org ON public.activities(organization_id);
CREATE INDEX idx_activities_contact ON public.activities(contact_id);
CREATE INDEX idx_projects_org ON public.projects(organization_id);
CREATE INDEX idx_projects_status ON public.projects(organization_id, status);
CREATE INDEX idx_quotes_org ON public.quotes(organization_id);
CREATE INDEX idx_invoices_org ON public.invoices(organization_id);
CREATE INDEX idx_invoices_status ON public.invoices(organization_id, status);
CREATE INDEX idx_data_sources_org ON public.data_sources(organization_id);
CREATE INDEX idx_scrape_runs_source ON public.scrape_runs(data_source_id);
CREATE INDEX idx_content_org ON public.content_calendar(organization_id);
CREATE INDEX idx_audit_org ON public.audit_logs(organization_id);

-- RLS Helper
CREATE OR REPLACE FUNCTION public.user_organization_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = auth.uid()
    AND is_active = true;
$$;

-- Enable RLS + policies
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'organizations', 'organization_members', 'organization_invites',
      'companies', 'contacts', 'pipeline_stages', 'deals', 'activities', 'tags', 'custom_field_definitions',
      'projects', 'quotes', 'invoices', 'subscriptions', 'project_files',
      'data_sources', 'scrape_runs', 'raw_leads', 'lead_enrichment', 'scoring_rules',
      'outreach_sequences', 'outreach_enrollments',
      'content_calendar', 'audit_logs'
    ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format(
      'CREATE POLICY "Service role full access" ON public.%I FOR ALL USING (auth.role() = ''service_role'')',
      tbl
    );
    IF tbl = 'organizations' THEN
      EXECUTE format(
        'CREATE POLICY "Members can view own orgs" ON public.%I FOR SELECT USING (id IN (SELECT public.user_organization_ids()))',
        tbl
      );
    ELSIF tbl IN ('organization_members', 'organization_invites') THEN
      EXECUTE format(
        'CREATE POLICY "Members can view own org data" ON public.%I FOR ALL USING (organization_id IN (SELECT public.user_organization_ids()))',
        tbl
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY "Org member access" ON public.%I FOR ALL USING (organization_id IN (SELECT public.user_organization_ids()))',
        tbl
      );
    END IF;
  END LOOP;
END;
$$;

-- Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Service role full access profiles" ON public.profiles FOR ALL USING (auth.role() = 'service_role');

-- Child tables RLS
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY['quote_lines', 'invoice_lines'])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format(
      'CREATE POLICY "Service role full access" ON public.%I FOR ALL USING (auth.role() = ''service_role'')',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "Authenticated access" ON public.%I FOR ALL USING (auth.role() = ''authenticated'')',
      tbl
    );
  END LOOP;
END;
$$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'profiles', 'organizations', 'companies', 'contacts', 'deals', 'activities',
      'projects', 'quotes', 'invoices', 'subscriptions',
      'data_sources', 'scrape_runs', 'outreach_sequences', 'outreach_enrollments',
      'lead_enrichment', 'content_calendar'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()',
      tbl
    );
  END LOOP;
END;
$$;

-- Auto-generate document numbers
CREATE OR REPLACE FUNCTION public.generate_document_number(
  p_org_id uuid,
  p_prefix text,
  p_entity text
)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  current_year text := to_char(now(), 'YYYY');
  next_num integer;
  result text;
BEGIN
  EXECUTE format(
    'SELECT count(*) + 1 FROM public.%I WHERE organization_id = $1 AND %I LIKE $2',
    p_entity,
    CASE p_entity
      WHEN 'projects' THEN 'project_number'
      WHEN 'quotes' THEN 'quote_number'
      WHEN 'invoices' THEN 'invoice_number'
    END
  ) INTO next_num USING p_org_id, p_prefix || '-' || current_year || '-%';
  result := p_prefix || '-' || current_year || '-' || lpad(next_num::text, 3, '0');
  RETURN result;
END;
$$;