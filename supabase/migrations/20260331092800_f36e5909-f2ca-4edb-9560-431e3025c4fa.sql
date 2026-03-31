INSERT INTO storage.buckets (id, name, public)
VALUES ('meta-uploads', 'meta-uploads', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload meta files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'meta-uploads');

CREATE POLICY "Public read access for meta uploads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'meta-uploads');

CREATE POLICY "Authenticated users can delete meta files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'meta-uploads');