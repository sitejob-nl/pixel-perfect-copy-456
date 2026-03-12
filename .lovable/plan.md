

# Plan: Demo Bouwer Module

## Overzicht
Volledige Demo Bouwer implementeren: hooks, admin pagina met 3 tabs, publieke demo viewer, en 6 sub-componenten. Er is al een `demo-service` edge function op de backend — we bouwen alleen de frontend.

**Opmerking:** De `demo-service` edge function bestaat niet in de repo maar wordt al door de backend gehost. We roepen deze aan via `supabase.functions.invoke("demo-service", ...)`.

## Nieuwe bestanden (9)

### 1. `src/hooks/useDemos.ts`
- `useDemos()` — query demos voor org, met contact relatie
- `useDemo(id)` — single demo met versions
- `useCreateDemo()`, `useUpdateDemo()`, `useDeleteDemo()`, `useDuplicateDemo()`
- `useGenerateDemo()` — mutation → `demo-service { action: "generate" }`
- `useEditDemo()` — mutation → `demo-service { action: "edit" }`
- `useAnalyzeWebsite()` — mutation → `demo-service { action: "analyze" }`
- `usePublicDemo(slug)` — query demo via public_slug (geen auth)
- `useDemoVersions(demoId)` — query demo_versions

### 2. `src/pages/DemosPage.tsx` — Admin pagina met 3 tabs

**Tab "Demo's"**: Grid van demo kaarten met company naam, type badge, views, model badge, publiek/privé toggle, acties (bewerken, preview, kopieer link, verwijderen). + "Upload Demo" knop.

**Tab "Genereren"**: Stap-voor-stap wizard:
1. Input: bedrijfsnaam, website URL (optioneel scan), contact dropdown, demo type grid selector, model keuze
2. Genereren: loading met geschatte tijd
3. Preview + AI Editor: iframe, device switcher, edit instructie, versie historie
4. Delen: publiek toggle, slug, wachtwoord

**Tab "Website Analyse"**: Lijst van website_scrapes met URL, datum, scores. Klik voor detail.

### 3. `src/pages/DemoViewPage.tsx` — Publieke demo viewer
- Geen auth vereist, route: `/demo/:slug`
- Header met logo + bedrijfsnaam
- Tab navigatie voor meerdere demo types
- Device switcher (desktop/tablet/mobiel)
- Iframe met sandbox
- CTA footer
- Wachtwoord gate als password_hash aanwezig
- View tracking (increment `demos.views`)

### 4-9. Componenten (`src/components/demos/`)

| Component | Functie |
|---|---|
| `DemoTypeSelector.tsx` | Grid van 6 klikbare type kaarten (website, dashboard, client_portal, employee_portal, crm, erp) |
| `DemoTypeBadge.tsx` | Kleine gekleurde badge per demo type |
| `DemoPreviewModal.tsx` | Fullscreen modal met iframe, device switcher, download/kopieer/screenshot acties |
| `UploadDemoDialog.tsx` | Dialog met drag & drop HTML upload, bedrijfsnaam, slug, type, wachtwoord |
| `DemoPasswordGate.tsx` | Wachtwoord invoer pagina voor beveiligde demo's |
| `DemoEditor.tsx` | AI edit panel met tekst input, quick actions, versie historie |

## Aanpassingen bestaande bestanden (2)

### `src/App.tsx`
- Import `DemosPage` en `DemoViewPage`
- Vervang `PlaceholderPage` op `demos` route door `<DemosPage />`
- Publieke route toevoegen: `/demo/:slug` → `<DemoViewPage />`

### `supabase/config.toml`
- Geen wijzigingen nodig (demo-service wordt al extern gehost)

## Geen database migraties nodig
Alle tabellen bestaan al.

