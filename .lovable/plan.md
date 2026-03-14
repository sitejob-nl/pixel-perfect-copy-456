

## Waarom templates niet verschijnen

### Probleem 1: Status-filter wordt lowercase gemaakt
In `whatsapp-templates/index.ts` regel 86:
```ts
if (body.status) url += `&status=${body.status.toLowerCase()}`;
```
De frontend stuurt `status: "APPROVED"` (correct), maar `.toLowerCase()` maakt er `"approved"` van. De Meta Graph API is **case-sensitive** en verwacht `APPROVED` in hoofdletters. Resultaat: 0 templates terug.

### Probleem 2: `whatsapp-send` crasht op auth
In `whatsapp-send/index.ts` regel 43 staat nog steeds `getClaims()` — dezelfde bug die we al in andere functies hebben gefixt. Dit betekent dat zelfs als templates wél zouden laden, het versturen ervan faalt.

### Plan

| Bestand | Wijziging |
|---|---|
| `supabase/functions/whatsapp-templates/index.ts` regel 86 | Verwijder `.toLowerCase()` zodat `APPROVED` uppercase blijft |
| `supabase/functions/whatsapp-send/index.ts` regel 42-51 | Vervang `getClaims()` door `getUser()`, gebruik `user.id` i.p.v. `claims.claims.sub` |

Beide edge functions worden opnieuw gedeployed en getest.

