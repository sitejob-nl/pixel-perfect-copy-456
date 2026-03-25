

## Fixes voor AI Email Agent integratie

Er zijn twee problemen gevonden:

### Probleem 1: Drafts worden niet getoond
De `email_inbox` records hebben `draft_status = 'none'` terwijl er wél een `draft_body` aanwezig is. Het CRM panel checkt op `draft_status === "pending"` — dus de draft wordt nooit zichtbaar.

**Oorzaak**: De edge function zet `draft_status: 'none'` bij het opslaan, ook wanneer er een draft is gegenereerd.

**Fix**: In `supabase/functions/email-agent/index.ts`, de logica aanpassen zodat `draft_status` op `'pending'` wordt gezet wanneer `draft_body` niet null is.

Daarnaast: een database migration om de bestaande records te fixen:
```sql
UPDATE email_inbox SET draft_status = 'pending' WHERE draft_body IS NOT NULL AND draft_status = 'none';
```

### Probleem 2: Categorie-filters matchen niet met AI output
De ThreadList filter-knoppen gebruiken: `lead, offerte, support, project, factuur, overig`
Maar de AI classificeert als: `lead, reclame, intern, spam, klant`

**Fix**: De categorie-lijst in `ThreadList.tsx` aanpassen naar de werkelijke AI-categorieën, plus een "reclame" en "intern" optie toevoegen.

---

### Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/email-agent/index.ts` | `draft_status` → `'pending'` als draft_body bestaat |
| `supabase/migrations/xxx.sql` | Bestaande records fixen |
| `src/components/gmail/ThreadList.tsx` | Categorieën aanpassen naar werkelijke AI output |

