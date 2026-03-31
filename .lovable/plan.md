

## Ad Creation toevoegen aan Meta Marketing

Volledige CRUD-functionaliteit toevoegen: campagnes, ad sets, ad creatives en ads kunnen aanmaken vanuit het dashboard.

---

### 1. Edge function uitbreiden (`connect-meta-api`)

Vier nieuwe actions toevoegen:

| Action | Endpoint | Beschrijving |
|--------|----------|-------------|
| `create_campaign` | POST `act_{ad_account_id}/campaigns` | Naam, objective, status (default PAUSED) |
| `create_adset` | POST `act_{ad_account_id}/adsets` | campaign_id, naam, daily_budget (euro→centen), targeting (land), optimization_goal |
| `create_adcreative` | POST `act_{ad_account_id}/adcreatives` | object_story_spec met page_id, message, link, afbeelding, CTA |
| `create_ad` | POST `act_{ad_account_id}/ads` | adset_id, creative_id, naam, status |

Budget-invoer in euro's, automatisch naar centen geconverteerd. `ad_account_id` uit `meta_config`.

---

### 2. Hooks toevoegen (`useMetaMarketing.ts`)

Vier nieuwe `useMutation` hooks:
- `useCreateCampaign` — invalidates `meta-campaigns`
- `useCreateAdSet` — invalidates `meta-adsets`
- `useCreateAdCreative` — invalidates `meta-ad-creatives` (nieuw)
- `useCreateAd` — invalidates `meta-ads`

---

### 3. Frontend: Create-dialogen in CampaignsTab

Drie "Nieuw" knoppen op de juiste niveaus van de hiërarchie:

**Campagne-niveau** (bovenaan CampaignsList):
- "Nieuwe campagne" knop → Dialog met: naam, objective (dropdown: LINK_CLICKS, CONVERSIONS, REACH, BRAND_AWARENESS, etc.), status (default PAUSED)

**Ad Set-niveau** (bovenaan AdSetsList):
- "Nieuwe ad set" knop → Dialog met: naam, dagbudget (€), targeting land (dropdown NL/BE/DE/US), optimization_goal

**Ad-niveau** (bovenaan AdsList):
- "Nieuwe advertentie" knop → Wizard-achtige Dialog:
  1. Creative aanmaken: bericht, link URL, afbeelding URL, CTA type (SHOP_NOW, LEARN_MORE, SIGN_UP, etc.)
  2. Ad aanmaken: naam, status
  - Stap 1 maakt de creative aan, stap 2 gebruikt het creative_id om de ad te maken

---

### Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/connect-meta-api/index.ts` | 4 nieuwe actions: create_campaign, create_adset, create_adcreative, create_ad |
| `src/hooks/useMetaMarketing.ts` | 4 nieuwe mutation hooks |
| `src/pages/MetaMarketingPage.tsx` | 3 create-dialogen + knoppen in CampaignsList, AdSetsList, AdsList |

