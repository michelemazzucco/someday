create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.app_owner o where o.user_id = auth.uid())
$$;

grant execute on function public.is_owner() to anon, authenticated;
grant execute on function public.normalise_title(text) to anon, authenticated;

alter table public.app_owner  enable row level security;
alter table public.item       enable row level security;
alter table public.listing    enable row level security;
alter table public.price_point enable row level security;
alter table public.purchase   enable row level security;
alter table public.tag        enable row level security;
alter table public.item_tag   enable row level security;

alter table public.app_owner  force row level security;
alter table public.item       force row level security;
alter table public.listing    force row level security;
alter table public.price_point force row level security;
alter table public.purchase   force row level security;
alter table public.tag        force row level security;
alter table public.item_tag   force row level security;

revoke all on public.app_owner, public.item, public.listing, public.price_point,
              public.purchase, public.tag, public.item_tag
  from anon, authenticated;

-- app_owner is read only through is_owner(), which is SECURITY DEFINER.
-- No grants, no policies: unreachable from PostgREST by anyone.

-- RLS is row-level, so hiding notes and wanted_finish from anonymous readers is a
-- column GRANT. Consequence: `select *` as anon errors on item. Public queries must
-- name their columns, which they do through ITEM_PUBLIC_COLUMNS in lib/queries/items.ts.
grant select (
  id, name, designer, manufacturer, design_year, category, status, priority,
  room, dimensions, cover_image_path, is_public, created_at, updated_at
) on public.item to anon;
grant select, insert, update, delete on public.item to authenticated;

grant select on public.listing to anon;
grant select, insert, update, delete on public.listing to authenticated;

grant select on public.price_point to anon;
grant select, insert, update, delete on public.price_point to authenticated;

grant select on public.tag to anon;
grant select, insert, update, delete on public.tag to authenticated;

grant select on public.item_tag to anon;
grant select, insert, update, delete on public.item_tag to authenticated;

grant select, insert, update, delete on public.purchase to authenticated;

grant select on public.item_best_price, public.item_price_drop to anon, authenticated;

create policy item_anon_read on public.item
  for select to anon using (is_public);
create policy item_owner_read on public.item
  for select to authenticated using (public.is_owner());
create policy item_owner_insert on public.item
  for insert to authenticated with check (public.is_owner());
create policy item_owner_update on public.item
  for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy item_owner_delete on public.item
  for delete to authenticated using (public.is_owner());

create policy listing_anon_read on public.listing
  for select to anon using (
    exists (select 1 from public.item i where i.id = listing.item_id and i.is_public)
  );
create policy listing_owner_all on public.listing
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

create policy price_point_anon_read on public.price_point
  for select to anon using (
    exists (
      select 1 from public.listing l
      join public.item i on i.id = l.item_id
      where l.id = price_point.listing_id and i.is_public
    )
  );
create policy price_point_owner_all on public.price_point
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

create policy item_tag_anon_read on public.item_tag
  for select to anon using (
    exists (select 1 from public.item i where i.id = item_tag.item_id and i.is_public)
  );
create policy item_tag_owner_all on public.item_tag
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

create policy tag_anon_read on public.tag
  for select to anon using (true);
create policy tag_owner_all on public.tag
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

create policy purchase_owner_all on public.purchase
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "product images public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'product-images');
create policy "product images owner insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and public.is_owner());
create policy "product images owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_owner())
  with check (bucket_id = 'product-images' and public.is_owner());
create policy "product images owner delete" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and public.is_owner());
