

## Probleem

1. **PDF pagina's zijn afgesneden** — De `PDFFieldEditor` zit in een container van `h-[400px]`, maar PDF-pagina's (gerenderd als rasterafbeeldingen op `scale: 1.5`) zijn veel hoger. De pagina scrolt niet mee, waardoor je de onderkant niet kunt zien.
2. **Rasterafbeeldingen i.p.v. PDF** — Elke PDF-pagina wordt nu als PNG gerenderd via canvas (`toDataURL("image/png")`). Dit is onnodig zwaar en geeft een waziger resultaat. We kunnen in plaats daarvan `<canvas>` elementen direct renderen met pdfjs-dist, of beter: een embedded PDF viewer gebruiken.

## Plan

### 1. PDF viewer i.p.v. rasterafbeeldingen

**Aanpak**: Gebruik een `<iframe>` of `<object>` met de PDF URL direct, zodat de browser's ingebouwde PDF viewer wordt gebruikt. Echter, dit maakt het onmogelijk om velden eroverheen te draggen.

**Betere aanpak**: Behoud pdfjs-dist rendering maar render op een `<canvas>` element in de DOM i.p.v. `toDataURL()`. Dit geeft scherpe rendering en betere performance.

- In `handlePdfUpload`: sla het `ArrayBuffer` op in state i.p.v. base64 images
- In `PDFFieldEditor`: accepteer een `pdfData: ArrayBuffer` prop naast `pages`
- Render elke pagina live op een `<canvas>` in de component met pdfjs-dist
- Hierdoor hoeven we geen grote base64 strings in memory te houden

**Pragmatischer alternatief** (minder werk, groot effect): Behoud de huidige image-aanpak maar render op hogere scale (2.0) en maak de container scrollbaar. Dit lost het directe probleem op met minimale wijzigingen.

### 2. Scrollbare PDF container

- `PDFFieldEditor`: verander de container van `overflow-hidden` naar `overflow-y-auto` met een `max-h` zodat je kunt scrollen
- De parent `h-[400px]` in `ContractsPage.tsx` verhogen naar `h-[600px]` of `max-h-[60vh]`
- Elk page-image moet zijn volledige hoogte kunnen tonen

### 3. Concrete wijzigingen

**`src/components/contracts/PDFFieldEditor.tsx`**:
- Container div: `overflow-hidden` → `overflow-y-auto`
- Image: voeg `w-full h-auto` toe zodat de hele pagina zichtbaar is
- Velden overlay moet relatief t.o.v. de image wrapper blijven (inner wrapper nodig)

**`src/pages/ContractsPage.tsx`**:
- `h-[400px]` → `h-[60vh]` voor de field editor container
- Optioneel: verhoog render scale van 1.5 naar 2.0 voor scherpere weergave

De overlay-velden moeten correct gepositioneerd blijven bij scrollen — dit vereist dat de `relative` container om de image + fields heen zit, niet om de scroll-container.

