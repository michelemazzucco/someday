-- The status and condition filter chips are gone from the interface, so the
-- conditions array in the overview has no reader left. Condition still lives on
-- each listing and shows per offer on the item.
drop view if exists public.item_overview;

create view public.item_overview with (security_invoker = on) as
select
  i.id, i.name, i.designer, i.brand, i.design_year, i.status,
  i.soon, i.room, i.dimensions, i.cover_image_path, i.is_public, i.created_at, i.updated_at,
  b.listing_id as best_listing_id,
  b.total_eur_cents as best_total_eur_cents,
  b.retailer as best_retailer,
  b.condition as best_condition,
  d.drop_eur_cents,
  coalesce(t.tags, '{}') as tags,
  coalesce(l.listing_count, 0) as listing_count
from public.item i
left join public.item_best_price b on b.item_id = i.id
left join public.item_price_drop d on d.item_id = i.id
left join lateral (
  select array_agg(tg.slug order by tg.slug) as tags
  from public.item_tag it join public.tag tg on tg.id = it.tag_id
  where it.item_id = i.id
) t on true
left join lateral (
  select count(*) as listing_count
  from public.listing li
  where li.item_id = i.id and li.is_active
) l on true;

grant select on public.item_overview to anon, authenticated;
