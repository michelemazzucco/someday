create extension if not exists pg_trgm with schema extensions;

create type public.item_status as enum ('owned', 'shortlist', 'wanted', 'watching', 'passed');
create type public.listing_condition as enum ('new', 'vintage', 'used');
create type public.item_category as enum ('seating', 'lighting', 'storage', 'table', 'textile', 'object');

-- IMMUTABLE by construction so match_key can be a generated column.
-- unaccent() is only STABLE and is therefore illegal there.
create or replace function public.normalise_title(input text)
returns text
language sql
immutable
strict
parallel safe
as $$
  select trim(both ' ' from regexp_replace(
    regexp_replace(
      regexp_replace(
        lower(translate(
          input,
          'àáâãäåçèéêëìíîïñòóôõöøùúûüýÿšž',
          'aaaaaaceeeeiiiinoooooouuuuyysz'
        )),
        '[^a-z0-9]+', ' ', 'g'
      ),
      '\y(the|and|or|by|for|with|in|of|a|new|original|authentic|genuine|official|buy|shop|online|sale|free|shipping)\y', ' ', 'g'
    ),
    '\s+', ' ', 'g'
  ))
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.app_owner (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.item (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  designer text,
  manufacturer text,
  design_year smallint check (design_year between 1800 and 2100),
  category public.item_category,
  status public.item_status not null default 'watching',
  priority integer,
  wanted_finish text,
  room text,
  dimensions text,
  notes text,
  cover_image_path text,
  is_public boolean not null default true,
  match_key text generated always as (
    public.normalise_title(
      name || ' ' || coalesce(designer, '') || ' ' || coalesce(manufacturer, '')
    )
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index item_match_key_trgm on public.item using gin (match_key extensions.gin_trgm_ops);
create index item_status_idx on public.item (status, priority nulls last, created_at desc);
create index item_designer_idx on public.item (designer);
create index item_manufacturer_idx on public.item (manufacturer);
create index item_public_idx on public.item (is_public) where is_public;

create trigger item_touch_updated_at
  before update on public.item
  for each row execute function public.touch_updated_at();

create table public.listing (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.item (id) on delete cascade,
  -- normalised: lowercased host, tracking params and fragment stripped.
  -- This uniqueness is what makes re-capture idempotent.
  url text not null unique,
  source_url text,
  retailer text not null,
  retailer_favicon text,
  captured_title text,
  variant text,
  condition public.listing_condition not null default 'new',
  price_cents bigint check (price_cents >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  price_eur_cents bigint check (price_eur_cents >= 0),
  fx_rate numeric(18, 8),
  fx_rate_date date,
  shipping_cents bigint check (shipping_cents >= 0),
  in_stock boolean,
  image_url text,
  image_path text,
  image_fetch_failed boolean not null default false,
  is_active boolean not null default true,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index listing_best_price_idx on public.listing (item_id, is_active, price_eur_cents);
create index listing_retailer_idx on public.listing (retailer);
create index listing_condition_idx on public.listing (condition);

create table public.price_point (
  id bigint primary key generated always as identity,
  listing_id uuid not null references public.listing (id) on delete cascade,
  price_cents bigint not null check (price_cents >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  price_eur_cents bigint check (price_eur_cents >= 0),
  in_stock boolean,
  seen_at timestamptz not null default now()
);

create index price_point_listing_idx on public.price_point (listing_id, seen_at desc);

create table public.purchase (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.item (id) on delete cascade,
  bought_at date,
  paid_cents bigint check (paid_cents >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  bought_from text,
  receipt_note text,
  created_at timestamptz not null default now()
);

create index purchase_item_idx on public.purchase (item_id);

create table public.tag (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null
);

create table public.item_tag (
  item_id uuid not null references public.item (id) on delete cascade,
  tag_id uuid not null references public.tag (id) on delete cascade,
  primary key (item_id, tag_id)
);

create index item_tag_tag_idx on public.item_tag (tag_id);

-- security_invoker is mandatory: without it these views run as their owner and
-- would hand anonymous readers every private item.
create view public.item_best_price with (security_invoker = on) as
select distinct on (l.item_id)
  l.item_id,
  l.id as listing_id,
  l.price_eur_cents,
  coalesce(l.shipping_cents, 0) as shipping_cents,
  l.price_eur_cents + coalesce(l.shipping_cents, 0) as total_eur_cents,
  l.currency,
  l.retailer,
  l.condition,
  l.in_stock
from public.listing l
where l.is_active and l.price_eur_cents is not null
order by l.item_id, (l.price_eur_cents + coalesce(l.shipping_cents, 0)) asc, l.last_seen_at desc;

create view public.item_price_drop with (security_invoker = on) as
select
  b.item_id,
  b.total_eur_cents as current_eur_cents,
  h.high_eur_cents,
  greatest(h.high_eur_cents - b.total_eur_cents, 0) as drop_eur_cents
from public.item_best_price b
join lateral (
  select max(pp.price_eur_cents) as high_eur_cents
  from public.price_point pp
  join public.listing l2 on l2.id = pp.listing_id
  where l2.item_id = b.item_id
    and pp.price_eur_cents is not null
    and pp.seen_at > now() - interval '90 days'
) h on h.high_eur_cents is not null;
