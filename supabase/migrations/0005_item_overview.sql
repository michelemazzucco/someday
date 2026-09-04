-- One row per item with everything the grid needs. security_invoker chains through
-- item_best_price and item_price_drop, so anonymous readers still see public items only.
-- notes and wanted_finish are deliberately absent: anon has no grant on them, and a
-- view that selected them would fail for anonymous readers on every row.
create view public.item_overview with (security_invoker = on) as
select
  i.id,
  i.name,
  i.designer,
  i.manufacturer,
  i.design_year,
  i.category,
  i.status,
  i.priority,
  i.room,
  i.dimensions,
  i.cover_image_path,
  i.is_public,
  i.created_at,
  i.updated_at,
  b.listing_id as best_listing_id,
  b.total_eur_cents as best_total_eur_cents,
  b.retailer as best_retailer,
  b.condition as best_condition,
  b.in_stock as best_in_stock,
  d.drop_eur_cents,
  coalesce(t.tags, '{}') as tags,
  coalesce(l.listing_count, 0) as listing_count,
  coalesce(l.conditions, '{}') as conditions,
  coalesce(l.any_in_stock, false) as any_in_stock
from public.item i
left join public.item_best_price b on b.item_id = i.id
left join public.item_price_drop d on d.item_id = i.id
left join lateral (
  select array_agg(tg.slug order by tg.slug) as tags
  from public.item_tag it
  join public.tag tg on tg.id = it.tag_id
  where it.item_id = i.id
) t on true
left join lateral (
  select
    count(*) as listing_count,
    array_agg(distinct li.condition::text) as conditions,
    bool_or(coalesce(li.in_stock, false)) as any_in_stock
  from public.listing li
  where li.item_id = i.id and li.is_active
) l on true;

grant select on public.item_overview to anon, authenticated;
