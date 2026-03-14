

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

---

# ✅ LinkedIn Webhooks: Real-time Notificaties

## Wat is gebouwd

### Database
- `linkedin_webhook_events` tabel met deduplicatie (unique notification_id), RLS voor org members

### Edge Function
- `linkedin-webhook` — Challenge-response validatie (GET) + event ontvangst met X-LI-Signature verificatie (POST)

### Frontend
- **Instellingen → LinkedIn tab** — Webhook URL getoond met kopieerknop

### Webhook URL
```
https://fuvpmxxihmpustftzvgk.supabase.co/functions/v1/linkedin-webhook
```

## ⚠️ Actie vereist

1. Vraag een webhook use case aan in je LinkedIn Developer Portal
2. Na goedkeuring: registreer bovenstaande webhook URL onder "Webhooks"
3. LinkedIn valideert automatisch via de challenge-response flow
