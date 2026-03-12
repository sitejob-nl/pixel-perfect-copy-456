

# ✅ Voltooid: SMS-verificatie vervangen door e-mailverificatie via Resend

## Wat is gewijzigd

### 1. Edge Function: `supabase/functions/contract-signing/index.ts`
- Twilio SMS-aanroep vervangen door Resend e-mail
- `decrypt()` en `getResendKey()` toegevoegd (gekopieerd van `send-email`)
- `getSenderAddress()` haalt automatisch een geverifieerd domein op via Resend API
- Professionele HTML e-mail template met de 6-cijferige verificatiecode
- Audit log action hernoemd: `sms_code_sent` → `verification_code_sent`, `sms_verified` → `email_verified`
- Foutmelding bij ondertekening: "SMS verificatie vereist" → "E-mail verificatie vereist"

### 2. Frontend: `src/components/contracts/SigningVerifyStep.tsx`
- Foutmelding "Kon code niet verzenden" → "Kon verificatiecode niet verzenden"
- Overige tekst was al correct (verwees al naar e-mailadres)

### API-endpoints (ongewijzigd)
- `action=send_sms` — stuurt nu een e-mail i.p.v. SMS (backward compatible)
- `action=verify_sms` — verifieert de code (ongewijzigd)
- Database kolommen (`sms_code_hash`, `sms_sent_at`, `sms_verified_at`) blijven hetzelfde
