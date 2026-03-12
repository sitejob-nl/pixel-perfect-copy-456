
Doel: een lid (bijv. `info@sitejob.nl`) mag niet meer alle instellingen zien of beheren, en dit moet server-side (RLS + edge checks) afgedwongen worden.

1) Wat nu misgaat (vastgesteld)
- Frontend: `SettingsPage` toont alle tabs voor iedereen (geen rolfilter op tabniveau).
- RLS is te ruim op meerdere settings-tabellen:
  - `organization_members`: policy “Members can view own org data” staat op `FOR ALL` voor alle leden.
  - `organization_invites`: idem `FOR ALL` voor alle leden.
  - `snelstart_config` + `snelstart_sync_log`: “Org member access” op `FOR ALL`.
  - `organization_api_keys`: leden mogen metadata lezen.
- `AcceptInvitePage` doet directe inserts/updates op `organization_members` en `organization_invites`; dit blokkeert striktere RLS als we die correct dichtzetten.

2) Implementatieplan (veiligste, minst lekgevoelig)

A. RLS hardenen via nieuwe migratie
- `organization_members`
  - Verwijder brede `FOR ALL` policy.
  - Voeg policies toe:
    - SELECT eigen membership (`user_id = auth.uid()`), plus admin/superadmin org-breed.
    - INSERT/UPDATE/DELETE alleen owner/admin (of service_role/superadmin).
- `organization_invites`
  - Verwijder brede `FOR ALL` policy.
  - SELECT/INSERT/UPDATE/DELETE alleen owner/admin (plus service_role/superadmin).
- `organization_api_keys`
  - SELECT beperken naar owner/admin (nu kan lid key-metadata zien).
  - CUD blijft admin-only.
- `snelstart_config` en `snelstart_sync_log`
  - Brede member `FOR ALL` vervangen door admin-only policies.
- Gebruik bestaande security-definer helper (`user_has_role`) in policies om recursionproblemen te vermijden.

B. Invite-accept flow RLS-proof maken
- Nieuwe edge function: `accept-invite`
  - Input: `invite_token`.
  - Valideert ingelogde user.
  - Zoekt invite via service role.
  - Controleert: invite bestaat, niet verlopen, niet geaccepteerd, en email van invite == ingelogde user email.
  - Reactivatie/upsert in `organization_members`.
  - Zet `accepted_at`.
- `AcceptInvitePage` aanpassen:
  - Geen directe DB-mutaties meer op invites/members.
  - Beide paden (nieuwe/existing user) roepen alleen `accept-invite` aan.
  - Daarna `invalidateQueries(["organization"])` en redirect dashboard.

C. Frontend rolafscherming in Settings
- `SettingsPage`:
  - Rol lezen uit `useOrganization()`.
  - Tabs filteren op rol:
    - owner/admin: alle tabs.
    - member/viewer/intern: alleen “Account” (optioneel “Notificaties” als gewenst).
  - `activeTab` automatisch resetten naar eerste toegestane tab als huidige niet meer mag.
  - Sensitive panelen (Team/API Keys/E-mail/Snelstart/Algemeen) niet renderen voor niet-admins.
- Hiermee verdwijnt “ik zie alles als lid” direct in UI, terwijl RLS backend hard blokkeert.

D. Extra backend guard
- `snelstart-sync` edge function: expliciete rolcheck owner/admin toevoegen (nu alleen actief lid-check).
- Zo blijft gevoelige actie ook via function-call afgeschermd.

3) Technische details (concreet)
- Bestanden:
  - `src/pages/SettingsPage.tsx` (tab filtering + render guards)
  - `src/pages/AcceptInvitePage.tsx` (edge function i.p.v. directe DB writes)
  - `supabase/functions/accept-invite/index.ts` (nieuw)
  - `supabase/functions/snelstart-sync/index.ts` (role enforcement)
  - `supabase/migrations/<timestamp>_harden_settings_rls.sql` (nieuwe policies)
- SQL-strategie:
  - `DROP POLICY` op te brede policies.
  - Nieuwe `SELECT` vs `CUD` policies per tabel, least-privilege.
  - Policies baseren op `user_has_role(organization_id, ARRAY['owner','admin'])` en `is_super_admin()`.

4) Validatie na implementatie
- Inloggen als lid (`info@sitejob.nl`):
  - Alleen toegestane settings-tab(s) zichtbaar.
  - Directe REST calls op invites/members/snelstart_config write-acties falen door RLS.
- Inloggen als owner/admin:
  - Team/invite/API/Snelstart werkt nog.
- Invite flow:
  - Nieuwe gebruiker: wachtwoord instellen + accepteren werkt.
  - Bestaande gebruiker: accepteren werkt zonder RLS-fout.
- Geen regressie op onboarding/protected route.

Resultaat: niet alleen “verstopt in UI”, maar echt server-side dichtgezet zoals je vraagt.
