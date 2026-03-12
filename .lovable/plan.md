
Probleemanalyse (op basis van code + logs)
- De API key opslag werkt nu wel (network toont `manage-api-keys` `success:true` en `organization_api_keys` met `*_key_set: true`).
- Snelstart blijft inactief (`snelstart_config.koppel_sleutel = null`, `is_active = false`).
- Waarschijnlijke hoofdoorzaak: callback verwerking zit nu in `SnelstartSettings.tsx`, maar die component mount alleen als je op pagina `settings` én tab `snelstart` zit. Na redirect land je op `/` (dashboard), dus callback wordt niet verwerkt.
- Extra risico: `successUrl` gebruikt nu volledige `window.location.href` met query (`__lovable_token`), wat callback parsing kwetsbaar maakt bij providers die querys zelf toevoegen.

Implementatieplan
1) Callback-afhandeling verplaatsen naar globale plek (altijd actief)
- Bestand: `src/pages/Index.tsx` (of aparte hook in `src/hooks/useSnelstart.ts` en aanroepen in `Index`).
- Parse `koppelSleutel` bij app-load, onafhankelijk van actieve pagina/tab.
- Bij gevonden sleutel: `snelstart_config` updaten met `koppel_sleutel` + `is_active=true`, query invalidaten, success toast tonen.
- URL opschonen na succesvolle verwerking (`koppelSleutel` verwijderen).

2) Callback parsing robuust maken
- Niet alleen `URLSearchParams.get("koppelSleutel")`, maar ook fallback parsing op de ruwe URL-string voor malformed query-cases.
- Alleen 1x verwerken (guard/ref) om dubbele writes/toasts te voorkomen.

3) Activatie-URL veiliger opbouwen
- Bestand: `src/components/erp/SnelstartSettings.tsx`.
- `successUrl` opbouwen als “schone” URL (geen overbodige query’s van huidige state).
- “Koppel met Snelstart” openen in dezelfde tab (`window.location.assign`) zodat de return-flow logisch is en niet in een losse tab blijft hangen.

4) UX na callback
- Na succesvolle callback automatisch naar settings-context sturen (minimaal toast + eventueel `activePage = settings`).
- Status moet direct “Gekoppeld” tonen na refetch.

5) Kleine stabiliteitsfix (los van redirect, maar zichtbaar in logs)
- Bestand: `src/components/erp/ErpPrimitives.tsx`.
- `ErpButton` omzetten naar `React.forwardRef` om de `Function components cannot be given refs` warning weg te halen.

Technische details
- Geen backend schema wijziging nodig.
- Bestaande `useSaveSnelstartConfig` support voor `koppel_sleutel` en `is_active` blijft gebruikt.
- Query invalidatie: `["snelstart-config"]` blijft centrale refresh-trigger.

Validatie na implementatie
1. Klik “Koppel met Snelstart”.
2. Rond activatie af.
3. Controleer dat app terugkomt, callback verwerkt, toast verschijnt.
4. Controleer `Koppelingsstatus = Gekoppeld` en DB `koppel_sleutel != null`.
5. Controleer dat URL geen `koppelSleutel` meer bevat en console warning over refs weg is.
