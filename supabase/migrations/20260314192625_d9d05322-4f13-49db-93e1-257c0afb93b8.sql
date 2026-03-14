-- Fix: Add explicit WITH CHECK to all org-member policies for write operations

-- Projects
DROP POLICY IF EXISTS "Org member access" ON public.projects;
CREATE POLICY "Org member access" ON public.projects
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT user_organization_ids()));

-- Deals
DROP POLICY IF EXISTS "Org member access" ON public.deals;
CREATE POLICY "Org member access" ON public.deals
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT user_organization_ids()));

-- Pipeline stages
DROP POLICY IF EXISTS "Org member access" ON public.pipeline_stages;
CREATE POLICY "Org member access" ON public.pipeline_stages
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT user_organization_ids()));

-- Activities
DROP POLICY IF EXISTS "Org member access" ON public.activities;
CREATE POLICY "Org member access" ON public.activities
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT user_organization_ids()));

-- Tasks
DROP POLICY IF EXISTS "org_members_tasks" ON public.tasks;
CREATE POLICY "org_members_tasks" ON public.tasks
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT user_organization_ids()));

-- Comments
DROP POLICY IF EXISTS "org_members_comments" ON public.comments;
CREATE POLICY "org_members_comments" ON public.comments
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT user_organization_ids()));

-- AI Summaries
DROP POLICY IF EXISTS "org_members_summaries" ON public.ai_summaries;
CREATE POLICY "org_members_summaries" ON public.ai_summaries
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT user_organization_ids()));

-- Notifications
DROP POLICY IF EXISTS "own_notifications" ON public.notifications;
CREATE POLICY "own_notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());