

## Analyse: Profielfoto upload

### Wat er aan de hand is

De upload **werkt technisch** — de edge function logs en network response bevestigen:
- Upload session aangemaakt ✓
- Bestand geüpload, handle ontvangen ✓  
- `{"success":true,"handle":"4:TG9n..."}` teruggestuurd ✓

Maar na herlaad-profiel komt er **geen `profile_picture_url`** terug van Meta. Dit heeft twee oorzaken:

### Oorzaak 1: `getClaims()` bestaat niet in supabase-js v2
Regel 31 in `whatsapp-business-profile/index.ts`:
```ts
const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
```
Dit is **geen standaard supabase-js methode**. Het moet `getUser()` zijn. Dit kan intermittent crashen of onbetrouwbaar zijn.

### Oorzaak 2: Meta verwerkt foto's asynchroon
Na het instellen van de `profile_picture_handle` duurt het enkele seconden tot minuten voordat Meta de foto verwerkt en de `profile_picture_url` beschikbaar maakt. De huidige code roept direct `loadProfile()` aan, waardoor de URL nog leeg is.

### Plan

**1. Fix auth in edge function** (`whatsapp-business-profile/index.ts`)
- Vervang `supabase.auth.getClaims(token)` door `supabase.auth.getUser(token)` 
- Gebruik `user.id` in plaats van `claims.claims.sub`

**2. Verbeter UI feedback** (`ProfileSettings.tsx`)
- Na succesvolle upload: toon direct een lokale preview van het geüploade bestand (via `URL.createObjectURL`)
- Toon melding dat het even kan duren voordat de foto zichtbaar is bij ontvangers
- Wacht 3 seconden voor automatische herlaad van het profiel

| Bestand | Wijziging |
|---|---|
| `supabase/functions/whatsapp-business-profile/index.ts` | `getClaims` → `getUser` |
| `src/components/whatsapp/ProfileSettings.tsx` | Lokale preview + vertraagde reload |

