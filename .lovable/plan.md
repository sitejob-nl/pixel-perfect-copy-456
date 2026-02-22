

# Fix: MCP Tool Resultaten Opvangen en Tonen

## Het echte probleem

De Anthropic API stuurt `mcp_tool_result` content **inline** in het `content_block_start` event, niet via streaming deltas. Het ziet er zo uit:

```text
content_block_start: {
  "type": "mcp_tool_result",
  "content": [
    { "type": "text", "text": "...alle scraped data..." }
  ]
}
```

De huidige parser kijkt alleen naar `content_block_delta` events met `text_delta` -- daardoor worden de tool resultaten volledig genegeerd. De "done" status wordt wel correct gezet, maar de daadwerkelijke data verdwijnt.

Na de tool result stuurt Claude mogelijk een samenvattend text block, maar als dat er niet is (of als het alleen de tool result bevat), dan zie je alleen de initiële tekst.

## Oplossing

### Stap 1: mcp_tool_result content opvangen in de parser

In `src/pages/AIAgentPage.tsx`, bij het `content_block_start` event voor `mcp_tool_result`:
- Lees `event.content_block.content` (een array van content items)
- Extraheer alle text items en sla ze op in een `toolResults` variabele
- Voeg de tool resultaat tekst toe aan het assistant bericht

### Stap 2: Tool resultaten opslaan in het bericht

Voeg een `toolResults` veld toe aan de `ChatMessage` interface in `useAiChatSessions.ts`:
```
toolResults?: { toolName: string; content: string }[];
```

Sla de tool result content op zodat het ook bij herladen zichtbaar is.

### Stap 3: Tool resultaten tonen in de UI

In de message rendering, na de tool use indicators:
- Toon een uitklapbaar "Resultaten" blok per tool
- Gebruik een collapsible/accordion met de tool naam als header
- Render de content als Markdown (scraped data is vaak gestructureerd)
- Beperk de hoogte met een scroll area (max ~300px) omdat scraped data groot kan zijn

### Stap 4: Fallback tekst verbeteren

Als de stream eindigt en `fullText` alleen de initiële tekst bevat maar er WEL `toolResults` zijn:
- Combineer de initiële tekst met een samenvatting: "De tool heeft resultaten opgeleverd (zie hieronder)."
- Toon een "Samenvatten" knop die een follow-up bericht stuurt: "Vat de resultaten van de vorige tool call samen"

## Technische Details

**Gewijzigde bestanden:**
- `src/hooks/useAiChatSessions.ts` -- `toolResults` veld toevoegen aan `ChatMessage` interface
- `src/pages/AIAgentPage.tsx` -- parser aanpassen + UI voor tool resultaten + fallback logica

**Geen database wijzigingen nodig** -- het `messages` veld is JSONB en accepteert het nieuwe veld automatisch.

**Parser wijziging (kern van de fix):**

Bij `content_block_start` met type `mcp_tool_result`:
```
// Huidige code: markeert alleen tool als "done"

// Nieuwe code: ook content extracten
if (block.content && Array.isArray(block.content)) {
  const resultText = block.content
    .filter(c => c.type === "text")
    .map(c => c.text)
    .join("\n");
  // Sla op als toolResult
}
```

**UI weergave:**
- Collapsible sectie onder elke tool indicator
- Header: "Resultaten van [tool-naam]" met chevron
- Body: ScrollArea met Markdown-rendered content
- Standaard ingeklapt als de tekst > 500 karakters is, anders uitgeklapt
