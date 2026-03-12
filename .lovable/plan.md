

## Diagnose: "Edge Function returned a non-2xx status code" bij send-invite

### Bevindingen

1. **Deployment**: De functie is opnieuw gedeployed en draait nu. Er waren geen recente logs, wat erop wijst dat de vorige versie mogelijk niet correct was gedeployed.

2. **Kritiek probleem in de `from` afzender**: De edge function stuurt emails met `from: noreply@{orgId}.resend.dev` -- dit gebruikt het organisatie-UUID als subdomain (bijv. `noreply@24021e4d-66d5-40b3-9968-c945bd8755c2.resend.dev`). Dit is geen geldig Resend-domein en zal door Resend worden geweigerd met een 403/422 error.

3. **Resend vereist een geverifieerd domein**: De `from` moet een domein gebruiken dat in Resend is geverifieerd, of het standaard `onboarding@resend.dev` adres voor testen.

### Plan

1. **Fix de `from` afzender in `send-invite/index.ts`**:
   - Haal de geverifieerde domeinen op uit Resend via de API, OF
   - Eenvoudiger: gebruik een generiek Resend test-adres voor nu, of laat de admin een "from" adres configureren bij de org-instellingen
   - Meest pragmatische oplossing: probeer eerst het domein op te halen via de Resend domains API, en val terug op `onboarding@resend.dev`

2. **Verbeter error handling in de frontend** (`useTeam.ts`):
   - Toon een duidelijke toast bij fouten zodat de gebruiker weet wat er mis ging (bijv. "Resend domein niet geverifieerd")

3. **Redeploy de edge function** na de fix

### Technische details

In `send-invite/index.ts` rond regel 263, wijzig de `from` logica:

```typescript
// Haal geverifieerd domein op via Resend API
const domainsRes = await fetch("https://api.resend.com/domains", {
  headers: { Authorization: `Bearer ${resendKey}` },
});
const domainsData = await domainsRes.json();
const verifiedDomain = domainsData?.data?.find((d: any) => d.status === "verified");

const fromAddress = verifiedDomain
  ? `${orgName} <noreply@${verifiedDomain.name}>`
  : `${orgName} <onboarding@resend.dev>`;
```

Gebruik dit `fromAddress` in de `fetch` call naar Resend.

