

# Fix AI Agent: Keep-alive tijdens MCP tool execution

## Probleem (bevestigd door data)

De database toont twee sessies waarin de tool als "done" staat, maar zonder resultaatdata. De edge function respondeerde na 6 seconden (stream-headers), maar daarna pauzeert de stream terwijl Apify de actor draait (30-120 seconden). Tijdens deze stilte stuurt Anthropic geen data, waardoor de verbinding wordt verbroken door een idle timeout (van Supabase edge infra of de browser).

## Oplossing: Keep-alive heartbeat in de Edge Function

De edge function moet een `TransformStream` gebruiken die:
1. De Anthropic response stream doorgeeft
2. Elke 10 seconden een SSE comment (`: heartbeat`) stuurt als er geen data binnenkomt
3. De heartbeat stopt zodra er weer data komt of de stream eindigt

Dit voorkomt dat idle timeouts de verbinding verbreken.

## Stap 1: Edge Function - TransformStream met heartbeat

In `supabase/functions/ai-agent/index.ts`:

```
Huidige flow:
  Client -> Edge Function -> Anthropic (stream passthrough)

Nieuwe flow:
  Client -> Edge Function -> TransformStream (heartbeat) -> Anthropic stream
```

De TransformStream:
- Leest chunks van de Anthropic response body
- Stuurt ze direct door naar de client
- Start een interval timer (elke 10 seconden)
- Als er 10 seconden geen data is geweest, stuurt een `: keepalive\n\n` comment (dit is een geldige SSE comment die door parsers wordt genegeerd)
- Stopt de timer bij stream close

## Stap 2: Client-side parser - heartbeat comments negeren

In `src/pages/AIAgentPage.tsx`:

De SSE parser filtert al op `data: ` prefix, dus `: keepalive` comments worden automatisch genegeerd. Geen wijziging nodig.

Wel toevoegen: een log wanneer de stream eindigt (`reader.read()` geeft `done: true`) zodat we kunnen bevestigen dat de stream volledig is afgerond.

## Stap 3: Verifieer de volledige flow

Na deployment testen met "Scrape de Instagram van @nike" en in de console kijken naar:
- `[AI Stream] content_block_start: text` (initiele tekst)
- `[AI Stream] content_block_start: mcp_tool_use` (tool start)
- `[AI Stream] content_block_start: mcp_tool_result` (tool klaar)
- `[AI Stream] content_block_start: text` (samenvatting met resultaten)
- `[AI Stream] message_stop`

## Technische Details

**Gewijzigde bestanden:**
- `supabase/functions/ai-agent/index.ts` -- TransformStream met 10s heartbeat interval
- `src/pages/AIAgentPage.tsx` -- log toevoegen bij stream end

**Geen database wijzigingen nodig.**

