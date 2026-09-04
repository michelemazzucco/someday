-- SECURITY INVOKER on purpose: candidate lists must obey the caller's RLS.
create or replace function public.match_items(query_title text, max_results integer default 5)
returns table (
  id uuid,
  name text,
  designer text,
  manufacturer text,
  design_year smallint,
  category public.item_category,
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
    i.id,
    i.name,
    i.designer,
    i.manufacturer,
    i.design_year,
    i.category,
    i.status,
    i.cover_image_path,
    (
      3 * extensions.similarity(i.match_key, q.key)
      + case
          when i.designer is not null
           and q.key like '%' || public.normalise_title(i.designer) || '%'
          then 2 else 0
        end
      + case
          when i.manufacturer is not null
           and q.key like '%' || public.normalise_title(i.manufacturer) || '%'
          then 1 else 0
        end
      + case
          when s.tokens is not null
           and exists (select 1 from unnest(s.tokens) t where i.match_key ~ ('\y' || t || '\y'))
          then 1 else 0
        end
    )::real as score
  from public.item i, q, sizes s
  where extensions.similarity(i.match_key, q.key) > 0.15
     or (i.designer is not null and q.key like '%' || public.normalise_title(i.designer) || '%')
     or (i.manufacturer is not null and q.key like '%' || public.normalise_title(i.manufacturer) || '%')
  order by score desc, i.created_at desc
  limit greatest(max_results, 1);
$$;

grant execute on function public.match_items(text, integer) to anon, authenticated;
