

## LinkedIn Share Uitbreiden: URL, Afbeelding & Video Shares

### Wat wordt er toegevoegd

De huidige implementatie ondersteunt alleen tekst-posts. Dit plan voegt toe:

1. **URL/artikel shares** -- een link bijvoegen met optionele titel en beschrijving
2. **Afbeelding shares** -- afbeelding uploaden naar LinkedIn en bijvoegen aan post
3. **Visibility keuze** -- PUBLIC of CONNECTIONS selectie

### Technische aanpak

**1. Edge Function `linkedin-post` uitbreiden**

De functie accepteert nu extra velden:
- `url` (optioneel) -- artikel URL
- `image` (optioneel) -- base64-encoded afbeelding
- `visibility` -- "PUBLIC" of "CONNECTIONS" (default PUBLIC)

Voor afbeeldingen: de functie doet een 2-stap flow:
1. Register upload via `/v2/assets?action=registerUpload`
2. Upload binary naar de teruggegeven `uploadUrl`
3. Gebruik het `asset` URN in de post

De functie blijft de `/v2/posts` API gebruiken (nieuwer en aanbevolen door LinkedIn), maar past het body-formaat aan per type:
- Tekst-only: huidige flow (geen wijziging)
- Met URL: voegt `content.article` toe met `source` en optionele `title`/`description`
- Met afbeelding: registreert asset, uploadt, voegt `content.media` toe

**2. Frontend: LinkedInPostDialog uitbreiden**

- Tab of toggle om type te kiezen: Tekst / URL / Afbeelding
- URL-modus: extra veld voor link + optioneel titel/beschrijving
- Afbeelding-modus: file upload input met preview
- Dropdown voor visibility (Public / Connections only)

**3. Geen database wijzigingen nodig**

De `linkedin_connections` tabel heeft al alle benodigde velden.

### Volgorde

1. Edge function uitbreiden met URL en afbeelding support
2. Frontend dialog uitbreiden met type selectie en extra velden
3. Visibility dropdown toevoegen

