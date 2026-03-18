DROP POLICY IF EXISTS "Org member access" ON contacts;
CREATE POLICY "Org member access" ON contacts FOR ALL TO authenticated
  USING (organization_id IN (SELECT user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT user_organization_ids()));

DROP POLICY IF EXISTS "Org member access" ON companies;
CREATE POLICY "Org member access" ON companies FOR ALL TO authenticated
  USING (organization_id IN (SELECT user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT user_organization_ids()));