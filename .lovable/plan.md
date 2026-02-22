

# Fix AI Agent: Resultaten zichtbaar maken na MCP tool calls

## Diagnose

De database bevat je laatste sessie ("Scrape de Instagram van @nike") maar het assistant-antwoord is slechts: *"Ik ga de Instagram van @nike voor je scrapen..."* -- gevolgd door de tool als "done", maar zonder daadwerkelijke scrape-resultaten.

**Oorzaak:** Na de MCP tool call moet de Apify Instagram scraper een actor starten, pagina's scrapen, en resultaten terug sturen via het MCP protocol. Dit kan 1-3 minuten duren. Daarna moet Claude de resultaten samenvatten in een nieuw text block. De Supabase Edge Function heeft een standaard timeout van ~150 seconden, maar de hele keten (Apify actor run + MCP communicatie + Claude samenvatting) kan deze limiet overschrijden, waardoor de stream halverwege wordt afgekapt. Het eerdere "fallback" bericht treedt dan in werking.

## Stap 1: Betere streaming timeout handling in de Edge Function

De edge function stuurt momenteel de stream gewoon door. We verbeteren dit door:
- Een expliciete keep-alive heartbeat niet nodig (de stream is al SSE)
- Maar we moeten zorgen dat de edge function niet vroegtijdig stopt

In `supabase/config.toml` de wall clock timeout verhogen:

```toml
[functions.ai-agent]
verify_jwt = false
```

Helaas kan de wall_clock niet in config.toml worden ingesteld voor Supabase hosted functions (max is ~150s automatisch). 

**Alternatieve aanpak:** De edge function moet de Anthropic response volledig doorsturen en niet bufferen. Dit werkt al correct. Het probleem zit dan in de **client-side parsing** of in een **stilte-timeout** in de browser `fetch()`.

## Stap 2: Client-side timeout en reconnect verbeteren

In `AIAgentPage.tsx`:

- Verwijder eventuele impliciete timeouts op de fetch call
- Voeg een `AbortController` toe met een langere timeout (5 minuten) zodat de browser de verbinding niet voortijdig verbreekt
- Voeg visuele feedback toe tijdens lange MCP tool runs ("Tool draait... dit kan 1-2 minuten duren")

## Stap 3: Logging toevoegen aan de streaming parser

Tijdelijk `console.log` statements toevoegen in de event parser om exact te zien welke events binnenkomen en waar de stream stopt. Dit helpt bij het debuggen:

- Log elk `content_block_start` event met type
- Log elke `content_block_delta` met type en lengte
- Log `message_stop` en `message_delta` events
- Log wanneer de stream `done` is

## Stap 4: Edge Function - response passthrough verbeteren

In `supabase/functions/ai-agent/index.ts`:
- Voeg logging toe om te zien hoelang de Anthropic call duurt
- Log wanneer de response stream begint en eindigt
- Zorg ervoor dat de response headers correct zijn voor lange streams

## Technische Details

**Gewijzigde bestanden:**
- `supabase/functions/ai-agent/index.ts` (logging + timeout awareness)
- `src/pages/AIAgentPage.tsx` (AbortController met 5 min timeout + debug logging + betere UX voor lange tool runs)

**Geen database wijzigingen nodig** -- de tabel en hook werken al correct.

**Volgorde:** Stap 3 en 4 tegelijk (logging), dan Stap 2 (client fixes), dan testen.
