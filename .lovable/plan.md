

# SiteJob Frontend Security & Architecture Fixes

Dit document bevat het volledige plan op basis van het geüploade bestand. Er zijn 5 werkpakketten.

---

## 1. Alle hooks: orgId in queryKey + enabled guard (8 bestanden)

Elk van deze hooks mist `useOrganization()` voor cache-scoping. Fix: importeer `useOrganization`, haal `orgId` op, voeg toe aan `queryKey` en `enabled: !!orgId`.

| Hook | queryKey wordt |
|------|---------------|
| `useContacts.ts` | `["contacts", orgId]` |
| `useDeals.ts` | `["deals", orgId]` + `["pipeline_stages", orgId]` |
| `useCompanies.ts` | `["companies", orgId]` |
| `useProjects.ts` | `["projects", orgId]` |
| `useQuotes.ts` | `["quotes", orgId]` |
| `useInvoices.ts` | `["invoices", orgId]` |
| `useActivities.ts` | `["activities", orgId, ...]` |
| `useDataIntel.ts` | alle queries krijgen orgId |

`useSnelstart.ts`: verwijder `getOrganizationId()` helper + `(supabase as any)` casts, gebruik `useOrganization()`.

---

## 2. DashboardPage: orgId in inline queries

De 4 inline `useQuery` calls in `DashboardPage.tsx` krijgen `orgId` in queryKey + `enabled: !!orgId`.

---

## 3. AIAgentPage: volledige stream parser rewrite

De backend stuurt nu custom SSE events (`text`, `tool_start`, `tool_done`, `done`, `error`) in plaats van Anthropic's native format.

Wijzigingen:
- **Auth header**: vervang `Bearer ${anonKey}` door `Bearer ${session.access_token}` (+ `apikey: anonKey`)
- **System prompt**: update naar nieuwe versie (zonder MCP referenties)
- **Parser**: verwijder alle `content_block_start/delta/stop` + `mcp_tool_use/result` logica. Vervang door simpele SSE event handler per type
- **Cleanup**: verwijder `currentBlockType`, `lastToolName`, `toolResults` state, 5-min timeout, Collapsible tool result UI
- **UI teksten**: "MCP" verwijderen uit footer/header teksten
- **ChatMessage interface**: verwijder `toolResults` veld (niet meer nodig)

---

## 4. Plan limiet error handling in Create dialogs (7 bestanden)

In de catch blocks van alle Create dialogs, detecteer "limit reached" in de error message en toon een specifieke toast ("Plan limiet bereikt / Upgrade je plan").

Bestanden: `CreateContactDialog`, `CreateCompanyDialog`, `CreateDealDialog`, `CreateProjectDialog`, `CreateQuoteDialog`, `CreateInvoiceDialog`, `CreateActivityDialog`.

---

## 5. API Keys Settings (nieuw)

### 5a. Nieuwe hook: `src/hooks/useApiKeys.ts`
- `useApiKeyStatus()` — haalt key status op via `manage-api-keys` edge function
- `useSetApiKey()` — slaat een key versleuteld op
- `useVerifyApiKey()` — verifieert een key
- `useDeleteApiKey()` — verwijdert een key

### 5b. SettingsPage uitbreiden
- Nieuwe "API Keys" tab toevoegen
- Per key (Anthropic + Apify): status, input, opslaan/verifiëren/verwijderen knoppen
- Alleen zichtbaar voor owners/admins

### 5c. AIAgentPage: missing-key banner
- Toon waarschuwing als Anthropic key niet ingesteld is

---

## Bestandenlijst (21 bestanden)

**Hooks (orgId fix):** useContacts, useDeals, useCompanies, useProjects, useQuotes, useInvoices, useActivities, useDataIntel, useSnelstart

**Pages:** DashboardPage, AIAgentPage, SettingsPage

**Dialogs:** CreateContactDialog, CreateCompanyDialog, CreateDealDialog, CreateProjectDialog, CreateQuoteDialog, CreateInvoiceDialog, CreateActivityDialog

**Nieuw:** `src/hooks/useApiKeys.ts`

**Interface update:** `src/hooks/useAiChatSessions.ts` (verwijder `toolResults`)

