-- AI generation tracking per section
ALTER TABLE project_plan_sections
  ADD COLUMN IF NOT EXISTS ai_generated boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_prompt text,
  ADD COLUMN IF NOT EXISTS ai_model text,
  ADD COLUMN IF NOT EXISTS ai_generated_at timestamptz;

-- AI generation context per plan
ALTER TABLE project_plans
  ADD COLUMN IF NOT EXISTS ai_context jsonb,
  ADD COLUMN IF NOT EXISTS generation_status text DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS generation_error text;

-- Validation trigger for generation_status
CREATE OR REPLACE FUNCTION validate_generation_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.generation_status NOT IN ('idle', 'generating', 'completed', 'failed') THEN
    RAISE EXCEPTION 'Invalid generation_status: %', NEW.generation_status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_generation_status ON project_plans;
CREATE TRIGGER trg_validate_generation_status
  BEFORE INSERT OR UPDATE OF generation_status ON project_plans
  FOR EACH ROW
  EXECUTE FUNCTION validate_generation_status();