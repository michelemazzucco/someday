-- A public bucket serves objects by URL without any policy. A SELECT policy for anon
-- only adds list(), which exposed every item id under items/, private ones included.
-- The owner keeps SELECT because storage upsert (upload with upsert: true) needs it.
drop policy if exists "product images public read" on storage.objects;

create policy "product images owner read" on storage.objects
  for select to authenticated using (bucket_id = 'product-images' and public.is_owner());
