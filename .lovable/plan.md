

# Snelstart Koppeling — Webhook Ontvanger

## Probleem

Uit de Snelstart documentatie blijkt dat de `KoppelSleutel` **niet** als URL-parameter op de `successUrl` wordt meegegeven. In plaats daarvan stuurt Snelstart een **POST webhook** naar een vooraf geconfigureerde webhook-URL met de body:

```json
{ "KoppelSleutel": "string", "ActionType": "Create"|"Regenerate"|"Delete", "ReferenceKey": "string" }
```

De `ReferenceKey` is wat wij meesturen in de activatie-URL (= `organization_id`). De huidige code die `koppelSleutel` uit de URL probeert te parsen werkt dus nooit.

## Oplossing

### 1. Nieuwe Edge Function: `supabase/functions/snelstart-webhook/index.ts`

Ontvangt de POST van Snelstart:
- Geen JWT verificatie (externe call)
- Parst `KoppelSleutel`, `ActionType`, `ReferenceKey` uit de body
- Bij `ActionType = "Create"` of `"Regenerate"`: upsert `snelstart_config` met `koppel_sleutel` + `is_active = true` waar `organization_id = ReferenceKey`
- Bij `ActionType = "Delete"`: set `koppel_sleutel = null`, `is_active = false`
- Retourneert 200 (vereist door Snelstart, geen retry bij falen)

### 2. `supabase/config.toml` — Registreer de functie

```toml
[functions.snelstart-webhook]
verify_jwt = false
```

### 3. `src/pages/Index.tsx` — Verwijder foutieve callback handler

Verwijder de `useEffect` die `koppelSleutel` uit URL probeert te parsen (regels 43-68), plus de `useSaveSnelstartConfig` import en `useRef` als die niet meer nodig zijn.

Bij terugkomst op `successUrl` tonen we een toast als `?snelstart=activated` in de URL staat (optioneel, simpele UX-bevestiging).

### 4. `src/components/erp/SnelstartSettings.tsx` — Activatie-URL aanpassen

`successUrl` voorzien van `?snelstart=activated` zodat Index.tsx een bevestigingstoast kan tonen na redirect.

De webhook-URL (`https://fuvpmxxihmpustftzvgk.supabase.co/functions/v1/snelstart-webhook`) moet door de partner bij Snelstart worden opgegeven. Toon dit URL in de settings UI zodat de gebruiker weet wat bij Snelstart geconfigureerd moet worden.

## Technische details

- De edge function gebruikt `SUPABASE_SERVICE_ROLE_KEY` om direct in `snelstart_config` te schrijven (geen user context)
- `ReferenceKey` = `organization_id` (UUID), wordt gebruikt als lookup
- Geen extra DB-migratie nodig — `snelstart_config` tabel heeft alle benodigde kolommen

