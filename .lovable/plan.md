

## Plan: SMS-verificatie vervangen door e-mailverificatie via Resend

### Probleem
De Twilio connector geeft een 403 "project_not_authorized" fout bij het versturen van SMS. In plaats van Twilio te repareren, schakelen we over naar e-mailverificatie met de bestaande Resend-integratie.

### Aanpak
De verificatiecode wordt per e-mail verstuurd i.p.v. per SMS. De bestaande Resend API-key (per organisatie, versleuteld opgeslagen) wordt hergebruikt.

### Wijzigingen

**1. Edge Function: `supabase/functions/contract-signing/index.ts`**
- `handleSendSms` hernoemen/aanpassen naar `handleSendVerification`
- Twilio gateway-aanroep vervangen door Resend API-aanroep:
  - Org's Resend API key ophalen via `organization_api_keys` tabel (zelfde decrypt-functie als `send-email`)
  - E-mail versturen naar `session.signer_email` met de 6-cijferige code
  - Professionele HTML e-mail template met de verificatiecode
- `organization_id` is al beschikbaar op de session
- Afzender: dynamisch bepalen via Resend API (of fallback `noreply@` + org domein)

**2. Frontend: `src/components/contracts/SigningVerifyStep.tsx`**
- Tekst aanpassen: "SMS" → "e-mail" overal
- "We sturen een verificatiecode naar uw e-mailadres" (al correct!)
- Button tekst en foutmeldingen updaten

**3. Frontend: `src/pages/ContractSigningPage.tsx`**
- Geen wijzigingen nodig (roept alleen `SigningVerifyStep` aan)

### Technische details

De Resend e-mail wordt verstuurd via:
```ts
const resendRes = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${resendApiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from: senderAddress,
    to: [session.signer_email],
    subject: "Uw verificatiecode voor contractondertekening",
    html: `<html>...</html>`, // Styled template met de 6-cijferige code
  }),
});
```

De decrypt-functie en `getResendKey` worden gekopieerd vanuit de bestaande `send-email` functie. De `organization_id` is al beschikbaar op de signing session.

