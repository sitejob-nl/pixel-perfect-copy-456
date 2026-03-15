

## Probleem

De data laat zien dat vb&t **wel** een demo heeft (`demo_id` en `demo_url` zijn gevuld), maar:

1. **Status is vastgelopen op `demo_building`** -- zou `demo_ready` moeten zijn nu de demo klaar is
2. **In de leadlijst is geen directe demo-indicator** zichtbaar -- je moet de lead eerst uitklappen om de "Bekijk demo" link te zien
3. **De demo link wijst naar `https://app.sitejob.nl/demo/...`** wat een externe URL is, niet de preview app

## Plan

### 1. Data fix: status van vb&t updaten naar `demo_ready`
- Via de insert tool de `prospect_leads` rij voor vb&t (id: `4a0a9d4c-...`) updaten: `status = 'demo_ready'`, `demo_built_at = now()`
- Dit zorgt dat de lead in de juiste tab verschijnt

### 2. UI: Demo-indicator in de leadrij zichtbaar maken (zonder uitklappen)
In `ProspectPoolDetailPage.tsx`, naast de bestaande "Demo bekeken" badge (regel 76), een **"Demo klaar"** badge tonen wanneer `demo_url` aanwezig is maar nog niet bekeken:

```
{lead.demo_url && !lead.demo_viewed_at && (
  <span className="text-[10px] bg-green-500/10 text-green-500 font-semibold px-1.5 py-0.5 rounded">
    ✅ Demo klaar
  </span>
)}
```

### 3. UI: Demo-link ook in compact view tonen
Voeg een kleine "Bekijk" knop toe rechts in de leadrij (naast de status badge) zodat je de demo direct kunt openen zonder eerst uit te klappen:

```
{lead.demo_url && (
  <a href={lead.demo_url} target="_blank" onClick={e => e.stopPropagation()}
     className="text-[11px] text-erp-blue hover:underline flex items-center gap-1">
    <Eye className="w-3 h-3" /> Demo
  </a>
)}
```

### 4. UI: Loading indicator bij `demo_building` status
In het expanded detail-blok, wanneer `status === "demo_building"` en er nog geen `demo_url` is, een spinner tonen:

```
{lead.status === "demo_building" && !lead.demo_url && (
  <div className="bg-erp-bg3 rounded-lg p-3 flex items-center gap-2">
    <Loader2 className="w-4 h-4 animate-spin text-erp-blue" />
    <span className="text-[12px] text-erp-text2">Demo wordt gebouwd...</span>
  </div>
)}
```

### Bestanden
- `src/pages/ProspectPoolDetailPage.tsx` -- UI aanpassingen (badges, direct link, loading state)
- Data update via SQL insert tool voor de vb&t lead

