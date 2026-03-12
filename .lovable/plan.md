

## Plan: Leeg contract met content-editor + PDF upload met veldpositionering

### Wat wordt er gebouwd

Twee verbeteringen aan de contract-aanmaak flow:

1. **Leeg contract → content invoeren**: Als je "Leeg contract" selecteert, verschijnt er in stap 2 een HTML-textarea waar je de contractinhoud kunt schrijven (in plaats van alleen variabelen koppelen).

2. **PDF uploaden**: Een derde optie naast "Leeg contract" en templates — "PDF uploaden". Je upload een PDF, die wordt omgezet naar pagina-afbeeldingen, en in stap 3 kun je met de bestaande PDFFieldEditor handtekeningvelden op de juiste plek slepen.

### Technische aanpak

#### 1. ContractsPage.tsx — Step1Templates uitbreiden

Drie opties in het template-selectiescherm:
- **Leeg contract** (bestaand, `templateId = null`)
- **PDF uploaden** (nieuw, `contractMode = "pdf"`)
- **Templates** (bestaand)

Nieuwe state: `contractMode: "template" | "empty" | "pdf"`, `uploadedPdfUrl`, `pdfPageImages: string[]`.

#### 2. ContractsPage.tsx — Step2 aanpassen

- **Als mode = "empty"**: toon een `<textarea>` voor vrije HTML-invoer (de content die als `rendered_html` wordt opgeslagen)
- **Als mode = "pdf"**: toon een bestandsuploader. De PDF wordt geüpload naar de `org-assets` bucket. Vervolgens worden de pagina's gerenderd als afbeeldingen via een canvas (met `pdfjs-dist` library) zodat ze in de PDFFieldEditor getoond kunnen worden.
- **Als mode = "template"**: bestaande variabelen-flow blijft ongewijzigd.

#### 3. PDFFieldEditor.tsx — PDF-pagina's als afbeeldingen ondersteunen

Momenteel rendert de component HTML via `dangerouslySetInnerHTML`. Uitbreiden zodat als een pagina begint met `data:image` of een URL is, het als `<img>` wordt gerenderd in plaats van HTML. Dit maakt hergebruik mogelijk voor zowel HTML-contracten als geüploade PDF's.

#### 4. PDF naar afbeeldingen (client-side)

Gebruik `pdfjs-dist` (nieuwe dependency) om PDF-pagina's client-side naar canvas te renderen en als base64 images om te zetten. Geen server-side verwerking nodig.

#### 5. Contract opslaan

Bij mode "pdf":
- `pdf_url` → URL van de geüploade PDF in `org-assets`
- `signature_fields` → de gepositioneerde velden
- `content` / `rendered_html` → leeg (niet relevant voor PDF-contracten)

Bij mode "empty":
- `content` en `rendered_html` → de ingevoerde HTML-tekst
- Geen `pdf_url`

### Samenvatting wijzigingen

| Bestand | Wijziging |
|---|---|
| `package.json` | `pdfjs-dist` toevoegen |
| `src/pages/ContractsPage.tsx` | Contract-modes, PDF upload, textarea voor leeg contract, aangepaste step-flow |
| `src/components/contracts/PDFFieldEditor.tsx` | Ondersteuning voor image-based pagina's naast HTML |

Geen database-migraties nodig — `pdf_url`, `signature_fields`, `content`, `rendered_html` bestaan al.

