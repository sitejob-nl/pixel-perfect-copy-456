

## AI Email Agent — Implementatieplan

Dit is een groot feature dat in fasen wordt gebouwd. Het document beschrijft een systeem waarbij inkomende Gmail berichten automatisch door AI worden geclassificeerd, gekoppeld aan klanten/projecten, en concept-antwoorden als Gmail drafts worden aangemaakt.

**Belangrijk**: Het document verwijst naar een `clients` tabel, maar jullie database gebruikt `companies` en `contacts`. De SQL en edge function worden hierop aangepast.

---

### Fase 1: Database (migration)

Twee nieuwe tabellen aanmaken:

**`email_inbox`** — elke verwerkte mail
- Gmail metadata (gmail_id, thread_id, from_email, subject, body, etc.)
- AI classificatie (category, confidence, summary, action, sentiment)
- Koppelingen naar `companies` en `projects` (niet `clients`)
- Draft tracking (draft_gmail_id, draft_status, draft_body)
- Review tracking (reviewed_by → profiles, reviewed_at)

**`email_rules`** — bekende patronen voor snelle matching
- match_from/match_subject arrays, koppeling naar company_id, priority
- Seed data voor bekende klanten (Best Security, Abitare, JA Werkt, BRUT, etc.)

RLS: Alleen leden van de organisatie mogen lezen/schrijven. Service role voor de edge function.

---

### Fase 2: Edge Function `email-agent`

Eén edge function die het volledige verwerkingsproces afhandelt:

1. **Gmail Push ontvangen** — Pub/Sub webhook (geen auth nodig voor Google push)
2. **Mail ophalen** — Via bestaande `google_connections` tabel (hergebruikt het OAuth refresh token systeem uit `google-api`)
3. **Regels checken** — Match tegen `email_rules`
4. **AI classificatie** — Claude Sonnet call met context van companies + projects uit de database
5. **Gmail labelen** — Label aanmaken/toewijzen via Gmail API
6. **Draft aanmaken** — Als reply nodig, draft in Gmail thread
7. **Opslaan in `email_inbox`**
8. **Urgente notificatie** — Via Resend als sentiment = urgent

De `callClaude` functie wordt aangepast om `companies` (niet `clients`) als context mee te sturen. Het prompt is al goed beschreven in het document.

---

### Fase 3: ERP Frontend — Email Dashboard pagina

Nieuwe pagina `/email-agent` met:

- **Gefilterde lijsten** per categorie: Urgent, Reply Needed, FYI, Reclame
- **Per email**: afzender, onderwerp, AI samenvatting, gekoppelde company/project
- **Draft acties**: Bekijk draft, Goedkeuren (stuurt draft via edge function), Aanpassen (opent Gmail), Afwijzen (verwijdert draft)
- **Sidebar navigatie**: Nieuw item "AI Email" onder Communicatie sectie

De "Goedkeuren" actie roept een nieuwe `send-draft` action aan op de edge function die `drafts.send` aanroept via de Gmail API.

---

### Fase 3b: Extra edge function actions

Toevoegen aan `email-agent`:
- `action: "send-draft"` — Stuurt een Gmail draft en update `draft_status` naar `sent`
- `action: "reject-draft"` — Verwijdert Gmail draft en update status naar `rejected`
- `action: "list"` — Haalt emails op (fallback als RLS direct query niet werkt)
- `action: "process-manual"` — Handmatig een sync triggeren (Gmail history ophalen)

---

### Benodigde secrets

De edge function heeft nodig (meeste bestaan al):
- `ANTHROPIC_API_KEY` — al aanwezig
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — al aanwezig
- `RESEND_API_KEY` — al aanwezig

Geen nieuwe secrets nodig.

---

### Bestanden

| Bestand | Actie |
|---------|-------|
| `supabase/migrations/xxx_email_agent.sql` | Nieuwe tabellen + seed + RLS |
| `supabase/functions/email-agent/index.ts` | Nieuwe edge function |
| `src/pages/EmailAgentPage.tsx` | Nieuw dashboard |
| `src/hooks/useEmailAgent.ts` | Query hooks voor email_inbox |
| `src/components/erp/ErpSidebar.tsx` | Nav item toevoegen |
| `src/App.tsx` | Route toevoegen |

---

### Setup na implementatie

Jullie moeten nog handmatig:
1. Google Cloud Pub/Sub topic + push subscription naar de edge function URL instellen
2. `gmail.users.watch()` activeren voor info@sitejob.nl
3. De `company_id`'s in `email_rules` koppelen aan de juiste UUIDs

