

# Plan: Resend Contacts & Domains toevoegen

## Overzicht
Twee nieuwe resources (contacts, domains) toevoegen aan het bestaande Resend-systeem: edge function, hooks en UI.

## Wijzigingen

### 1. Edge Function: `manage-resend/index.ts`
Twee nieuwe resource blocks toevoegen:

**contacts:**
- `list` → GET `/contacts`
- `create` → POST `/contacts` (email, firstName, lastName, unsubscribed)
- `get` → GET `/contacts/${payload.id}` (of by email)
- `update` → PATCH `/contacts/${payload.id}` 
- `delete` → DELETE `/contacts/${payload.id}`

**domains:**
- `list` → GET `/domains`
- `create` → POST `/domains` (name)
- `get` → GET `/domains/${payload.id}`
- `verify` → POST `/domains/${payload.id}/verify`
- `update` → PATCH `/domains/${payload.id}` (openTracking, clickTracking)
- `delete` → DELETE `/domains/${payload.id}`

### 2. Hook: `src/hooks/useResend.ts`
Toevoegen:
- `useResendContacts()` — query hook
- `useResendContactMutation()` — mutation hook
- `useResendDomains()` — query hook  
- `useResendDomainMutation()` — mutation hook

### 3. UI: `src/components/erp/ResendSettings.tsx`
Twee nieuwe sub-tabs toevoegen naast webhooks/templates/broadcasts:

**Contacts tab:**
- Lijst met e-mail, naam, unsubscribed status
- Create form: email, firstName, lastName, unsubscribed toggle
- Delete actie

**Domains tab:**
- Lijst met domeinnaam, status, tracking instellingen
- Create form: domeinnaam
- Verify knop (triggert DNS verificatie bij Resend)
- Delete actie

### Geen database migraties nodig
Alle data leeft bij Resend.

