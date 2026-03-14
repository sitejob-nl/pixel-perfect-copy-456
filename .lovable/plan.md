

## Probleem

De Cloudflare API test op regel 722 van `IntegrationSettings.tsx` doet een directe `fetch` vanuit de browser naar `https://api.cloudflare.com/client/v4/accounts/...`. Dit faalt door **CORS-restricties** — Cloudflare's API staat geen cross-origin requests vanuit browsers toe.

## Oplossing

Route de test-aanroep via een Supabase Edge Function, net zoals de Gemini-test al via de browser gaat (die API staat CORS wel toe). Twee opties:

1. **Proxy via bestaande Edge Function** (bv. een generieke `test-integration` function)
2. **Client-side workaround**: niet mogelijk vanwege CORS

### Plan

1. **Nieuwe Edge Function `test-cloudflare`** aanmaken die:
   - De `account_id` en `api_token` uit `integration_secrets` ophaalt (of ontvangt als parameters)
   - Een test-request doet naar `https://api.cloudflare.com/client/v4/accounts/{account_id}`
   - Het resultaat (`success` / error) teruggeeft

2. **`CloudflareCard` aanpassen** (IntegrationSettings.tsx):
   - De `testConnection` functie wijzigen om de Edge Function aan te roepen via `supabase.functions.invoke("test-cloudflare", ...)` in plaats van directe fetch
   - Parameters meegeven: `organization_id` (de function haalt dan zelf de secrets op uit de DB)

### Technische details

**Edge Function `test-cloudflare/index.ts`:**
- Authenticatie: JWT verificatie + org membership check
- Haalt `account_id` en `api_token` op uit `integration_secrets` voor de betreffende org
- Doet server-side fetch naar Cloudflare API
- Retourneert `{ success: true/false, error?: string }`

**CloudflareCard wijziging:**
```typescript
const testConnection = async () => {
  setTesting(true);
  try {
    const { data, error } = await sb.functions.invoke("test-cloudflare", {
      body: { organization_id: orgId },
    });
    if (error) throw error;
    if (data.success) toast.success("Cloudflare verbinding werkt");
    else toast.error(data.error || "Ongeldige credentials");
  } catch (e: any) {
    toast.error("Test mislukt: " + e.message);
  } finally {
    setTesting(false);
  }
};
```

