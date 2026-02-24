

# Fix Build Errors: Snelstart Type Mismatches

## Wat er nu is opgezet voor Snelstart

**Database:** De tabellen `snelstart_config`, `snelstart_sync_log`, en `snelstart_entity_map` bestaan in Supabase met RLS policies.

**Frontend:**
- `useSnelstart.ts` — hooks voor config ophalen/opslaan, sync triggeren, sync logs ophalen
- `SnelstartSettings.tsx` — volledige settings UI met API key configuratie, sync knoppen per entity (klanten/facturen/offertes), sync log weergave
- `SettingsPage.tsx` — tabbed settings pagina met Snelstart als apart tabblad

**Edge Function:** Er wordt verwezen naar een `snelstart-sync` edge function (nog niet aanwezig in de codebase).

## Root Cause van de Build Errors

De Supabase types (`src/integrations/supabase/types.ts`) bevatten **geen** definities voor `snelstart_config`, `snelstart_sync_log`, of `snelstart_entity_map`. Daarnaast verwijst `useSnelstart.ts` naar `profiles.organization_id` dat niet bestaat — de org wordt via `organization_members` opgehaald.

## Fix (2 bestanden)

### 1. `src/hooks/useSnelstart.ts` — Fix org lookup + type casts

Vervang de `profiles.organization_id` lookups door de `organization_members` tabel (zoals `useOrganization.ts` al doet). Gebruik `as any` type casts voor de Snelstart tabellen die niet in de gegenereerde types staan, totdat de types worden geregenereerd.

Alle 3 functies (`useSnelstartConfig`, `useSaveSnelstartConfig`, `useSnelstartSyncLog`) gebruiken dezelfde foutieve pattern:
```
// FOUT: profiles heeft geen organization_id
const { data: profile } = await supabase
  .from("profiles")
  .select("organization_id")
  .eq("id", user.id)
  .single();

// FIX: gebruik organization_members
const { data: membership } = await supabase
  .from("organization_members")
  .select("organization_id")
  .eq("user_id", user.id)
  .eq("is_active", true)
  .limit(1)
  .single();
```

Voor de tabellen die niet in types staan, cast naar `any`:
```
const { data, error } = await (supabase as any)
  .from("snelstart_config")
  ...
```

### 2. `src/components/erp/RunScraperDialog.tsx` — Fix Json type access

Regel 26: `selectedSource?.provider_config?.actorId` faalt omdat `provider_config` type `Json` is. Fix met een cast:
```
const providerConfig = selectedSource?.provider_config as Record<string, any> | undefined;
const actorId = providerConfig?.actorId || "";
```

### 3. `src/components/erp/SnelstartSettings.tsx` — Fix config type

De `useSnelstartConfig` hook retourneert nu `any` door de cast, dus de properties (`subscription_key`, `app_short_name`, `is_active`, etc.) worden automatisch geaccepteerd. Geen wijzigingen nodig.

## Bestanden

- `src/hooks/useSnelstart.ts` — organization_members lookup + `as any` casts
- `src/components/erp/RunScraperDialog.tsx` — provider_config type cast

