

# Plan: Resend Webhooks, Templates & Broadcasts Management

## Overzicht

Een nieuwe edge function `manage-resend` die als proxy fungeert naar de Resend API, plus een nieuwe Settings-tab "E-mail (Resend)" met UI voor het beheren van webhooks, templates en broadcasts.

## Architectuur

```text
┌─────────────────────────────────────────────┐
│  SettingsPage.tsx                            │
│  Nieuwe tab: "E-mail" → ResendSettings.tsx   │
│    ├─ Webhooks tab                           │
│    ├─ Templates tab                          │
│    └─ Broadcasts tab                         │
└──────────────┬──────────────────────────────┘
               │ supabase.functions.invoke("manage-resend")
               ▼
┌─────────────────────────────────────────────┐
│  Edge Function: manage-resend/index.ts       │
│  - Decrypts Resend key from org_api_keys     │
│  - Proxies to Resend REST API                │
│  - Actions: webhooks.*, templates.*,         │
│    broadcasts.*                              │
└─────────────────────────────────────────────┘
```

## Wijzigingen

### 1. Edge Function: `supabase/functions/manage-resend/index.ts`
- Auth check (JWT via user client)
- Org membership check (owner/admin)
- Decrypt Resend API key from `organization_api_keys`
- Route actions to Resend REST API (`https://api.resend.com/`):
  - `webhooks.list/create/get/update/delete`
  - `templates.list/create/get/update/publish/duplicate/delete`
  - `broadcasts.list/create/get/update/send/delete`
- Return Resend API response directly

### 2. Hook: `src/hooks/useResend.ts`
- `useResendAction()` — generic mutation calling `manage-resend`
- Query hooks: `useResendWebhooks()`, `useResendTemplates()`, `useResendBroadcasts()`

### 3. Component: `src/components/erp/ResendSettings.tsx`
- Sub-tabs: Webhooks | Templates | Broadcasts
- **Webhooks**: List with endpoint + events, create/edit dialog, delete
- **Templates**: List with name + created date, create/edit with HTML editor (textarea), publish/duplicate/delete
- **Broadcasts**: List with subject + status, create dialog (segmentId, from, subject, html), send with schedule option, delete
- Error state als Resend key niet is ingesteld → link naar API Keys tab

### 4. Settings integratie
- Nieuwe tab "E-mail" in `SettingsPage.tsx`
- Config.toml: `[functions.manage-resend] verify_jwt = false`

### Geen database migraties nodig
Alle data leeft bij Resend — we gebruiken hun API als source of truth.

