-- Fix search_path on functions
ALTER FUNCTION public.user_organization_ids() SET search_path = public;
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.generate_document_number(uuid, text, text) SET search_path = public;