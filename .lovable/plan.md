

## Meta Marketing Dashboard — Volledige uitbreiding

Het huidige MetaAdsPage heeft 3 tabs (Overzicht, Campagnes, Leads). Dit wordt uitgebreid naar 6 tabs met volledige CRUD-functionaliteit.

---

### Nieuwe tabs en functionaliteit

**1. Campagnes (uitbreiding)** — Pause/Activate knoppen per campagne via nieuwe `update_campaign_status` action in de edge function (POST naar `/{campaign_id}` met `status` parameter).

**2. Facebook Pagina (nieuw tab)** — Laatste posts met likes/comments tellen. Formulier om nieuwe post te plaatsen via `create_page_post` action.

**3. Leads (uitbreiding)** — Formuliernaam tonen, data uit webhook. Bestaande functionaliteit blijft.

**4. Instagram (nieuw tab)** — Grid van laatste 12 posts met media preview. Publisher: afbeelding uploaden via container + publish flow. Basisinsights (impressions, reach, profile_views) als KPI kaarten.

**5. Messenger / DMs (nieuw tab, conditioneel)** — Inbox met gesprekken via page conversations API. Gesprek openen en reageren. Alleen zichtbaar als `pages_messaging` scope beschikbaar is (check `granted_scopes` in `meta_config`).

---

### Edge function uitbreidingen (`connect-meta-api`)

Nieuwe actions:

| Action | Method | Doel |
|--------|--------|------|
| `update_campaign_status` | POST `/{campaign_id}` | Campagne pauzeren/activeren |
| `create_page_post` | POST `/{page_id}/feed` | Nieuwe Facebook post |
| `instagram_insights` | GET `/{ig_id}/insights` | IG basisstatistieken |
| `instagram_publish` | POST `/{ig_id}/media` + `/media_publish` | IG post publiceren |
| `conversations` | GET `/{page_id}/conversations` | Messenger inbox |
| `send_message` | POST `/{page_id}/messages` | Messenger antwoord |

Alle actions gebruiken de juiste token: `page_access_token` voor Pages/Messenger, `user_access_token` voor Ads/Instagram.

Token-expiry check: bij elke API call die een `OAuthException` error code 190 teruggeeft, toon een duidelijke "Token verlopen" melding met link naar instellingen.

---

### Frontend architectuur

`MetaAdsPage.tsx` wordt opgesplitst in subcomponenten:

| Component | Tab |
|-----------|-----|
| `InsightsPanel` | Overzicht (bestaand) |
| `CampaignsPanel` | Campagnes (uitgebreid met pause/activate) |
| `FacebookPanel` | Facebook Pagina (nieuw) |
| `InstagramPanel` | Instagram (nieuw) |
| `LeadsPanel` | Leads (bestaand) |
| `MessengerPanel` | Berichten (nieuw, conditioneel) |

Tabs worden conditioneel getoond op basis van de gekoppelde assets:
- Facebook tab: alleen als `page_id` ingesteld
- Instagram tab: alleen als `instagram_account_id` ingesteld
- Messenger tab: alleen als `page_id` + `granted_scopes` bevat `pages_messaging`
- Ads tabs: alleen als `ad_account_id` ingesteld

---

### Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/connect-meta-api/index.ts` | 6 nieuwe actions toevoegen |
| `src/pages/MetaAdsPage.tsx` | Uitbreiden met 3 nieuwe tabs + conditionele weergave + token-error handling |

Geen database-migraties nodig — alle data komt direct van de Meta Graph API.

