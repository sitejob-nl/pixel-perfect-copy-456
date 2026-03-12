

## Plan: Contracten versturen via e-mail en toevoegen aan klantportaal

### Wat wordt er gebouwd

Twee manieren om een contract bij de klant te krijgen:

1. **Via e-mail versturen** — Een knop "Verstuur via e-mail" op het contract-detailscherm die:
   - Een e-mail stuurt naar het gekoppelde contact (of handmatig ingevoerd adres) met een ondertekeningslink
   - De Resend-integratie gebruikt (bestaande `send-email` flow) 
   - De contractstatus op "sent" zet

2. **Zichtbaar in klantportaal** — Een toggle "Toon in portaal" op het contract-detailscherm die:
   - Het `visible_in_portal` veld op `true` zet (kolom bestaat al op de contracts tabel)
   - Het contract direct zichtbaar maakt in het bestaande portaal (de `get_contracts` actie in de client-portal function filtert al op `visible_in_portal = true`)

### Technische aanpak

#### 1. ContractsPage.tsx — UI uitbreiden

Op het contract-detailscherm (`ContractDetail` component, regel ~600):

- **"Verstuur via e-mail" knop** naast de bestaande "Verzenden" knop — opent een kleine dialog met:
  - Vooringevuld e-mailadres (van gekoppeld contact)
  - Optioneel aangepast onderwerp en bericht
  - Verzendt via de `send-email` edge function met een HTML-mail die de ondertekeningslink(en) bevat
  - Zet status op "sent"

- **"Toon in portaal" toggle/switch** in de header of als aparte actie:
  - Gebruikt `useUpdateContract` om `visible_in_portal: true/false` te toggglen
  - Visuele indicator (badge) als het contract in het portaal staat

#### 2. send-email Edge Function — Contract-verzendmail

Gebruik de bestaande `send-email` function met `action: "send"`. De frontend genereert de HTML met:
- Contracttitel en -nummer
- Ondertekeningslinks per ondertekenaar (uit `contract_signing_sessions`)
- Organisatie-branding

Geen aanpassing aan de edge function nodig — de bestaande `send` actie accepteert al `to`, `subject`, `html_content`.

#### 3. Geen database-migratie nodig

- `visible_in_portal` bestaat al op de `contracts` tabel
- De `client-portal` edge function filtert hier al op
- De `contract_signing_sessions` hebben al `session_token` voor links

### Samenvatting wijzigingen

| Bestand | Wijziging |
|---|---|
| `src/pages/ContractsPage.tsx` | E-mail-verzenddialog + portaal-toggle toevoegen aan ContractDetail |

Eén bestand, geen migraties, geen nieuwe edge functions.

