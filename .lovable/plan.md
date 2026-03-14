

## WhatsApp Chat UI — Volledige berichteninterface

### Wat we bouwen

Een WhatsApp-achtige chat interface op de `/whatsapp` route (die nu een placeholder is). Layout met twee panelen:

**Links: Conversatielijst**
- Groepeer `whatsapp_messages` per uniek telefoonnummer (of contact_id als gekoppeld)
- Toon per conversatie: contactnaam of telefoonnummer, laatste bericht (truncated), tijdstempel, ongelezen-indicator
- Zoekbalk bovenin om te filteren op naam/nummer
- Sorteer op laatst actief

**Rechts: Chat venster**
- WhatsApp-stijl bubbels (outbound rechts groen, inbound links wit/grijs), ERP design tokens
- Per bericht: content, tijdstempel, status iconen (✓ sent, ✓✓ delivered, blauwe ✓✓ read, ✗ failed)
- Media berichten: type badge (image, video, document etc.) met bijschrift
- Berichtinvoer onderaan met tekstveld + verstuurknop
- Auto-scroll naar nieuwste bericht
- Lege state wanneer geen conversatie geselecteerd

**Nieuw gesprek starten**
- Knop "Nieuw bericht" bovenaan conversatielijst
- Opent een telefoonnummer-invoer of contactselector om een nieuw gesprek te starten

### Technische aanpak

**Nieuwe bestanden:**
| Bestand | Doel |
|---|---|
| `src/pages/WhatsAppPage.tsx` | Hoofdpagina met twee-panelen layout |
| `src/components/whatsapp/ConversationList.tsx` | Linkerpaneel — conversaties gegroepeerd per telefoon/contact |
| `src/components/whatsapp/ChatWindow.tsx` | Rechterpaneel — berichten + invoer |
| `src/components/whatsapp/MessageBubble.tsx` | Individuele berichtweergave met status iconen |

**Bestaande bestanden wijzigen:**
| Bestand | Wijziging |
|---|---|
| `src/App.tsx` | Vervang PlaceholderPage op `/whatsapp` route door WhatsAppPage |
| `src/hooks/useWhatsApp.ts` | Toevoegen: `useWhatsAppConversations()` — query die berichten groepeert per telefoonnummer, met contact join voor naam. `useWhatsAppChatMessages(phoneNumber)` — berichten voor specifiek nummer, ascending order |

**Hooks detail:**
- `useWhatsAppConversations`: Query `whatsapp_messages` met `select("*, contacts(first_name, last_name)")`, distinct op phone_number, pak per nummer het laatste bericht + count ongelezen
- `useWhatsAppChatMessages(phone)`: Alle berichten voor een telefoonnummer, ascending, met refetch interval (polling elke 10s)
- Versturen via bestaande `useWhatsAppSend` hook

**Styling:** Volledig in ERP design systeem (erp-bg0/bg1/bg2/bg3, erp-border0, erp-text0/text3, 13px fonts). WhatsApp-groen accent `hsl(142,70%,45%)` voor outbound bubbels.

### Geen database wijzigingen nodig
Alle data is al beschikbaar via `whatsapp_messages` met bestaande RLS policies.

