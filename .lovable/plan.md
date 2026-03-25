

## Integreer AI Email Agent in de Gmail pagina

De aparte `/email-agent` pagina wordt verwijderd. Alle AI-functionaliteit (classificatie, samenvatting, drafts) wordt geïntegreerd in de bestaande Gmail-pagina.

---

### Wat verandert er

1. **ThreadList**: AI-samenvatting en sentiment badge tonen per thread (data uit `email_inbox` koppelen op `gmail_thread_id`)
2. **CrmContextPanel**: AI samenvatting + draft review (goedkeuren/afwijzen/aanpassen) toevoegen onder de bestaande suggesties
3. **GmailPage header**: "AI Sync" knop toevoegen naast de bestaande Sync knop (roept `process-manual` aan op `email-agent`)
4. **Sidebar**: `email-agent` nav-item verwijderen — Gmail is nu de enige inbox
5. **Route + page verwijderen**: `/email-agent` route uit App.tsx, `EmailAgentPage.tsx` kan blijven als unused file of verwijderd worden

---

### Technische details

**Nieuw: `useEmailInboxByThread` hook** — haalt `email_inbox` records op voor de geselecteerde thread (match op `gmail_thread_id`). Retourneert AI summary, category, sentiment, action, en draft info.

**ThreadList wijzigingen:**
- Voeg een `useEmailInbox` query toe die alle inbox items ophaalt (of een view/join)
- Toon `ai_summary` als extra regel onder de snippet (truncated, met 🤖 icoon)
- Toon `ai_sentiment` badge (urgent = rood, negatief = oranje) naast de category badge

**CrmContextPanel wijzigingen:**
- Nieuw blok "AI Analyse" boven de suggesties:
  - AI samenvatting
  - Categorie + sentiment badges
  - Actie label (reply_needed, fyi_only, etc.)
- Nieuw blok "Concept-antwoord" (als `draft_body` bestaat):
  - Draft tekst tonen
  - Goedkeuren + Afwijzen knoppen (hergebruikt `useSendDraft` / `useRejectDraft` uit `useEmailAgent.ts`)

**GmailPage wijzigingen:**
- Import `useProcessManual` uit `useEmailAgent`
- Extra "🤖 AI Sync" knop in de header die `processManual.mutateAsync()` aanroept

**ErpSidebar:**
- Verwijder `{ k: "email-agent", l: "AI Email", i: "Bot", dot: true }` uit de nav items
- Verwijder de module mapping `"email-agent": "mod_gmail"`

**App.tsx:**
- Verwijder de `<Route path="email-agent" ...>` regel

---

### Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/components/gmail/ThreadList.tsx` | AI summary + sentiment badge per thread |
| `src/components/gmail/CrmContextPanel.tsx` | AI analyse blok + draft review blok |
| `src/pages/GmailPage.tsx` | AI Sync knop, hook import |
| `src/components/erp/ErpSidebar.tsx` | email-agent nav item verwijderen |
| `src/App.tsx` | email-agent route verwijderen |
| `src/hooks/useEmailAgent.ts` | Behouden (hooks worden hergebruikt) |

