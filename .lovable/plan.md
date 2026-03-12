

# Snelstart Sync Edge Function

## Probleem

De `snelstart-sync` edge function bestaat niet, maar wordt wel aangeroepen door de "Test verbinding" en sync knoppen in SnelstartSettings. Dit moet aangemaakt worden.

## Oplossing

### 1. Nieuwe Edge Function: `supabase/functions/snelstart-sync/index.ts`

Acties:
- **`test_connection`**: Roept de Snelstart Echo API aan (`GET https://b2bapi.snelstart.nl/echo/resource`) met de `Ocp-Apim-Subscription-Key` header en `koppelSleutel` header. Retourneert success/fail.
- **`sync_klanten`**, **`sync_facturen`**, **`sync_offertes`**: Placeholder implementatie die de verbinding valideert en een basis sync-structuur biedt. Volledige sync-logica kan later worden uitgebouwd.

Stappen per actie:
1. Authenticeer de gebruiker (JWT)
2. Haal `snelstart_config` op voor de organisatie (subscription_key, koppel_sleutel)
3. Voer de API-call uit naar `b2bapi.snelstart.nl`
4. Log resultaat in `snelstart_sync_log`

### 2. `supabase/config.toml` — Registreer de functie

```toml
[functions.snelstart-sync]
verify_jwt = false
```

### 3. Snelstart B2B API details

- Base URL: `https://b2bapi.snelstart.nl/v2`
- Auth headers: `Ocp-Apim-Subscription-Key` (subscription key) + `Authorization: Bearer {koppelSleutel}`
- Echo test endpoint: `GET https://b2bapi.snelstart.nl/echo/resource`

### Technische details

- De function haalt `subscription_key` en `koppel_sleutel` uit `snelstart_config` via service role
- Test connection: GET naar echo endpoint, controleert op 200 response
- Sync acties: schrijven een log entry in `snelstart_sync_log` met status
- Gebruiker moet ingelogd zijn (JWT check via `getClaims`)

