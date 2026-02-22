

# AI Agent met Claude + Apify MCP - Implementatieplan

Bouw een AI chat interface in het SiteJob platform die Anthropic's Claude gebruikt met de Apify MCP server. Gebruikers kunnen via een chatvenster opdrachten geven aan Claude, die toegang heeft tot alle geconfigureerde Apify Actors (Google Places, Instagram, LinkedIn, TikTok, YouTube, Facebook, Trustpilot, web scraping, etc.).

---

## Wat er wordt gebouwd

Een nieuwe pagina "AI Agent" in de sidebar onder Intelligence, met:
- Een chat interface (berichten sturen, antwoorden ontvangen)
- Claude als AI backend via Anthropic's Messages API
- Apify MCP server gekoppeld zodat Claude alle scrapers/tools kan gebruiken
- Chat historie per sessie
- Tool-gebruik zichtbaar in de UI (welke Actor wordt aangeroepen, resultaten)

---

## Stap 1: Secrets toevoegen

Twee API keys zijn nodig:
- **ANTHROPIC_API_KEY** - voor Anthropic Messages API calls
- **APIFY_TOKEN** - voor authenticatie bij de Apify MCP server

Deze worden als Supabase secrets opgeslagen en gebruikt in de edge function.

---

## Stap 2: Edge Function - `ai-agent`

**Nieuw bestand:** `supabase/functions/ai-agent/index.ts`

Deze edge function:
- Ontvangt chat berichten van de frontend
- Stuurt ze door naar Anthropic's Messages API (`https://api.anthropic.com/v1/messages`)
- Voegt de Apify MCP server configuratie toe met alle geselecteerde tools:

```text
mcp_servers: [{
  type: "url",
  url: "https://mcp.apify.com/?tools=actors,docs,experimental,runs,storage,apify/rag-web-browser,compass/crawler-google-places,apify/instagram-scraper,apify/website-content-crawler,clockworks/tiktok-scraper,streamers/youtube-scraper,dev_fusion/Linkedin-Profile-Scraper,code_crafter/leads-finder,nikita-sviridenko/trustpilot-reviews-scraper,apify/facebook-ads-scraper,apify/facebook-pages-scraper,apify/facebook-posts-scraper,apify/instagram-profile-scraper,apify/instagram-post-scraper,apify/web-scraper",
  name: "apify",
  authorization_token: APIFY_TOKEN
}]
```

- Gebruikt `anthropic-beta: mcp-client-2025-04-04` header
- Streamt responses terug naar de frontend
- Behoudt conversation history (messages array)

---

## Stap 3: Chat UI Pagina

**Nieuw bestand:** `src/pages/AIAgentPage.tsx`

Chat interface met:
- Berichten lijst (user + assistant) in ERP styling
- Input veld + verzend knop
- Streaming response weergave
- Tool-gebruik indicator (wanneer Claude een Apify Actor aanroept, toon naam + status)
- Laadindicator tijdens verwerking
- Systeem prompt configureerbaar (bijv. "Je bent een data intelligence assistent voor SiteJob...")

---

## Stap 4: Integratie in navigatie

**Wijzigingen:**
- `src/components/erp/ErpSidebar.tsx` - nieuw menu-item "AI Agent" onder Intelligence
- `src/pages/Index.tsx` - route toevoegen voor de nieuwe pagina
- `supabase/config.toml` - nieuwe edge function registreren met `verify_jwt = false`

---

## Technische Details

**Nieuwe bestanden:**
```text
supabase/functions/ai-agent/index.ts
src/pages/AIAgentPage.tsx
```

**Gewijzigde bestanden:**
```text
src/components/erp/ErpSidebar.tsx
src/pages/Index.tsx
supabase/config.toml
```

**Vereiste secrets:**
- `ANTHROPIC_API_KEY` - Anthropic API key (te vinden op console.anthropic.com)
- `APIFY_TOKEN` - Apify API token (te vinden op console.apify.com -> Integrations)

**Architectuur:**
```text
Frontend (chat UI)
    |
    v
Edge Function (ai-agent)
    |
    +---> Anthropic Messages API
              |
              +---> Apify MCP Server
                        |
                        +---> Google Places Crawler
                        +---> Instagram Scraper
                        +---> LinkedIn Scraper
                        +---> Web Scraper
                        +---> ... (alle tools)
```

**Geschatte berichten:** 2-3 om alles te implementeren (secrets, edge function, UI).

