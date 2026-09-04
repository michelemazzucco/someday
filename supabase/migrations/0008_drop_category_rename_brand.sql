-- category duplicated what tags already do, so it goes and tags carry the load.
-- manufacturer becomes brand: that is the word actually used for these objects.
-- any_in_stock backed the in-stock filter, which is gone; stock now shows per offer
-- on the item detail, where it belongs.

drop view if exists public.item_overview;
drop function if exists public.match_items(text, integer);

alter table public.item drop column category;
drop type public.item_category;

alter table public.item rename column manufacturer to brand;
alter index item_manufacturer_idx rename to item_brand_idx;

grant select (brand) on public.item to anon;

create or replace function public.match_items(query_title text, max_results integer default 5)
returns table (
  id uuid,
  name text,
  designer text,
  brand text,
  design_year smallint,
  status public.item_status,
  cover_image_path text,
  score real
)
language sql
stable
as $$
  with q as (
    select public.normalise_title(query_title) as key
  ),
  sizes as (
    select array_agg(m[1]) as tokens
    from q, regexp_matches(q.key, '\y(\d{2,4})\y', 'g') as m
  )
  select
    i.id, i.name, i.designer, i.brand, i.design_year, i.status, i.cover_image_path,
    (
      3 * extensions.similarity(i.match_key, q.key)
      + case when i.designer is not null and q.key like '%' || public.normalise_title(i.designer) || '%' then 2 else 0 end
      + case when i.brand is not null and q.key like '%' || public.normalise_title(i.brand) || '%' then 1 else 0 end
      + case
          when s.tokens is not null
           and exists (select 1 from unnest(s.tokens) t where i.match_key ~ ('\y' || t || '\y'))
          then 1 else 0
        end
    )::real as score
  from public.item i, q, sizes s
  where extensions.similarity(i.match_key, q.key) > 0.15
     or (i.designer is not null and q.key like '%' || public.normalise_title(i.designer) || '%')
     or (i.brand is not null and q.key like '%' || public.normalise_title(i.brand) || '%')
  order by score desc, i.created_at desc
  limit greatest(max_results, 1);
$$;

grant execute on function public.match_items(text, integer) to anon, authenticated;

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
  coalesce(l.listing_count, 0) as listing_count,
  coalesce(l.conditions, '{}') as conditions
from public.item i
left join public.item_best_price b on b.item_id = i.id
left join public.item_price_drop d on d.item_id = i.id
left join lateral (
  select array_agg(tg.slug order by tg.slug) as tags
  from public.item_tag it join public.tag tg on tg.id = it.tag_id
  where it.item_id = i.id
) t on true
left join lateral (
  select count(*) as listing_count, array_agg(distinct li.condition::text) as conditions
  from public.listing li
  where li.item_id = i.id and li.is_active
) l on true;

grant select on public.item_overview to anon, authenticated;
