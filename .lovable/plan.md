

# ✅ LinkedIn Integratie: Posts Plaatsen

## Wat is gebouwd

### Database
- `linkedin_connections` tabel met RLS (users zien alleen eigen koppeling)

### Edge Functions
- `linkedin-oauth` — OAuth 2.0 flow (start → redirect → callback → tokens opslaan)
- `linkedin-post` — Authenticated endpoint om LinkedIn posts te publiceren

### Frontend
- **Instellingen → LinkedIn tab** — Koppel/ontkoppel LinkedIn account
- **Content pagina → LinkedIn Post knop** — Schrijf en publiceer posts

### Secrets
- `LINKEDIN_CLIENT_ID` — opgeslagen
- `LINKEDIN_CLIENT_SECRET` — opgeslagen

## ⚠️ Actie vereist

Voeg deze redirect URL toe aan je LinkedIn Developer Portal:
```
https://fuvpmxxihmpustftzvgk.supabase.co/functions/v1/linkedin-oauth?action=callback
```
