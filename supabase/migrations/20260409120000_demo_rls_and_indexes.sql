-- ============================================================
-- Demo Builder: RLS policies + indexes
-- ============================================================

-- ── Enable RLS on all demo tables ──

ALTER TABLE public.demos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_platform_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_website_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_dashboard_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_industry_modules ENABLE ROW LEVEL SECURITY;

-- ── Org-member policies (demos, demo_pages, demo_versions) ──

CREATE POLICY "Org members can manage demos"
  ON public.demos FOR ALL
  USING (organization_id IN (SELECT user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT user_organization_ids()));

CREATE POLICY "Org members can manage demo_pages"
  ON public.demo_pages FOR ALL
  USING (demo_id IN (SELECT id FROM public.demos WHERE organization_id IN (SELECT user_organization_ids())))
  WITH CHECK (demo_id IN (SELECT id FROM public.demos WHERE organization_id IN (SELECT user_organization_ids())));

CREATE POLICY "Org members can manage demo_versions"
  ON public.demo_versions FOR ALL
  USING (organization_id IN (SELECT user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT user_organization_ids()));

-- ── Public demo access (for /demo/:slug viewer) ──

CREATE POLICY "Public demos are readable"
  ON public.demos FOR SELECT
  USING (is_public = true);

CREATE POLICY "Public demo pages are readable"
  ON public.demo_pages FOR SELECT
  USING (demo_id IN (SELECT id FROM public.demos WHERE is_public = true));

-- ── Feedback: anyone can INSERT, org members can SELECT ──

CREATE POLICY "Anyone can submit feedback"
  ON public.demo_feedback FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Org members can view feedback"
  ON public.demo_feedback FOR SELECT
  USING (demo_id IN (SELECT id FROM public.demos WHERE organization_id IN (SELECT user_organization_ids())));

-- ── Views: anyone can INSERT, org members can SELECT ──

CREATE POLICY "Anyone can track views"
  ON public.demo_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Org members can view analytics"
  ON public.demo_views FOR SELECT
  USING (demo_id IN (SELECT id FROM public.demos WHERE organization_id IN (SELECT user_organization_ids())));

-- ── Reference tables: readable by authenticated users ──

CREATE POLICY "Authenticated users can read platform types"
  ON public.demo_platform_types FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read website types"
  ON public.demo_website_types FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read dashboard modules"
  ON public.demo_dashboard_modules FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read industry modules"
  ON public.demo_industry_modules FOR SELECT
  USING (auth.role() = 'authenticated');

-- ── Service role full access (for edge functions) ──
-- Service role bypasses RLS by default, no additional policies needed.

-- ── Performance indexes ──

CREATE INDEX IF NOT EXISTS idx_demos_org_created
  ON public.demos (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_demos_public_slug
  ON public.demos (public_slug)
  WHERE public_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_demos_generation_status
  ON public.demos (organization_id, generation_status)
  WHERE generation_status IN ('generating', 'pending');

CREATE INDEX IF NOT EXISTS idx_demo_pages_demo_order
  ON public.demo_pages (demo_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_demo_versions_demo
  ON public.demo_versions (demo_id, version_number DESC);

CREATE INDEX IF NOT EXISTS idx_demo_feedback_demo
  ON public.demo_feedback (demo_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_demo_views_demo
  ON public.demo_views (demo_id, created_at DESC);

-- ── Unique constraint on public_slug ──

CREATE UNIQUE INDEX IF NOT EXISTS idx_demos_unique_slug
  ON public.demos (public_slug)
  WHERE public_slug IS NOT NULL;
