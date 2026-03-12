

## Contracten Module — Analyse & Plan

### Wat er al staat
De frontend is grotendeels gebouwd:
- `ContractsPage.tsx` — overzicht, 3-stappen create dialog, detail panel, templates tab, template editor
- `ContractSigningPage.tsx` — publieke signing flow (laden → lezen → SMS → tekenen → klaar)
- `SignatureCanvas.tsx` — HTML5 canvas
- `useContracts.ts` — alle hooks
- Routing in `App.tsx` — `/sign` als publieke route, `/contracts` als protected route
- Sidebar — "Contracten" met `mod_contracts`

### Wat er ontbreekt

**1. `contract-signing` Edge Function (KRITIEK)**
De signing page roept `contract-signing` aan maar die functie bestaat niet. Zonder dit werkt de hele publieke signing flow niet.

Nodig:
- `GET ?action=get&token=X` — retourneer contract + session data
- `GET ?action=send_sms&token=X` — genereer SMS code, stuur via Resend/extern
- `GET ?action=verify_sms&token=X&code=Y` — verifieer code
- `POST action=sign` — valideer consent, sla handtekening op, update status, maak audit log
- JWT verificatie uit (`verify_jwt = false`) want het is publiek
- Service role client voor DB mutaties

**2. `sign-pdf` Edge Function (SPEC)**
Spec noemt een aparte `sign-pdf` functie die:
- Handtekening embed in PDF via pdf-lib
- Upload naar Supabase Storage (`signed-contracts` bucket)
- Bevestigingsemail stuurt via Resend
- Contract status update

**3. `PDFFieldEditor.tsx` component**
Drag & drop editor voor handtekening/naam/datum velden op PDF pagina's. Vereist `react-pdf` (niet geïnstalleerd). Slaat `signature_fields` JSONB op bij contract.

**4. Verfijning ContractSigningPage (4-stappen flow)**
Spec wil stap 1 "Gegevens invullen" (naam/email/telefoon pre-filled + NL telefoon validatie) vóór SMS verificatie. Huidige code springt direct naar contract lezen.

### Implementatieplan

**Fase 1: contract-signing edge function** (moet eerst, anders werkt niets)
- Maak `supabase/functions/contract-signing/index.ts`
- Registreer in `config.toml` met `verify_jwt = false`
- Actions: `get`, `send_sms`, `verify_sms`, `sign`
- SMS codes hashen en opslaan in `contract_signing_sessions.sms_code_hash`
- Audit logs schrijven bij elke actie
- SHA-256 document hash bij ondertekening

**Fase 2: Signing page 4-stappen flow**
- Voeg stap "gegevens" toe vóór SMS verificatie
- NL telefoonnummer validatie (`+31`/`0031`/`06`)
- OTP input met 6 losse velden
- Countdown timer + "opnieuw versturen" (max 3x)
- Max 5 pogingen tracker

**Fase 3: PDFFieldEditor component**
- Installeer dependency (of gebruik canvas-gebaseerde benadering zonder react-pdf)
- Drag & drop velden op PDF preview
- Opslaan als `signature_fields` JSONB

**Fase 4: sign-pdf edge function**
- PDF generatie/embedding met pdf-lib
- Upload naar `signed-contracts` bucket
- Bevestigingsemail via Resend

### Aanbeveling
Start met Fase 1 + 2 — dat maakt de kernflow werkend. Fase 3 + 4 (PDF) kan als vervolg.

### Bestanden

| Actie | Bestand |
|-------|---------|
| Nieuw | `supabase/functions/contract-signing/index.ts` |
| Edit | `supabase/config.toml` (function registratie) |
| Edit | `src/pages/ContractSigningPage.tsx` (4-stappen flow) |
| Later | `src/components/contracts/PDFFieldEditor.tsx` |
| Later | `supabase/functions/sign-pdf/index.ts` |

