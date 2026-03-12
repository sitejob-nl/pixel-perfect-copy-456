-- ============================================================
-- Harden RLS: replace overly-broad FOR ALL policies with
-- least-privilege per-operation policies.
-- ============================================================

-- ── organization_members ──
DROP POLICY IF EXISTS "Members can view own org data" ON organization_members;

-- Members can only SELECT their own row
CREATE POLICY "Members select own membership"
  ON organization_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admins/owners can see all members in their org
CREATE POLICY "Admins select org members"
  ON organization_members FOR SELECT TO authenticated
  USING (
    user_has_role(organization_id, ARRAY['owner','admin'])
    OR is_super_admin()
  );

-- Only admins/owners (or service_role) can INSERT/UPDATE/DELETE
CREATE POLICY "Admins manage org members"
  ON organization_members FOR INSERT TO authenticated
  WITH CHECK (
    user_has_role(organization_id, ARRAY['owner','admin'])
    OR is_super_admin()
  );

CREATE POLICY "Admins update org members"
  ON organization_members FOR UPDATE TO authenticated
  USING (
    user_has_role(organization_id, ARRAY['owner','admin'])
    OR is_super_admin()
  );

CREATE POLICY "Admins delete org members"
  ON organization_members FOR DELETE TO authenticated
  USING (
    user_has_role(organization_id, ARRAY['owner','admin'])
    OR is_super_admin()
  );

-- ── organization_invites ──
DROP POLICY IF EXISTS "Members can view own org data" ON organization_invites;

CREATE POLICY "Admins select org invites"
  ON organization_invites FOR SELECT TO authenticated
  USING (
    user_has_role(organization_id, ARRAY['owner','admin'])
    OR is_super_admin()
  );

CREATE POLICY "Admins manage org invites"
  ON organization_invites FOR INSERT TO authenticated
  WITH CHECK (
    user_has_role(organization_id, ARRAY['owner','admin'])
    OR is_super_admin()
  );

CREATE POLICY "Admins update org invites"
  ON organization_invites FOR UPDATE TO authenticated
  USING (
    user_has_role(organization_id, ARRAY['owner','admin'])
    OR is_super_admin()
  );

CREATE POLICY "Admins delete org invites"
  ON organization_invites FOR DELETE TO authenticated
  USING (
    user_has_role(organization_id, ARRAY['owner','admin'])
    OR is_super_admin()
  );

-- ── organization_api_keys ──
DROP POLICY IF EXISTS "Org members can view key metadata" ON organization_api_keys;

CREATE POLICY "Admins select api keys"
  ON organization_api_keys FOR SELECT TO authenticated
  USING (
    user_has_role(organization_id, ARRAY['owner','admin'])
    OR is_super_admin()
  );

-- ── snelstart_config ──
DROP POLICY IF EXISTS "Org member access" ON snelstart_config;

CREATE POLICY "Admins select snelstart config"
  ON snelstart_config FOR SELECT TO authenticated
  USING (
    user_has_role(organization_id, ARRAY['owner','admin'])
    OR is_super_admin()
  );

CREATE POLICY "Admins manage snelstart config"
  ON snelstart_config FOR INSERT TO authenticated
  WITH CHECK (
    user_has_role(organization_id, ARRAY['owner','admin'])
    OR is_super_admin()
  );

CREATE POLICY "Admins update snelstart config"
  ON snelstart_config FOR UPDATE TO authenticated
  USING (
    user_has_role(organization_id, ARRAY['owner','admin'])
    OR is_super_admin()
  );

-- ── snelstart_sync_log ──
DROP POLICY IF EXISTS "Org member access" ON snelstart_sync_log;

CREATE POLICY "Admins select snelstart logs"
  ON snelstart_sync_log FOR SELECT TO authenticated
  USING (
    user_has_role(organization_id, ARRAY['owner','admin'])
    OR is_super_admin()
  );

CREATE POLICY "Admins manage snelstart logs"
  ON snelstart_sync_log FOR INSERT TO authenticated
  WITH CHECK (
    user_has_role(organization_id, ARRAY['owner','admin'])
    OR is_super_admin()
  );