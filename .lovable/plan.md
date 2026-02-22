

# SiteJob ERP v2 - Uitgebreid Implementatieplan

## Huidige Staat

Het project heeft momenteel:
- Donker enterprise UI-design met sidebar navigatie
- Pagina's met **mock data**: Dashboard, Pipeline, Projecten, Facturen, Data Intelligence, Content
- **Contacten pagina** verbonden met Supabase (ophalen + aanmaken)
- Supabase authenticatie (login/registratie/wachtwoord reset)
- Database schema met 20+ tabellen (contacts, companies, deals, projects, invoices, etc.)
- Multi-tenant RLS policies op alle tabellen via `organization_id`

Wat nog NIET werkt: na registratie heeft een gebruiker geen organisatie, dus alle data is onzichtbaar door RLS.

---

## Fase 0: Onboarding + Organisatie Setup (Prioriteit: BLOKKEREND)

Zonder organisatie werkt niets. Dit moet eerst.

**Stappen:**
1. Maak een onboarding flow die na eerste login een organisatie aanmaakt
2. Koppel de gebruiker als `owner` in `organization_members`
3. Maak standaard pipeline stages aan voor de nieuwe organisatie
4. Redirect naar dashboard na voltooiing

**Technisch:**
- Nieuwe pagina `OnboardingPage.tsx` met organisatie naam/slug invoer
- Edge function of client-side insert voor organisatie + member record
- Update `Index.tsx` om te checken of gebruiker een organisatie heeft

---

## Fase 1: CRM Kern - Alle Pagina's Verbinden met Supabase

### 1A. Bedrijven (Companies) pagina
- Nieuwe `CompaniesPage.tsx` met echte data uit `companies` tabel
- CRUD: aanmaken, bewerken, verwijderen
- Zoeken en filteren op naam, branche, stad
- Koppeling tonen met contacten

### 1B. Pipeline pagina verbinden
- Hook `useDeals.ts` voor deals + pipeline_stages uit Supabase
- Deals ophalen met stage info, contact en bedrijf
- Nieuwe deal aanmaken via dialog
- Deal verplaatsen tussen stages (drag-and-drop of klik)

### 1C. Dashboard verbinden met echte data
- Stats ophalen: pipeline waarde (SUM deals.value), open deals count, MRR (SUM subscriptions.monthly_amount)
- Recente activiteiten uit `activities` tabel
- Pipeline verdeling berekenen uit deals + stages

### 1D. Contacten pagina uitbreiden
- Contact detail view/edit dialog
- Contact verwijderen
- Bedrijf koppelen aan contact
- Activiteiten timeline per contact

---

## Fase 2: Projecten + Facturatie

### 2A. Projecten pagina verbinden
- Hook `useProjects.ts` voor CRUD
- Project aanmaken met nummer generatie (via `generate_document_number` functie)
- Status wijzigen, voortgang bijhouden
- Koppeling met contact/bedrijf/deal

### 2B. Facturen pagina verbinden
- Hook `useInvoices.ts` voor CRUD
- Factuur aanmaken met automatische nummering
- Factuurregels beheren (`invoice_lines` tabel)
- Status flow: concept -> verstuurd -> betaald
- BTW berekening (21% standaard)

### 2C. Offertes pagina
- Nieuwe `QuotesPage.tsx` (nu placeholder)
- Hook `useQuotes.ts` voor CRUD
- Offerteregels beheren (`quote_lines`)
- Offerte omzetten naar factuur

---

## Fase 3: Data Intelligence

### 3A. Data Sources beheer
- CRUD voor `data_sources` tabel
- Configuratie per provider (Apify actor ID, input params, targeting)
- Schedule instellen (cron expressie)

### 3B. Scrape Runs verbinden
- Echte data uit `scrape_runs` tabel ipv mock data
- Run details met raw_leads resultaten
- Handmatige run trigger (voorbereiding voor edge function)

### 3C. Lead Enrichment weergave
- Enrichment data tonen bij contacten
- Score breakdown visualisatie
- Tech stack, Google rating, AI insights

### 3D. Scoring Rules verbinden
- CRUD voor `scoring_rules` tabel
- Regels aanmaken/bewerken/verwijderen
- Echte data ipv hardcoded tabel

### 3E. Outreach Sequences
- CRUD voor `outreach_sequences` tabel
- Enrollments beheren per contact
- Sequence stappen configureren

---

## Fase 4: Content Kalender

- Verbind met `content_calendar` tabel
- CRUD voor content items
- Filter op platform, status
- Kalender weergave (optioneel)

---

## Fase 5: Communicatie + WhatsApp

- WhatsApp pagina bouwen (nu placeholder)
- Activiteiten timeline component (herbruikbaar voor contacts, deals, projects)
- Notities toevoegen aan contacten/deals

---

## Fase 6: Geavanceerde Features

### 6A. Edge Functions
- `scrape-run`: Apify Actor aansturen (vereist APIFY_API_KEY secret)
- `scrape-callback`: Webhook voor Apify resultaten
- `scrape-process`: Deduplicatie + scoring pipeline
- `scoring-recalculate`: Lead score herberekenen

### 6B. Contracten pagina
- Contracten beheer uit `quotes` tabel (contract type)
- Digitale handtekening flow (toekomstig)

### 6C. Audit Logging
- Automatische audit trail bij mutaties
- Audit log viewer voor admins

---

## Aanbevolen Implementatie Volgorde

| Stap | Wat | Geschatte berichten |
|------|-----|---------------------|
| 1 | Fase 0: Onboarding flow | 2-3 |
| 2 | Fase 1A: Bedrijven pagina | 2-3 |
| 3 | Fase 1B: Pipeline verbinden | 2-3 |
| 4 | Fase 1C: Dashboard verbinden | 2-3 |
| 5 | Fase 1D: Contacten uitbreiden | 2-3 |
| 6 | Fase 2A: Projecten verbinden | 2-3 |
| 7 | Fase 2B: Facturen verbinden | 2-3 |
| 8 | Fase 2C: Offertes pagina | 2-3 |
| 9 | Fase 3A-E: Data Intelligence | 3-5 |
| 10 | Fase 4: Content kalender | 1-2 |
| 11 | Fase 5-6: Geavanceerd | 3-5 |

**Totaal: ~25-35 berichten** om alles stap voor stap uit te werken.

---

## Belangrijke Technische Overwegingen

- **Multi-tenancy**: Elke insert moet `organization_id` bevatten, opgehaald via `organization_members` voor de ingelogde gebruiker
- **RLS**: Alle tabellen hebben al correcte policies; code moet alleen zorgen dat `organization_id` wordt meegegeven bij inserts
- **Herbruikbare patronen**: Het `useContacts.ts` hook-patroon wordt hergebruikt voor alle entiteiten (deals, projects, invoices, etc.)
- **Document nummering**: De `generate_document_number` database functie wordt gebruikt voor projecten, offertes en facturen
- **Type safety**: Na elke schema wijziging worden de Supabase types automatisch bijgewerkt

