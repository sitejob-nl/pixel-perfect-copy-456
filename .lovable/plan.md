

## API-koppelingen: ontbrekende edge functions bouwen

De webhooks-pagina, database-tabellen en frontend zijn al volledig aanwezig. Wat ontbreekt zijn de twee edge functions die het systeem werkend maken:

1. **`webhook-receiver`** — ontvangt inbound POST requests van externe systemen
2. **`manage-webhooks`** — beheert API keys en voert test-mappings uit

---

### 1. Edge Function: `webhook-receiver`

**Pad**: `supabase/functions/webhook-receiver/index.ts`

Wat het doet:
- Accepteert POST requests met `X-API-Key` header
- Zoekt het bijbehorende endpoint op via gehashte API key
- Past de geconfigureerde field mappings toe (source_path → target_field)
- Voert transforms uit (lowercase, split_first, phone_nl, etc.)
- Deduplicatie-check op basis van `dedup_field` + `dedup_action`
- Insert/update in de juiste target_table (contacts, companies, deals, raw_leads)
- Logt alles in `webhook_logs` (payload, mapped_data, status, processing_time)
- Werkt endpoint statistieken bij (total_received, total_processed, total_failed, last_received_at)

Beveiligingsregels:
- Geen JWT vereist (externe systemen sturen geen Supabase auth)
- API key verificatie via bcrypt hash vergelijking
- Validatie van alle input
- Service role client voor database operaties

### 2. Edge Function: `manage-webhooks`

**Pad**: `supabase/functions/manage-webhooks/index.ts`

Twee acties (achter JWT-authenticatie):

**`generate_api_key`**:
- Genereert een random API key
- Slaat bcrypt hash + prefix op in `webhook_endpoints`
- Retourneert de plaintext key (eenmalig)

**`test_webhook`**:
- Leest de `sample_payload` en `field_mappings` van het endpoint
- Voert de mapping dry-run uit
- Retourneert het gemapte resultaat zonder database-insert

---

### Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/webhook-receiver/index.ts` | Nieuw — inbound webhook ontvanger |
| `supabase/functions/manage-webhooks/index.ts` | Nieuw — API key generatie + test mapping |

Geen database-migraties nodig — alle tabellen bestaan al.

