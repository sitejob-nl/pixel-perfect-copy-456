-- Aanpasbare lead kanban stages per organisatie
CREATE TABLE public.meta_lead_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6b7280',
  sort_order int NOT NULL DEFAULT 0,
  is_won boolean NOT NULL DEFAULT false,
  is_lost boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meta_lead_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view lead stages"
  ON public.meta_lead_stages FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Org members can manage lead stages"
  ON public.meta_lead_stages FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true));

-- Add stage_id to meta_leads
ALTER TABLE public.meta_leads ADD COLUMN stage_id uuid REFERENCES public.meta_lead_stages(id) ON DELETE SET NULL;

-- Seed default stages for existing orgs that have meta_config
INSERT INTO public.meta_lead_stages (organization_id, name, color, sort_order, is_won, is_lost)
SELECT mc.organization_id, s.name, s.color, s.sort_order, s.is_won, s.is_lost
FROM public.meta_config mc
CROSS JOIN (VALUES
  ('Nieuw', '#3b82f6', 0, false, false),
  ('Contactgelegd', '#f59e0b', 1, false, false),
  ('Afspraak', '#8b5cf6', 2, false, false),
  ('Gekwalificeerd', '#10b981', 3, false, false),
  ('Klant', '#22c55e', 4, true, false),
  ('Afgewezen', '#ef4444', 5, false, true)
) AS s(name, color, sort_order, is_won, is_lost)
ON CONFLICT DO NOTHING;