
-- Create storage bucket for organization logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('org-assets', 'org-assets', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']);

-- Storage policies: org members can upload, anyone can read (public bucket)
CREATE POLICY "Org members can upload assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'org-assets');

CREATE POLICY "Org members can update own assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'org-assets');

CREATE POLICY "Org members can delete own assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'org-assets');

CREATE POLICY "Public read org assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'org-assets');
