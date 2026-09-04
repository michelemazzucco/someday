-- The first version took the highest price point across every listing of an item and
-- subtracted the cheapest current one. That compares different offers: a set of four
-- Wishbone chairs at 2400 against a single chair at 590, reported as an 1810 drop.
-- A price drop only means something inside one listing, so compute it per listing and
-- keep the largest. high and current now always come from the same offer.
drop view if exists public.item_overview;
drop view if exists public.item_price_drop;

create view public.item_price_drop with (security_invoker = on) as
select distinct on (l.item_id)
  l.item_id,
  l.id as listing_id,
  h.high_eur_cents,
  l.price_eur_cents + coalesce(l.shipping_cents, 0) as current_eur_cents,
  h.high_eur_cents - (l.price_eur_cents + coalesce(l.shipping_cents, 0)) as drop_eur_cents
from public.listing l
join lateral (
  select max(pp.price_eur_cents) + coalesce(l.shipping_cents, 0) as high_eur_cents
  from public.price_point pp
  where pp.listing_id = l.id
    and pp.price_eur_cents is not null
    and pp.seen_at > now() - interval '90 days'
) h on h.high_eur_cents is not null
where l.is_active and l.price_eur_cents is not null
order by l.item_id, (h.high_eur_cents - (l.price_eur_cents + coalesce(l.shipping_cents, 0))) desc;

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

grant select on public.item_price_drop, public.item_overview to anon, authenticated;
