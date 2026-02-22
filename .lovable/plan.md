

# Fix AI Agent: Resultaten Opslaan + Output Correct Tonen

## Twee problemen worden opgelost

**Probleem 1: Output niet zichtbaar na scrape**
De streaming parser in `AIAgentPage.tsx` vangt alleen `text_delta` events op. Maar wanneer Claude MCP tools gebruikt, stuurt Anthropic ook `mcp_tool_result` content blocks met de scrape-resultaten. Deze worden nu genegeerd, waardoor Claude de data wel ontvangt maar de gebruiker alleen de samenvatting ziet -- of helemaal niets als Claude geen tekst-antwoord genereert na de tool call.

De fix: ook `content_block_start` events van type `mcp_tool_result` loggen, en eventuele `text_delta`'s binnen tool result blocks meenemen in de output.

**Probleem 2: Chat verdwijnt bij navigatie**
Alles staat in `useState` -- bij refresh of wegnavigeren is alles weg. Dit wordt opgelost met een `ai_chat_sessions` tabel in de database.

---

## Stap 1: Database tabel `ai_chat_sessions`

Nieuwe migratie:

```sql
CREATE TABLE ai_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Nieuw gesprek',
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org member access" ON ai_chat_sessions
  FOR ALL USING (organization_id IN (SELECT user_organization_ids()));

CREATE POLICY "Service role full access" ON ai_chat_sessions
  FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON ai_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
```

---

## Stap 2: Fix streaming parser voor MCP tool results

In `AIAgentPage.tsx`, de event parser uitbreiden:

- Bij `content_block_start` met type `mcp_tool_result`: markeer de bijbehorende tool als "done"
- Vang ook `input_json_delta` events op (voor tool input weergave)
- Zorg dat na alle tool calls, de tekst-output correct wordt samengevoegd
- Voeg een fallback toe: als na het streamen `fullText` leeg is maar er waren tool uses, toon een melding "Tools uitgevoerd, wacht op samenvatting..."

---

## Stap 3: Hook `useAiChatSessions`

Nieuw bestand: `src/hooks/useAiChatSessions.ts`

- `useAiChatSessions()` -- haalt lijst op van sessies voor huidige org, gesorteerd op updated_at desc
- `useCreateChatSession()` -- maakt nieuwe sessie aan bij eerste bericht
- `useUpdateChatSession()` -- slaat messages array op na elk antwoord
- `useDeleteChatSession()` -- verwijdert een sessie

---

## Stap 4: AIAgentPage.tsx uitbreiden met persistentie + sessie-sidebar

Wijzigingen aan de pagina:

- **Sessie sidebar** (links, smal): lijst van eerdere gesprekken met titel en datum
- **Auto-save**: bij eerste bericht wordt een sessie aangemaakt (titel = eerste 50 tekens). Na elk assistant antwoord wordt de messages array geupdate in de database
- **Sessie laden**: klik op een eerder gesprek om de messages te laden
- **Nieuw gesprek**: reset state en maak een nieuwe sessie aan bij het eerste bericht
- **Sessie verwijderen**: swipe of delete knop per sessie

---

## Technische Details

**Nieuwe bestanden:**
- `src/hooks/useAiChatSessions.ts`

**Gewijzigde bestanden:**
- `src/pages/AIAgentPage.tsx` (streaming parser fix + sessie sidebar + auto-save)

**Database:**
- 1 nieuwe tabel: `ai_chat_sessions`
- 2 RLS policies
- 1 trigger (updated_at)

**Volgorde:** Stap 1 (migratie) dan Stap 2+3+4 (code wijzigingen, parallel)

