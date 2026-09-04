# Someday

Someday tracks design furniture and lamps I want to buy, and every place that
sells them. A String Pocket is one object. The five shops selling it at five
different prices are five listings hanging off that object. Browser bookmarks
cannot do that, which is why this exists.

A Chrome extension (a separate project) captures a product from any retailer
page and posts it here. This app is where I search, filter, compare prices and
decide what to actually buy.

## The one idea

An **item** is the object: "Panthella 250, Verner Panton, Louis Poulsen, 1971".
A **listing** is one offer of that object on one site, with a price and a URL.
One item has many listings.

Everything follows from that. Colour and size sold are listing properties. The
finish I actually want is an item property. A saved page is never the thing I
collect.

An item carries two booleans and nothing else about my intent: `owned`, and
`soon` for what I want next. No status enum, no priority, no categories.

That is the result of stripping things back. There was a five-value status, a
shortlist page with a running total, a priority integer, a category enum, a
condition on every listing, and filters for price range and stock. Each was one
more thing to maintain for a collection I look at with my own eyes. Two switches
say enough.

What survives in the filter bar: search, sort, designer, brand, Soon. Stock is a
fact about one offer, so it shows per offer inside the item, not as a filter.
The maker of an object is its `brand`.

There are no item pages. Clicking an object opens it in a modal over the grid.
The trade-off is that an individual object has no shareable URL.

## Stack

Next.js 16 (App Router), TypeScript, Tailwind v4, shadcn (base-nova style, on
Base UI), Supabase (Postgres, Auth, Storage).

The interface is deliberately undesigned for now: stock shadcn components, the
neutral base colour, no custom palette or type choices. The visual pass comes
later, on top of this.

## Setup

You need a Supabase project and Node 20+.

```bash
pnpm install
cp .env.example .env.local   # fill in the three keys
supabase link --project-ref <ref>
pnpm db:push
```

Turn **off** email signups in the dashboard, then:

```bash
pnpm setup:owner you@example.com   # creates the user and fills app_owner
pnpm verify:rls                    # must print all PASS and exit 0
pnpm seed                          # 10 real pieces
pnpm dev
```

`is_owner()` reads the single `app_owner` row, so until `setup:owner` has run
nobody can write, including you. The generated password is printed once; change
it in the dashboard.

`pnpm shot '[{"path":"/tmp/a.png","url":"http://localhost:3000/","width":390,"height":900,"scheme":"dark"}]'`
drives Chrome over the DevTools protocol. It emulates the colour scheme properly
and reports whether the page overflows its viewport, which plain
`--screenshot` cannot tell you: it crops instead.

## Access model

Public read, private write, enforced in the database rather than in application
code.

Anonymous visitors can select items where `is_public` is true, and the listings
under them. Everything else is closed. `notes` and `wanted_finish` are hidden
with column grants, because RLS works on rows and this is a column problem. The
`purchase` table has no anonymous grant at all.

One consequence worth knowing before it bites you: `select *` on `item` fails as
an anonymous reader. Public queries name their columns, from one constant in
`lib/queries/items.ts`.

`pnpm verify:rls` drives the anonymous key at every table and fails the build if
a single write gets through. Run it after any migration.

## Capture API

`POST /api/captures` is frozen. The contract, all five response cases and the
matching algorithm are in [docs/api.md](docs/api.md). Read that file before
touching the extension.

The short version: re-capturing a known URL updates the listing and appends a
price point only if the price moved. A new URL comes back with up to five
candidate items ranked by name and designer similarity, and writes nothing until
you re-post with an `item_id`. No match means a new item, filled in as well as
the title allows, returned for editing.

Captured images are downloaded into Supabase Storage. Retailer CDNs are never
hotlinked.

## Currency

Money is always integer minor units plus an ISO code. Never a float.

v1 does no conversion: `price_eur_cents` is filled only when the listing is
already in EUR, and anything else sorts last. The `fx_rate` and `fx_rate_date`
columns are there and empty, so adding real ECB rates later is code, not a
migration.

## Seed

Ten pieces I actually track, with correct designers, brands and years.
Seven have a real photo from Wikimedia Commons. The Panthella, the PH 5 and the
Montana Bit have none, so they seed without an image. That is on purpose: half
the retailer captures in real life will fail to give me a usable photo, and I
want to see what that looks like in the grid.

## Not in v1

The extension itself, server-side scraping, price alerts, more than one account,
and a native app. The web app is meant to work properly on a phone instead.
