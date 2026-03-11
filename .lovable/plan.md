

# Snelstart Koppeling Callback Afhandelen

## Probleem

De Snelstart activatie-URL werkt correct en Snelstart stuurt de gebruiker terug naar de app, maar er is **geen code die de callback afhandelt**. Na redirect voegt Snelstart een `koppelSleutel` parameter toe aan de successUrl. Die moet worden opgepikt en opgeslagen in `snelstart_config.koppel_sleutel`, waarna `is_active` op `true` gezet wordt.

De huidige database toont: `koppel_sleutel: null`, `is_active: false` -- de redirect is wel gebeurd maar de sleutel is niet opgeslagen.

## Oplossing (2 bestanden)

### 1. `src/components/erp/SnelstartSettings.tsx` -- Callback handler toevoegen

Voeg een `useEffect` toe die bij mount checkt of de URL een `koppelSleutel` query parameter bevat. Zo ja:
- Sla de sleutel op in `snelstart_config` via `useSaveSnelstartConfig` (voeg `koppel_sleutel` en `is_active: true` toe aan de mutation)
- Verwijder de parameter uit de URL (met `window.history.replaceState`)
- Toon een success toast

### 2. `src/hooks/useSnelstart.ts` -- `useSaveSnelstartConfig` uitbreiden

Voeg `koppel_sleutel` en `is_active` toe als optionele velden in de mutation interface zodat de callback handler ze kan meesturen.

## Technische details

- Snelstart redirect URL format: `{successUrl}?koppelSleutel=xxx`
- De `koppel_sleutel` + `is_active=true` worden via upsert opgeslagen
- Na opslaan wordt de URL opgeschoond en de config query geïnvalideerd

