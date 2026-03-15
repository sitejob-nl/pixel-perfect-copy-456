

## Plan: Platform Type Selectie uit Database

### Wat verandert

De tabel `demo_platform_types` bestaat al met 11 types (website, webshop, landing, erp, crm, portal, werkbon, planning, hrm, boekhouding, reservering). Geen migratie nodig.

### 1. Refactor `DemoTypeSelector.tsx`

- Verwijder hardcoded `DEMO_TYPES` array
- Fetch types uit `demo_platform_types` via `useQuery`
- Groepeer per `categorie` met headers: **Websites** / **Platforms** / **Portalen**
- Categorie-specifieke iconen en kleuren:
  - `website`: Globe icon, blauwe accent
  - `platform`: Zap icon, paarse accent
  - `portal`: Shield icon, groene accent
- Props uitbreiden: naast `onChange(id)` ook een `onTypeData(type)` callback zodat de wizard toegang heeft tot `default_pages`
- Selected card krijgt accent border + ring (bestaande styling behouden)

### 2. Update `DemoWizard.tsx`

- **Nieuw state**: `selectedTypeData` om het volledige platform type object bij te houden (inclusief `default_pages`)
- **Effect bij type wissel**: wanneer `demoType` verandert, reset `pages` state naar `selectedTypeData.default_pages` (elk met `enabled: true`)
- **Info banner**: voor platform/portal types een muted banner tonen:
  > "Dit genereert een applicatie-dashboard met sidebar navigatie, niet een publieke website."
- **Generate call**: `demoType` wordt al correct meegestuurd als `demo_type`, geen wijziging nodig daar
- Verwijder `DEFAULT_PAGES` constante — defaults komen nu uit de database

### 3. Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/components/demos/DemoTypeSelector.tsx` | Herschrijven: fetch uit DB, groeperen per categorie |
| `src/components/demos/DemoWizard.tsx` | Wire type selectie → reset pages uit `default_pages`, info banner |

