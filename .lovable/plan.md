

## Probleem: PDF veldpositionering werkt niet correct

### Analyse

Na het bekijken van `PDFFieldEditor.tsx` en de integratie in `ContractsPage.tsx` zijn er meerdere problemen:

1. **Container-sizing mismatch**: De container (`ref={containerRef}`) heeft `width: 'fit-content'` en `position: relative`, maar geen expliciete hoogte. De velden gebruiken `top: ${field.y}%` — percentage `top` is relatief aan de computed height van de parent. Als de afbeelding nog aan het laden is of als de container niet exact de image-afmetingen volgt, kloppen de veldposities niet.

2. **Image-container disconnect**: De `<img>` heeft `max-w-full h-auto`, wat betekent dat de werkelijke afbeeldingshoogte afhangt van de breedte. Maar de container's hoogte is niet gelijk aan de image-hoogte — het kan extra ruimte hebben of juist kleiner zijn door de `h-[70vh]` constraint op de wrapper.

3. **Drag-berekening gebruikt container-dimensies i.p.v. image-dimensies**: Wanneer de container groter of kleiner is dan het zichtbare image, worden velden op verkeerde posities geplaatst.

4. **Geen touch-ondersteuning voor drag**: `onTouchMove`/`onTouchStart` events ontbreken in het useEffect voor window-level drag tracking — alleen `mousemove`/`mouseup` worden afgevangen.

### Plan

**Wijziging 1: PDFFieldEditor.tsx — Fix container-image synchronisatie**
- Track de werkelijke image-dimensies via een `onLoad` callback en een state (`imgSize`)
- Zet de container op exact dezelfde afmetingen als het gerenderde image (`width` en `height` in px)
- Bereken drag-posities relatief aan de image-afmetingen, niet de container
- Voeg `touchmove`/`touchend` window event listeners toe naast `mousemove`/`mouseup`
- Gebruik `aspect-ratio` op de container om de verhoudingen te bewaken bij resize

**Wijziging 2: Betere initiële veldplaatsing**
- Bij `addField()`: plaats het veld in het midden-onderaan van de huidige viewport i.p.v. hardcoded `x:10, y:70`
- Voorkom dat velden buiten het zichtbare gebied vallen

**Wijziging 3: ContractsPage.tsx Step3Preview — Layout fix**
- Verwijder de vaste `h-[70vh]` constraint die de editor inklemt in het dialog
- Gebruik `max-h-[60vh] overflow-auto` zodat de PDF scrollbaar is maar velden correct gepositioneerd blijven

### Bestanden die gewijzigd worden
- `src/components/contracts/PDFFieldEditor.tsx` — core positioning fix
- `src/pages/ContractsPage.tsx` — layout constraint fix (1 regel)

