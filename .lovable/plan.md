
Doel: zorgen dat stap 3 écht reset op typewissel, zodat elk platform type zijn eigen `default_pages` toont i.p.v. dezelfde lijst te houden.

**Wat ik ga bouwen**

1. **Reset-logica verplaatsen naar `DemoWizard` (single source of truth)**
   - In plaats van te vertrouwen op `onTypeData` callback vanuit `DemoTypeSelector`, laat ik `DemoWizard` zelf de geselecteerde type-data bepalen op basis van `demoType`.
   - Daardoor resetten pagina’s altijd wanneer `demoType` verandert, ook als child-callbacks niet afgaan.

2. **Platform types in wizard ophalen en mappen**
   - In `DemoWizard` dezelfde query gebruiken op `demo_platform_types`:
     `id, naam, beschrijving, categorie, default_pages, sort_order`
   - Een lookup maken op `id` zodat `selectedType` direct beschikbaar is bij elke typewissel.

3. **Harde reset bij typewissel**
   - `useEffect` op `[demoType, platformTypes]`:
     - `selectedType = platformTypes.find(t => t.id === demoType)`
     - `setPages(selectedType.default_pages.map(p => ({ ...p, enabled: true })))`
     - fallback naar 4 standaardpagina’s als `default_pages` ontbreekt/leeg is.
   - Hiermee verdwijnt het probleem dat de oude lijst “blijft staan”.

4. **DemoTypeSelector versimpelen**
   - `DemoTypeSelector` alleen laten doen: type tonen + `onChange(id)`.
   - Geen business-logica meer voor pagina-reset in de selector; dat voorkomt state-races.

5. **Generate call ongewijzigd laten (maar valideren)**
   - `demo_type` en `page_config` blijven uit `demoType` + `pages` komen.
   - `page_config` blijft exact `{ slug, title, description }[]` van de ingeschakelde pagina’s.

**Technische details**

- Waarschijnlijke oorzaak nu: reset is afhankelijk van een callbackpad (`onTypeData`) i.p.v. direct van `demoType`-state; daardoor kan de lijst visueel gelijk blijven ondanks type-selectie.
- Ik voeg een kleine normalizer toe zodat elke pagina altijd geldige velden heeft:
  - `slug`: bestaande slug of afgeleid van title
  - `title`: string
  - `description`: string (default `""`)
- Bestaand gedrag blijft behouden: gebruiker kan na reset nog steeds modules aan/uitzetten, titel aanpassen en pagina’s toevoegen.

**Validatie na implementatie**

1. Type wisselen `website -> erp -> crm -> portal` toont telkens andere default lijst.
2. Na handmatige edits en daarna typewissel: lijst reset naar nieuwe type-defaults.
3. Generate-request body bevat:
   - `demo_type` van gekozen type-id
   - `page_config` met exact de zichtbare ingeschakelde modules.
4. End-to-end check in de wizardflow (stap 3 → genereren) op echte data.
