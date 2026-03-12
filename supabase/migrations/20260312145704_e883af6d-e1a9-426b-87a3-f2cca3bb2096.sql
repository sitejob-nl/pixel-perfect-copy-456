UPDATE storage.buckets 
SET 
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'application/pdf'],
  file_size_limit = 10485760
WHERE id = 'org-assets';