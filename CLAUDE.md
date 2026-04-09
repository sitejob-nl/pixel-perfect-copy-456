# SiteJob ERP v2

## Project Overview

Internal CRM/ERP system for SiteJob, replacing separate tools with one unified platform. Multi-tenant architecture so it can also be offered as SaaS to other companies in the future.

- **Owner:** SiteJob — Kas van de Meulengraaf (owner/developer)
- **Team:** Thomas (COO), Jens van Kollenburg (intern)
- **Supabase project:** `fuvpmxxihmpustftzvgk`
- **Organization ID:** `24021e4d-66d5-40b3-9968-c945bd8755c2`
- **GitHub:** `sitejob-nl/pixel-perfect-copy-456`
- **Built with:** Lovable (migrating to Claude Code + VS Code)

## Tech Stack & Architecture

### Stack
- **Frontend:** React 18 + TypeScript + Vite (port 8080)
- **Styling:** Tailwind CSS 3 + shadcn/ui (49 components) + custom `erp-*` design tokens
- **State:** TanStack React Query (all data fetching via custom hooks)
- **Routing:** react-router-dom v6 (see routes below)
- **Backend:** Supabase (PostgreSQL + Auth + Edge Functions + Storage + RLS)
- **Rich text:** TipTap editor
- **Charts:** Recharts
- **Forms:** react-hook-form + zod
- **Drag & drop:** @dnd-kit
- **PWA:** vite-plugin-pwa (autoUpdate, push notifications via sw-push.js)
- **Font:** DM Sans (loaded from Google Fonts)
- **Icons:** Lucide React + custom ErpIcons

### Design System
Dark-mode-only dashboard, Linear/Vercel-style.

**CSS custom properties** defined in `src/index.css`:
- Backgrounds: `--erp-bg-0` (darkest, ~hsl 240 33% 3%) through `--erp-bg-4`
- Borders: `--erp-border-0` through `--erp-border-2`
- Text: `--erp-text-0` (brightest) through `--erp-text-3` (dimmest)
- Accent colors: `--erp-blue` (primary, hsl 225 93% 64%), `--erp-green`, `--erp-red`, `--erp-amber`, `--erp-purple`, `--erp-orange`, `--erp-cyan`

**Tailwind usage:** `bg-erp-bg0`, `text-erp-text1`, `border-erp-border0`, etc. All defined in `tailwind.config.ts` under `theme.extend.colors.erp`.

**Branding:** Per-organization branding via `BrandingContext` — orgs can set custom accent colors. HSL conversion from hex in `src/contexts/BrandingContext.tsx`.

### Directory Structure
```
src/
  App.tsx              # Routes + auth guards (ProtectedRoute, AuthRoute, OnboardingRoute, AdminRoute)
  main.tsx             # Entry point
  index.css            # Design tokens + global styles
  components/
    ui/                # 49 shadcn/ui primitives
    erp/               # App-level components (sidebar, header, settings, dialogs)
    shared/            # Reusable: CommunicationTimeline, EntityAttachments, AddTaskDialog, QuickActionBar
    deals/             # Kanban, table, detail sheet, dialogs
    contracts/         # Signing UI (PDF editor, signature canvas, step indicators)
    demos/             # Demo wizard, editor, preview, type selector
    email/             # Email builder (block renderer, palette, settings, HTML generator)
    gmail/             # Gmail thread list, compose, CRM context panel
    whatsapp/          # Chat window, conversation list, template manager, automations
    portal/            # Client portal: chat, file upload, onboarding form
    bookings/          # Booking page settings
    tasks/             # Task board, list, detail panel, week view
    prospecting/       # Prospect kanban, table, detail sheet, convert dialog
    content/           # LinkedIn post dialog
    project-plans/     # Plan wizard, section editor, preview, send dialog
  contexts/
    AuthContext.tsx     # Supabase auth session management
    BrandingContext.tsx # Per-org branding (accent color, logo)
  hooks/               # 40+ custom hooks (see Key Patterns section)
  integrations/
    supabase/
      client.ts        # Supabase client init (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)
      types.ts         # Auto-generated types (13,669 lines) — DO NOT EDIT MANUALLY
  pages/               # 54 page components
  data/
    mockData.ts        # Mock data (likely legacy)
  lib/
    utils.ts           # cn() helper (clsx + tailwind-merge)
    streamChat.ts      # AI streaming chat utility

supabase/
  config.toml          # Edge function config (ALL have verify_jwt = false — see Security Issues)
  functions/           # 37 edge functions (Deno/TypeScript)
  migrations/          # 38 SQL migration files
```

### Routes
**Public routes:**
| Path | Page | Description |
|------|------|-------------|
| `/auth` | AuthPage | Login/signup |
| `/reset-password` | ResetPasswordPage | Password reset |
| `/accept-invite` | AcceptInvitePage | Accept org invite |
| `/sign` | ContractSigningPage | Public contract signing |
| `/book/:slug` | BookingPage | Public booking page |
| `/portal` | ClientPortalPage | Client portal (link-based access) |
| `/demo/:slug` | PublicDemoPage | Public demo viewer |
| `/plan/:slug` | ProjectPlanPublicPage | Public project plan viewer |
| `/onboarding` | OnboardingPage | New user org setup |

**Protected routes** (inside layout with sidebar):
| Path | Page | Module |
|------|------|--------|
| `/dashboard` | DashboardPage | Core |
| `/tasks` | TasksPage | Core |
| `/companies` | CompaniesPage | CRM |
| `/companies/:id` | CompanyDetailPage | CRM |
| `/contacts` | ContactsPage | CRM |
| `/contacts/:id` | ContactDetailPage | CRM |
| `/deals` or `/pipeline` | DealsPage | CRM |
| `/prospecting` | ProspectingPage | CRM |
| `/prospecting/:poolId` | ProspectPoolDetailPage | CRM |
| `/projects` | ProjectsPage | Work |
| `/projects/:id` | ProjectDetailPage | Work |
| `/quotes` | QuotesPage | Work |
| `/invoices` | InvoicesPage | Work |
| `/contracts` | ContractsPage | Work |
| `/project-plans` | ProjectPlansPage | Work |
| `/project-plans/:id` | ProjectPlanBuilderPage | Work |
| `/gmail` | GmailPage | Communication |
| `/whatsapp` | WhatsAppPage | Communication |
| `/calendar` | CalendarPage | Communication |
| `/calls` | CallsPage | Communication |
| `/bookings` | BookingsPage | Communication |
| `/portals` | PortalAdminPage | Communication |
| `/ai` | AiAssistantPage | Tools |
| `/aiagent` | AIAgentPage | Tools |
| `/knowledgebase` | KnowledgeBasePage | Tools |
| `/dataintel` | DataIntelPage | Tools |
| `/scrapers` | ScrapersPage | Tools |
| `/demos` | DemosPage | Tools |
| `/demos/:id/edit` | DemoEditPage | Tools |
| `/content` | ContentPage | Tools |
| `/email` | EmailPage | Tools |
| `/drafts` | EmailDraftsPage | Tools |
| `/marketing` or `/meta-ads` | MetaMarketingPage | Tools |
| `/reports` | ReportingPage | Tools |
| `/webhooks` | WebhooksPage | Tools |
| `/settings` | SettingsPage | Core |
| `/admin` | AdminPage | Super admin only |

## Database Schema

### Overview
- **100+ tables** (including views) in the `public` schema
- **Multi-tenant:** Nearly every table has `organization_id` column
- **RLS on all tables** using `user_organization_ids()` helper function
- **Auto-generated types:** `src/integrations/supabase/types.ts` (regenerate with command below)

### Core Database Functions
| Function | Purpose |
|----------|---------|
| `user_organization_ids()` | Returns org IDs for current user (SECURITY DEFINER, used in all RLS policies) |
| `handle_updated_at()` | Trigger function: sets `updated_at = now()` on UPDATE |
| `generate_document_number(org_id, prefix, entity)` | Auto-generates PRJ-2025-001, OFF-2025-001, INV-2025-001 |
| `handle_new_user()` | Trigger on auth.users: creates profile row |
| `user_wants_push(user_id, org_id, event)` | Checks push notification preferences |
| `notify_new_contact()` | Trigger: sends push on new contact |
| `notify_contract_signed()` | Trigger: sends push on contract signing |
| `notify_deal_stage_change()` | Trigger: sends push on deal stage change |
| `build_linkedin_prompt()` | Builds prompt for LinkedIn post generation |

### Tables by Module

**Platform Core:**
- `organizations` — tenant table (name, slug, branding, address, kvk, btw)
- `organization_members` — user ↔ org membership (role: admin/member, is_active)
- `organization_invites` — pending invitations
- `organization_modules` — 28 boolean feature toggles per org
- `organization_api_keys` — API key management
- `organization_integrations` — integration configs
- `profiles` — user profiles (linked to auth.users)
- `custom_field_definitions` — custom fields per entity type
- `audit_logs` — action audit trail
- `notification_preferences` — push notification settings per user
- `notifications` — notification records
- `push_subscriptions` — web push subscriptions
- `security_events` — security event log
- `rate_limits` — rate limiting records
- `saved_views` — saved filter/view configurations
- `monthly_snapshots` — monthly metrics snapshots

**CRM:**
- `contacts` — unified contacts with `lifecycle_stage` (lead/customer/churned/etc)
- `companies` — organizations/businesses (1:many with contacts via `company_id`)
- `deals` — sales pipeline deals
- `pipeline_stages` — configurable pipeline stages per org
- `activities` — CRM activities (calls, meetings, notes)
- `tags` — tagging system
- `contact_notes` — notes per contact
- `comments` — comments on any entity
- `lead_enrichment` — enriched data per contact
- `lead_automations` + `lead_automation_logs` — automation rules

**Communication:**
- `communications` — unified log (email, phone, WhatsApp, LinkedIn, SMS)
- `whatsapp_accounts` — WhatsApp Business accounts
- `whatsapp_messages` — message history
- `whatsapp_webhook_logs` — webhook event log
- `whatsapp_templates` — message templates
- `whatsapp_automations` — auto-reply rules
- `email_accounts` — email account connections (Google, Microsoft, SMTP)
- `email_inbox` — synced emails
- `email_sync_messages` — sync state
- `email_rules` — email processing rules
- `google_emails` — Gmail sync with AI processing
- `google_connections` — Google OAuth connections
- `google_calendar_events` — synced calendar events
- `calendar_events` — internal calendar events
- `call_log` — Voys VoIP call records (transcription, sentiment, AI summary, action items)
- `linkedin_connections` — LinkedIn account connections
- `linkedin_message_templates` — LinkedIn message templates
- `linkedin_webhook_events` — LinkedIn webhook events

**Projects:**
- `projects` — project records with status tracking
- `project_files` — file attachments
- `project_feedback` — visual feedback
- `project_status_updates` — status update log
- `project_status_changes` — status change history
- `project_checklist_items` — checklist items per project
- `project_checklist_templates` + `project_checklist_template_items` — reusable checklists
- `project_plans` — project plan documents
- `project_plan_sections` — sections within plans
- `project_plan_section_library` — reusable section library
- `project_plan_templates` — plan templates
- `onboarding_questions` + `onboarding_responses` — client onboarding
- `onboarding_templates` — onboarding templates

**Financial:**
- `quotes` + `quote_lines` — quotations with line items (auto-numbered OFF-YYYY-NNN)
- `invoices` + `invoice_lines` — invoices with line items (auto-numbered INV-YYYY-NNN)
- `subscriptions` — recurring subscriptions

**Contracts:**
- `contracts` — contract records
- `contract_templates` — reusable templates with variables
- `contract_variable_sources` — variable data sources
- `contract_signing_sessions` — signing session state
- `contract_audit_logs` — signing audit trail

**Client Portal:**
- `portal_sessions` — link-based access sessions (no login required)
- `portal_messages` — portal chat messages
- `portal_file_requests` — file request tracking
- `portal_activity_log` — portal activity audit

**Data Intelligence / Lead Generation:**
- `data_sources` — source configuration (Apify, Firecrawl, CSV, API, manual)
- `scrape_runs` — scraping run records
- `raw_leads` — unprocessed lead data
- `scoring_rules` — configurable lead scoring per org
- `website_scrapes` + `scrape_pages` — website scrape results
- `outreach_sequences` + `outreach_enrollments` + `outreach_templates` — outreach automation
- `outreach_daily_stats` — outreach metrics
- `sequence_triggers` — sequence trigger rules
- `apify_actor_configs` — Apify actor configurations
- `apify_direct_runs` — Apify direct run records
- `crawl_jobs` — crawl job records

**Prospecting:**
- `prospect_pools` — prospect pool/list
- `prospect_leads` — leads within pools
- `prospect_pipeline_config` — pipeline stage config

**Demos:**
- `demos` — demo records
- `demo_versions` — versioned demo content
- `demo_pages` — demo page content
- `demo_feedback` — feedback on demos
- `demo_views` — view tracking
- `demo_website_types` — website type presets
- `demo_dashboard_modules` — dashboard module presets
- `demo_industry_modules` — industry-specific modules
- `demo_platform_types` — platform type presets

**Email Builder:**
- `email_templates` — templates with `design_json` (drag & drop, 9 block types)
- `email_sends` — send records with tracking
- `email_link_clicks` — click tracking

**Content:**
- `content_calendar` — multi-platform content planning

**Bookings:**
- `booking_pages` — booking page configuration
- `booking_event_types` — event type definitions
- `booking_blocked_dates` — blocked date ranges
- `bookings` — booking records

**Accounting:**
- `snelstart_config` — SnelStart connection config
- `snelstart_entity_map` — entity mapping
- `snelstart_sync_log` — sync history

**Meta Marketing:**
- `meta_config` — Meta API configuration
- `meta_connections` — Meta account connections
- `meta_leads` — Meta lead records
- `meta_lead_stages` — lead stage tracking

**AI:**
- `ai_chat_sessions` — AI agent sessions
- `ai_conversations` — conversation history
- `ai_actions` — AI-triggered actions
- `ai_queue` — background AI task queue
- `ai_models` — available AI models
- `ai_suggestions` — AI-generated suggestions
- `ai_summaries` — AI-generated summaries

**Webhooks:**
- `webhook_endpoints` — inbound webhook endpoints
- `webhook_logs` — webhook event log
- `webhook_source_templates` — source templates
- `webhook_target_fields` — field mapping config

**Other:**
- `knowledge_base_documents` — knowledge base files
- `entity_attachments` — generic file attachments
- `integration_secrets` — encrypted integration secrets
- `mcp_api_keys` + `mcp_audit_log` — MCP API access
- `tasks` — task management
- `debug_log` — debug logging

### Key Views
- `v_call_log` — enriched call log
- `v_comments` — comment aggregation
- `v_company_email_stats` / `v_company_health` — company analytics
- `v_deal_pipeline` — deal pipeline view
- `v_demos` — demo overview
- `v_email_drafts` / `v_email_threads` — email aggregation
- `v_hot_leads` — high-score leads
- `v_klanten` — customer overview
- `v_lead_pipeline` — lead funnel
- `v_my_tasks` — current user's tasks
- `v_project_overview` / `v_project_timeline` — project analytics
- `v_prospect_leads` — prospect view
- `v_revenue_summary` — revenue metrics
- `v_suggestion_counts` — AI suggestion counts
- `v_upcoming_bookings` / `v_upcoming_events` — upcoming items
- `admin_organizations` / `admin_users` — super admin views
- `email_stats_by_org` — email statistics

### Storage Buckets
| Bucket | Public | Usage |
|--------|--------|-------|
| `org-assets` | Yes | Organization logos, WhatsApp media, contract PDFs |
| `knowledge-base` | No | Knowledge base documents |
| `entity-attachments` | No | Generic file attachments |
| `meta-uploads` | Yes | Meta marketing uploads |

## Edge Functions

**37 edge functions** in `supabase/functions/`. All deployed to Deno runtime.

### CRITICAL SECURITY ISSUE
**ALL 37 edge functions have `verify_jwt = false`** in `supabase/config.toml`. This means any function can be called without authentication. Functions that handle sensitive operations (ai-agent, manage-api-keys, send-email, etc.) should have JWT verification enabled or implement their own auth checks internally.

### Edge Function Reference
| Function | Purpose |
|----------|---------|
| `ai-agent` | CRM-aware AI assistant (Anthropic API) |
| `ask-sitejob` | Command bar AI assistant |
| `email-agent` | AI-powered email processing |
| `generate-plan-section` | AI-generated project plan sections |
| `send-email` | Email sending via Resend + open/click tracking |
| `manage-resend` | Resend API key management |
| `contract-signing` | Digital contract signing with SMS verification |
| `sign-pdf` | PDF signing with pdf-lib |
| `client-portal` | Client portal backend |
| `whatsapp-send` | Send WhatsApp messages |
| `whatsapp-webhook` | Receive WhatsApp webhooks |
| `whatsapp-config` | WhatsApp account configuration |
| `whatsapp-templates` | WhatsApp template management |
| `whatsapp-business-profile` | WhatsApp business profile |
| `whatsapp-phone-quality` | WhatsApp phone quality metrics |
| `whatsapp-mark-read` | Mark WhatsApp messages as read |
| `run-scraper` | Apify actor runner |
| `prospect-engine` | Prospect enrichment engine |
| `google-oauth-callback` | Google OAuth callback handler |
| `google-api` | Google API proxy |
| `voys-webhook` | Voys VoIP webhook receiver |
| `booking-service` | Booking management backend |
| `snelstart-sync` | SnelStart accounting sync |
| `snelstart-webhook` | SnelStart webhook receiver |
| `linkedin-oauth` | LinkedIn OAuth flow |
| `linkedin-post` | LinkedIn post publishing |
| `linkedin-webhook` | LinkedIn webhook receiver |
| `create-organization` | Organization creation |
| `send-invite` | Send org invitations |
| `accept-invite` | Accept org invitations |
| `manage-api-keys` | API key CRUD |
| `manage-webhooks` | Webhook endpoint management |
| `webhook-receiver` | Inbound webhook processor |
| `push-config` | Push notification VAPID config |
| `send-push` | Send push notifications |
| `connect-meta-api` | Meta (Facebook) API connection |
| `connect-meta-manage` | Meta account management |
| `connect-meta-webhook` | Meta webhook receiver |
| `kvk-search` | Dutch Chamber of Commerce search |
| `test-cloudflare` | Cloudflare test endpoint |

### Required Secrets
| Secret | Integration |
|--------|-------------|
| `ANTHROPIC_API_KEY` | AI Agent, Ask SiteJob, Email Agent |
| `ENCRYPTION_KEY` | Integration secret encryption |
| `RESEND_API_KEY` | Email sending |
| `RESEND_WEBHOOK_SECRET` | Email event webhooks |
| `APIFY_TOKEN` | Web scraping / lead generation |
| `FIRECRAWL_API_KEY` | Website scraping |
| `GOOGLE_GEMINI_API_KEY` | AI fallback |
| Voys credentials | VoIP call logging |
| Google OAuth credentials | Gmail / Calendar sync |
| Meta API credentials | Facebook/Instagram marketing |
| LinkedIn API credentials | LinkedIn integration |
| WhatsApp Business API credentials | WhatsApp messaging |

## Integration Status

| Integration | Backend | Frontend | Status |
|-------------|---------|----------|--------|
| **AI Agent** | `ai-agent` function + ai_* tables | AIAgentPage, AiAssistantPage | Functional (Anthropic API, model selector) |
| **Ask SiteJob** | `ask-sitejob` function | AskSiteJobCommandBar (Cmd+K) | Functional |
| **WhatsApp Business** | 7 edge functions + whatsapp_* tables | Full chat UI, templates, automations | Functional |
| **Gmail Sync** | `google-api`, `google-oauth-callback` + google_emails table | GmailPage, ComposeEmailDialog, CRM context | Functional |
| **Google Calendar** | google-api + google_calendar_events | CalendarPage | Functional |
| **Voys VoIP** | `voys-webhook` + call_log table | CallsPage | Functional (webhook-based) |
| **Email Sending (Resend)** | `send-email`, `manage-resend` + email_templates/sends | EmailPage (builder), EmailDraftsPage | Functional |
| **Apify Scrapers** | `run-scraper` + apify_* tables | ScrapersPage | Functional |
| **Prospecting** | `prospect-engine` + prospect_* tables | ProspectingPage, ProspectPoolDetailPage | Functional |
| **Contract Signing** | `contract-signing`, `sign-pdf` + contract_* tables | ContractsPage, ContractSigningPage (public) | Functional |
| **Demo Builder** | demo_* tables (no dedicated edge function) | DemosPage, DemoEditPage, PublicDemoPage | Functional (AI generation via ai-agent) |
| **Client Portal** | `client-portal` + portal_* tables | ClientPortalPage (public), PortalAdminPage | Functional |
| **Bookings** | `booking-service` + booking_* tables | BookingsPage, BookingPage (public) | Functional |
| **SnelStart Accounting** | `snelstart-sync`, `snelstart-webhook` + snelstart_* tables | SnelstartSettings (in Settings) | Partial — backend ready, limited UI |
| **LinkedIn** | `linkedin-oauth`, `linkedin-post`, `linkedin-webhook` | LinkedInSettings, LinkedInPostDialog | Partial |
| **Meta Marketing** | 3 connect-meta-* functions + meta_* tables | MetaMarketingPage | Functional |
| **Project Plans** | `generate-plan-section` + project_plan_* tables | ProjectPlansPage, ProjectPlanBuilderPage, public viewer | Functional |
| **Webhooks** | `manage-webhooks`, `webhook-receiver` | WebhooksPage | Functional |
| **Push Notifications** | `push-config`, `send-push` + push_subscriptions | NotificationBell | Functional |
| **KvK Search** | `kvk-search` function | CreateCompanyDialog | Functional |

## Lovable Prompt Build Order

Based on components found in the codebase, all 9 Lovable prompts have been executed:

1. **Security Fixes + AI Agent Rewrite** — Done (ai-agent function, auth guards)
2. **Super Admin + Module Toggles** — Done (AdminPage, organization_modules, useOrgModules)
3. **Webhook API System** — Done (WebhooksPage, manage-webhooks, webhook-receiver)
4. **AI Model Selector** — Done (ai_models table, model selector in AI pages)
5. **Contracts Module** — Done (ContractsPage, ContractSigningPage, contract-signing function)
6. **Scrapers / Apify Direct Runner** — Done (ScrapersPage, run-scraper function)
7. **Client Portal** — Done (ClientPortalPage, PortalAdminPage, client-portal function)
8. **Email Builder** — Done (EmailPage with drag & drop builder, send-email function)
9. **Demo Builder** — Done (DemosPage, DemoEditPage, PublicDemoPage)

## Key Patterns & Conventions

### Organization Context
Every data operation requires `organization_id`. The pattern:
```typescript
const { data: org } = useOrganization();  // from useOrganization hook
const orgId = org?.organization_id;

// In queries:
useQuery({
  queryKey: ["entity", orgId],
  enabled: !!orgId,
  queryFn: async () => {
    const { data } = await supabase
      .from("table")
      .select("*")
      .eq("organization_id", orgId!)
      .order("created_at", { ascending: false });
    return data;
  },
});
```

### Data Fetching
- All data fetching via **TanStack React Query** hooks in `src/hooks/`
- Query keys always include `orgId`: `["contacts", orgId]`
- Mutations use `useMutation` + `queryClient.invalidateQueries`
- Types imported from auto-generated types: `Database["public"]["Tables"]["table"]["Row"]`

### Module Visibility
Sidebar items conditionally shown based on `organization_modules` boolean flags. Mapping in `ErpSidebar.tsx` (`moduleMap` object).

### Contact Lifecycle
Contacts use `lifecycle_stage` field instead of separate lead/customer tables:
- `lead` → `customer` → `churned` (and other stages)

### Supabase Client
```typescript
import { supabase } from "@/integrations/supabase/client";
```
Client initialized with env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

### Component Structure
- All UI primitives in `src/components/ui/` (shadcn/ui — do not modify manually)
- App components in `src/components/erp/` (dialogs, settings, sidebar)
- Feature components grouped by module: `deals/`, `contracts/`, `demos/`, etc.
- Shared components in `src/components/shared/`

### Auth Flow
1. `AuthContext` wraps entire app — provides `session`, `user`, `loading`, `signOut`
2. `ProtectedRoute` checks session + org membership
3. `OnboardingRoute` redirects users without org to `/onboarding`
4. `AdminRoute` checks super admin status via `useIsSuperAdmin`

### Command Bar
Cmd+K opens `AskSiteJobCommandBar` — AI-powered command bar backed by `ask-sitejob` edge function.

## Known Issues & Technical Debt

### Edge Function Security
- **24 of 37 edge functions now have `verify_jwt = true`** (fixed 2026-04-09)
- **13 functions remain public** (webhooks, OAuth callbacks, signing, portal, bookings) — this is intentional
- Some functions also check the Authorization header manually for user context

### Lovable Legacy Code
- ~~83 `(supabase as any)` casts~~ — **Fixed 2026-04-09**: types regenerated, all casts removed (0 remaining)
- ~~`lovable-tagger` dev dependency~~ — **Removed 2026-04-09**
- Some component organization follows Lovable conventions rather than best practices

### Type Safety
- Types regenerated 2026-04-09 — regenerate again when schema changes
- No custom TypeScript interfaces for complex joined queries (inline type assertions instead)

### Missing/Incomplete Features
- **Reporting** — ReportingPage exists but may have limited functionality
- **Content Calendar** — ContentPage exists, limited UI (only LinkedIn post dialog)
- **Email Rules** — table exists, no frontend UI
- **Outreach Sequences** — tables exist, frontend integration unclear
- **Lead Scoring** — scoring_rules table exists, automated scoring backend unclear

### Other Issues
- `mockData.ts` in `src/data/` — contains color/label constants (used) + mock content items (ContentPage uses these instead of DB)
- Only 1 test file exists (`src/test/example.test.ts`) — no meaningful test coverage
- `project_id` hardcoded in `supabase/config.toml`
- **RLS: all tables protected** (7 unprotected tables fixed 2026-04-09)

## Development Setup

### Prerequisites
- Node.js 18+
- npm or bun

### Local Development
```bash
npm install
npm run dev          # Starts Vite dev server on port 8080
```

### Environment Variables
Required in `.env` or `.env.local`:
```
VITE_SUPABASE_URL=https://fuvpmxxihmpustftzvgk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
```

### Regenerate Supabase Types
```bash
npx supabase gen types typescript --project-id fuvpmxxihmpustftzvgk --schema public > src/integrations/supabase/types.ts
```

### Build & Deploy
```bash
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # ESLint
npm run test         # Vitest
```

### Edge Function Deployment
Edge functions are deployed via Supabase CLI:
```bash
npx supabase functions deploy <function-name> --project-ref fuvpmxxihmpustftzvgk
```

## Team & Contact

| Person | Role | Focus |
|--------|------|-------|
| Kas van de Meulengraaf | Owner / Developer | Architecture, full-stack, integrations |
| Thomas | COO | Operations, business requirements |
| Jens van Kollenburg | Intern | Development tasks |
