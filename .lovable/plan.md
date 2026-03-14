

## Probleem

De `TemplateSheet` component laadt templates via `handleOpen` (line 391-394), die als `onOpenChange` aan het Radix Sheet component wordt meegegeven. Maar Radix `onOpenChange` wordt alleen getriggerd door **gebruikersinteractie** (bijv. sluiten), niet wanneer de `open` prop van `false` naar `true` verandert vanuit de parent.

In de **instellingenpagina** werkt het wel omdat de Sheet daar wordt geopend door een klik op een knop die direct de Sheet toggle triggert. Maar in het **NewChatDialog** op `/whatsapp` wordt `templateSheetOpen` op `true` gezet door de parent state, waardoor `handleOpen` nooit wordt aangeroepen en `loadTemplates()` nooit wordt uitgevoerd.

De API werkt correct - retourneert 2 goedgekeurde templates (`hallo_hoe_is_het` en `hello_world`).

## Oplossing

Voeg een `useEffect` toe aan de `TemplateSheet` component die `loadTemplates()` aanroept wanneer `open` verandert naar `true`:

| Bestand | Wijziging |
|---|---|
| `src/components/whatsapp/ChatToolbar.tsx` | Voeg `useEffect` toe in `TemplateSheet` die bij `open === true` de templates laadt en state reset |

De `useEffect` vervangt de afhankelijkheid van `handleOpen` voor het laden van templates, zodat het werkt ongeacht hoe de Sheet wordt geopend.

