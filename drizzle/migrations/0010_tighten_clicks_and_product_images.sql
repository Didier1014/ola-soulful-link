DROP POLICY IF EXISTS "anyone can insert clicks" ON public.product_clicks;
DROP POLICY IF EXISTS "read product images" ON storage.objects;
CREATE POLICY "owner or admin read product images" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'product-images' AND ((storage.foldername(name))[1] = (auth.uid())::text OR public.has_role(auth.uid(), 'admin'::public.app_role)));