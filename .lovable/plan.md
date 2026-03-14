

## WhatsApp Module: Verbeteringen uit referentieproject

De geüploade bestanden bevatten een werkend WhatsApp-systeem uit een ander project met functies die ontbreken of beter werken dan de huidige implementatie. Hier is wat we kunnen overnemen, aangepast aan de huidige architectuur (die `whatsapp_accounts` + org-based RLS gebruikt i.p.v. `whatsapp_config`).

---

### 1. Nieuwe edge function: `whatsapp-business-profile`

Aparte edge function (i.p.v. alles in `whatsapp-send`) voor profiel-beheer. Gebaseerd op `index_12.ts`:
- **GET profile** — haalt about, address, description, email, websites, vertical, profile_picture_url op
- **UPDATE profile** — text-velden bijwerken
- **UPLOAD photo** — 3-staps Resumable Upload API (create session → upload binary → set handle)

Dit lost het foto-upload probleem op doordat het een schone, dedicated function is die niet door de complexe auth/routing van `whatsapp-send` hoeft.

### 2. Nieuwe edge function: `whatsapp-phone-quality`

Gebaseerd op `index_14.ts`. Haalt op:
- `quality_rating` (GREEN/YELLOW/RED)
- `verified_name`
- `code_verification_status`
- `display_phone_number`

### 3. Nieuwe edge function: `whatsapp-mark-read`

Gebaseerd op `index_13.ts`. Twee acties:
- **Mark as read** — stuurt `status: "read"` naar Meta + update lokale DB
- **React** — stuurt emoji-reactie op een bericht (vereist `wa_message_id` → lookup via `whatsapp_msg_id` kolom)

### 4. `whatsapp-send` uitbreiden

Uit `index_15.ts` overnemen:
- **Telefoonnummer normalisatie** — strip +, 00→ internationaal, 0→ 31-prefix
- **Interactive messages** — button, list, cta_url support in Meta API formaat
- **Context replies** — `context_message_id` voor reply-to functionaliteit
- **Image/document sending** — `media_url` + `media_caption` directe Meta API calls

### 5. `WhatsAppSettings.tsx` vervangen

De geüploade `WhatsAppSettings.tsx` is veel uitgebreider. Overnemen:
- **Telefoonnummer Kwaliteit sectie** — via nieuwe `whatsapp-phone-quality` function
- **Berichtstatistieken** — verzonden/ontvangen/afgeleverd/gelezen + per-dag grafiek (Recharts BarChart) met 7d/30d/90d filters
- **Bedrijfsprofiel beheer** — via nieuwe `whatsapp-business-profile` function (inclusief werkende foto-upload)
- **Template management** — status-filters (Alle/Goedgekeurd/Afwachting/Afgewezen), variabelen-mapping per template met opslag in localStorage, template aanmaken met voorbeeld-waarden, verwijderen
- **Verbindingsstatus** — WABA ID, Phone Number ID, Tenant ID weergave + ontkoppelen

Aangepast aan huidige architectuur: `whatsapp_accounts` i.p.v. `whatsapp_config`, org-based queries.

### 6. `AutomationsPage` vereenvoudigen

De geüploade `WhatsAppAutomations.tsx` gebruikt directe Supabase queries i.p.v. een edge function. Overnemen:
- Direct CRUD op `whatsapp_automations` tabel
- Template variabelen mappen naar CRM-velden (contact/deal data)
- Trigger types: lead_created, status_changed, callback_reminder, inactivity
- Pipeline/klanttype condities

### Bestanden overzicht

| Actie | Bestand |
|---|---|
| Nieuw | `supabase/functions/whatsapp-business-profile/index.ts` |
| Nieuw | `supabase/functions/whatsapp-phone-quality/index.ts` |
| Nieuw | `supabase/functions/whatsapp-mark-read/index.ts` |
| Wijzigen | `supabase/functions/whatsapp-send/index.ts` — interactive + context + normalisatie |
| Wijzigen | `src/components/erp/WhatsAppSettings.tsx` — volledige vervanging |
| Wijzigen | `src/components/whatsapp/ProfileSettings.tsx` — gebruik nieuwe business-profile function |
| Wijzigen | `src/components/whatsapp/AutomationsPage.tsx` — vereenvoudigen met directe DB queries |
| Wijzigen | `src/components/whatsapp/ChatWindow.tsx` — mark-as-read bij openen chat |
| Wijzigen | `supabase/config.toml` — registreer nieuwe functions |

### Geen database migraties nodig

Alle benodigde tabellen en kolommen bestaan al (`whatsapp_accounts`, `whatsapp_messages`, `whatsapp_automations`).

