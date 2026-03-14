
-- Trigger function for new contacts (leads)
CREATE OR REPLACE FUNCTION public.notify_new_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://fuvpmxxihmpustftzvgk.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
    ),
    body := jsonb_build_object(
      'organization_id', NEW.organization_id,
      'event_type', 'new_lead',
      'title', '👤 Nieuw contact',
      'body', COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, ''),
      'url', '/contacts/' || NEW.id
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_contact
  AFTER INSERT ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_contact();

-- Trigger function for contract signed
CREATE OR REPLACE FUNCTION public.notify_contract_signed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'signed' THEN
    PERFORM net.http_post(
      url := 'https://fuvpmxxihmpustftzvgk.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
      ),
      body := jsonb_build_object(
        'organization_id', NEW.organization_id,
        'event_type', 'contract_signed',
        'title', '✍️ Contract ondertekend',
        'body', NEW.title,
        'url', '/contracts'
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_contract_signed
  AFTER UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_contract_signed();

-- Trigger function for deal stage change
CREATE OR REPLACE FUNCTION public.notify_deal_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stage_name text;
BEGIN
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    SELECT name INTO v_stage_name FROM public.pipeline_stages WHERE id = NEW.stage_id;
    
    PERFORM net.http_post(
      url := 'https://fuvpmxxihmpustftzvgk.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
      ),
      body := jsonb_build_object(
        'organization_id', NEW.organization_id,
        'event_type', 'deal_stage_change',
        'title', '📊 Deal verplaatst',
        'body', NEW.title || ' → ' || COALESCE(v_stage_name, 'Nieuwe fase'),
        'url', '/pipeline'
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_deal_stage_change
  AFTER UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_deal_stage_change();
