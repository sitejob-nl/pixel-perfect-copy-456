

## Gemini Model Labels Updaten

De GeminiCard in IntegrationSettings.tsx toont verouderde model-namen ("Gemini 2.5 Pro · Generatie" en "Gemini 2.0 Flash · Analyse"). Deze moeten worden bijgewerkt.

### Wijzigingen

**`src/components/erp/IntegrationSettings.tsx`** (regels 852-857):
- "Gemini 2.5 Pro · Generatie" → "Gemini 3.1 Pro · Generatie"
- "Gemini 2.0 Flash · Analyse" → "Gemini 3 Flash · Analyse"

**`src/components/erp/IntegrationSettings.tsx`** (regel 808) — Test endpoint:
- Update de test-URL van `gemini-2.0-flash:generateContent` naar `gemini-3-flash-preview:generateContent` zodat de test het actuele model verifieert.

**Optioneel** — als je ook de daadwerkelijke AI-modellen wilt upgraden:
- `supabase/functions/ask-sitejob/index.ts`: al up-to-date (`google/gemini-3-flash-preview`)
- `supabase/functions/ai-agent/index.ts`: gebruikt Anthropic Claude, niet Gemini — geen wijziging nodig

