

# WhatsApp Integratie - Analyse & Fix Plan

## Gevonden Problemen

### 1. Build Errors (blokkeren deployment)

**A. AutomationsPage.tsx (2 fouten)**
- Lijn 89: `data as Automation[]` cast faalt omdat de DB-kolommen `trigger_config` (Json), `variable_mappings` (Json) niet overeenkomen met de interface `Automation` die `conditions` en `variable_mapping` verwacht. De DB-tabel heeft `variable_mappings` (meervoud) maar de interface gebruikt `variable_mapping` (enkelvoud), en de DB heeft geen `conditions` kolom.

**B. useContracts.ts (2 fouten)**
- Lijn 101, 156: `.insert({...contract, organization_id: ...})` wordt getypt als een enkel object, maar Supabase verwacht een array overload. Fix: cast met `as any` of type de parameter correct.

**C. useEmailAgent.ts (1 fout)**
- Lijn 93: `item` wordt toegewezen als `EmailInboxItem` maar de select-query retourneert slechts 9 velden terwijl `EmailInboxItem` veel meer properties verwacht.

**D. useGmailThreads.ts (1 fout)**
- Lijn 82: `as EmailThread[]` cast faalt omdat de DB-kolommen niet overeenkomen met de `EmailThread` interface (missende velden als `sender_name`, `sender_email`, etc.).

**E. useKnowledgeBase.ts (1 fout)**
- Lijn 34: Join `profiles:uploaded_by(full_name)` faalt — Supabase kan de relatie niet vinden. Fix: verwijder de join of gebruik een expliciete foreign key hint.

**F. useWebhooks.ts (1 fout)**
- Lijn 79: Zelfde insert-typing probleem als useContracts.

**G. Edge Function type resolution**
- `npm:openai@^4.52.5` kan niet gevonden worden in Deno. Dit blokkeert de gehele edge function deployment. Een `deno.json` of `import_map.json` moet aangepast worden, of de import moet verwijderd/gefixt worden.

### 2. WhatsApp-specifieke Bugs

**A. Ontbrekende actions in `whatsapp-send` (KRITIEK)**
- `ChatToolbar.tsx` roept `send_image`, `send_document`, `send_list`, en `send_cta_url` aan, maar `whatsapp-send/index.ts` kent alleen `send_message` en `send_buttons`. Alle bijlage-, lijst- en link-functionaliteit is dus **volledig kapot**.

**B. Unread count logica is onnauwkeurig**
- `useWhatsAppConversations` telt unread berichten op basis van positie t.o.v. het laatste outbound bericht, maar dit werkt niet correct wanneer er meerdere inbound berichten na het laatste outbound zijn — het telt dan ook oude berichten.

**C. 24-uurs servicevenster logica heeft een edge case**
- `ChatWindow.tsx` lijn 78: `isNewConversation` is `true` als er geen outbound berichten zijn, zelfs als de klant al meerdere berichten heeft gestuurd. Dit blokkeert onnodig de vrije tekstinvoer wanneer er wél een actief servicevenster is (er zijn inbound berichten < 24u). De `requiresTemplate` check (lijn 89) corrigeert dit deels via `hasActiveWindow`, maar de logica is verwarrend en kan edge cases missen.

**D. `template_language` default naar `"nl"`**
- In `whatsapp-send` lijn 195: als geen `template_language` wordt meegegeven, wordt `"nl"` gebruikt. Bij Engelstalige templates faalt dit stil.

### 3. Kleinere Problemen

- **Mark-as-read** wordt bij elke render van de chat getriggerd i.p.v. eenmalig — `useEffect` dependency `[messages, phoneNumber]` zorgt voor herhaalde calls.
- **500 berichten limiet** in conversatielijst — bij veel gesprekken worden oude conversaties niet getoond.
- **`send_buttons` re-invokes zichzelf** via HTTP fetch (lijn 383-392) — werkt maar is inefficiënt en kan timeout-issues veroorzaken.

---

## Fix Plan

### Stap 1: Build errors fixen (alle 8 TypeScript fouten)
- **AutomationsPage.tsx**: Fix de `Automation` interface om te matchen met DB-kolommen (`variable_mappings` i.p.v. `variable_mapping`, geen `conditions`), of cast via `unknown`.
- **useContracts.ts**, **useWebhooks.ts**: Fix insert typing met expliciete type casts.
- **useEmailAgent.ts**: Verklein de `EmailInboxItem` type of cast de query data via `unknown`.
- **useGmailThreads.ts**: Fix `EmailThread` interface of cast via `unknown`.
- **useKnowledgeBase.ts**: Verwijder de `profiles:uploaded_by` join of fix met een correcte foreign key referentie.
- **Edge function openai import**: Zoek de bron van de `npm:openai` import en fix/verwijder het.

### Stap 2: Ontbrekende WhatsApp send actions toevoegen
- Voeg `send_image`, `send_document`, `send_list`, `send_cta_url` actions toe aan `whatsapp-send/index.ts` die intern doorverwijzen naar de bestaande `send_message` logica met de juiste parameters (image, document, interactive list, interactive cta_url).

### Stap 3: Kleinere fixes
- Fix mark-as-read om slechts eenmaal per conversatie-opening te triggeren.
- Refactor `send_buttons` om intern de logica aan te roepen i.p.v. zichzelf via HTTP.
- Fix de 24-uurs venster logica zodat `requiresTemplate` alleen `true` is als er écht geen actief servicevenster is.

### Stap 4: Deploy & Test
- Deploy `whatsapp-send` edge function.
- Test bijlagen, knoppen, lijsten, CTA-links, en template-verzending.

---

## Technische Details

**Bestanden die aangepast worden:**
- `supabase/functions/whatsapp-send/index.ts` — 4 nieuwe action handlers + refactor send_buttons
- `src/components/whatsapp/AutomationsPage.tsx` — interface + type cast fix
- `src/components/whatsapp/ChatWindow.tsx` — mark-as-read + servicevenster fix
- `src/hooks/useContracts.ts` — insert type fix
- `src/hooks/useEmailAgent.ts` — type cast fix
- `src/hooks/useGmailThreads.ts` — type cast fix
- `src/hooks/useKnowledgeBase.ts` — join fix
- `src/hooks/useWebhooks.ts` — insert type fix
- Edge function import fix (need to locate the openai import)

