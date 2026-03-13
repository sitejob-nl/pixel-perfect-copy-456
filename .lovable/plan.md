

## LinkedIn Integratie: Posts Plaatsen

### Wat wordt er gebouwd

Een LinkedIn-koppeling waarmee gebruikers vanuit het CRM LinkedIn posts kunnen schrijven en publiceren. Dit vereist een OAuth 2.0 flow zodat elke gebruiker zijn eigen LinkedIn account koppelt.

### Technische aanpak

**1. Database: `linkedin_connections` tabel**
- `id`, `organization_id`, `user_id`, `linkedin_user_id`, `access_token_encrypted`, `refresh_token_encrypted`, `token_expires_at`, `linkedin_name`, `linkedin_avatar_url`, `created_at`
- RLS: gebruikers zien alleen hun eigen koppeling

**2. Edge Function: `linkedin-oauth` (callback handler)**
- Ontvangt de OAuth callback van LinkedIn met `code` parameter
- Wisselt de code in voor access + refresh token bij LinkedIn
- Versleutelt tokens met `ENCRYPTION_KEY` (al aanwezig)
- Slaat op in `linkedin_connections`
- Redirect terug naar de app

**3. Edge Function: `linkedin-post` (post publiceren)**
- Authenticated endpoint — haalt de LinkedIn token op uit de database
- Publiceert een post via LinkedIn's `ugcPosts` of `posts` API (v2)
- Ondersteunt tekst-only posts

**4. Secret: LinkedIn Client Secret**
- Moet worden opgeslagen als Supabase secret (`LINKEDIN_CLIENT_ID` + `LINKEDIN_CLIENT_SECRET`)

**5. Frontend: LinkedIn koppeling in Settings**
- Nieuwe tab of sectie in instellingen: "LinkedIn koppelen"
- Knop die redirect naar LinkedIn OAuth authorize URL
- Status tonen: gekoppeld/niet gekoppeld met profielnaam

**6. Frontend: Post composer in Content pagina**
- Dialog/modal om een LinkedIn post te schrijven
- Tekstveld + preview
- "Publiceer" knop die de `linkedin-post` edge function aanroept

### OAuth Flow

```text
User klikt "Koppel LinkedIn"
  → Redirect naar linkedin.com/oauth/v2/authorization
  → User logt in & authoriseert
  → LinkedIn redirect naar edge function callback URL
  → Edge function wisselt code → tokens
  → Slaat tokens encrypted op in DB
  → Redirect naar /settings met success param
```

### Redirect URL

De callback URL wordt: `https://fuvpmxxihmpustftzvgk.supabase.co/functions/v1/linkedin-oauth?action=callback`

Deze moet worden toegevoegd aan de LinkedIn app's "Authorized redirect URLs".

### Benodigde secrets

- `LINKEDIN_CLIENT_ID` — de Client ID: `78iox68etl8ob8`
- `LINKEDIN_CLIENT_SECRET` — moet door jou worden ingevoerd

### Volgorde van implementatie

1. Secrets toevoegen (Client ID + Secret)
2. Database migratie: `linkedin_connections` tabel
3. Edge function: `linkedin-oauth` (OAuth flow + callback)
4. Edge function: `linkedin-post` (post publiceren)
5. Frontend: LinkedIn koppeling in Settings
6. Frontend: Post composer in Content pagina
7. Redirect URL toevoegen in LinkedIn Developer Portal

