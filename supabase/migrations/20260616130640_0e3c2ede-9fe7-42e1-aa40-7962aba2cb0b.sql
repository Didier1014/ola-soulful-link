
CREATE POLICY "Users manage their own digital files"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'product-digital' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'product-digital' AND auth.uid()::text = (storage.foldername(name))[1]);
