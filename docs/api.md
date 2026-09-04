# Capture API

Frozen contract. The Chrome extension is built against this document.

Base URL is the deployed app. All requests are JSON.

## Authentication

Every write carries a Supabase **user access token**:

```
Authorization: Bearer <supabase access token>
```

The route builds its Supabase client from the public anon key plus that token, so
every query runs as the signed-in user and RLS is the enforcement. The extension
must never ship a service role key. It signs in with
`supabase.auth.signInWithPassword` (or a stored refresh token) and sends the
resulting `access_token`.

A missing or invalid token returns `401`. Nothing is written.

---

## `POST /api/captures`

### Request

| Field | Type | Required | Notes |
|---|---|---|---|
| `url` | string | yes | The product page. Normalised server-side before storage. |
| `title` | string | yes | The page title, kept verbatim as `listing.captured_title`. |
| `price` | `{ amount, currency }` | no | `amount` is **integer minor units**. `currency` is ISO 4217. Omit when the page shows no price; the stored price is then left untouched. |
| `shipping` | `{ amount, currency }` | no | Same shape. |
| `image_url` | string | no | Downloaded server-side into Supabase Storage. Never hotlinked. |
| `variant` | string | no | Finish or size as sold. |
| `in_stock` | boolean | no | |
| `captured_at` | ISO 8601 | no | Defaults to now. |
| `item_id` | uuid | no | Attach this listing to an item you already track. |
| `force_new` | boolean | no | Create a new item even though candidates came back. |

```json
{
  "url": "https://www.nordicnest.com/louis-poulsen/panthella-250-table-lamp/?utm_source=google",
  "title": "Panthella 250 Table Lamp | Louis Poulsen",
  "price": { "amount": 51900, "currency": "EUR" },
  "shipping": { "amount": 1900, "currency": "EUR" },
  "image_url": "https://cdn.example.com/panthella-250.jpg",
  "variant": "Opal white",
  "in_stock": true,
  "captured_at": "2026-09-03T20:11:00Z"
}
```

### URL normalisation

Before anything is stored, the URL is reduced to a canonical form: forced to
`https`, host lowercased and `www.` dropped, fragment removed, tracking
parameters stripped (`utm_*`, `gclid`, `fbclid`, `srsltid`, `ref`, and friends),
remaining query parameters sorted, trailing slash removed.

`listing.url` is unique on that canonical value, so the same product page shared
three different ways is one listing. The URL exactly as captured is kept in
`listing.source_url`.

### Responses

**1. Known URL** — `200`

The listing is updated and `last_seen_at` moves. A `price_point` is appended
**only when the price, the currency or the stock state changed**, so a daily
capture of an unchanged page does not bury the real drops.

```json
{ "status": "updated", "item": { }, "listing": { }, "price_changed": true }
```

**2. New URL, likely matches** — `200`

**Nothing is written.** Up to five candidate items come back, best first.
`suggested` marks a single clear winner, so the extension can pre-highlight it;
it is never more than one candidate and it is often absent.

```json
{
  "status": "candidates",
  "candidates": [
    { "item": { "id": "…", "name": "Panthella 250 Table", "designer": "Verner Panton" },
      "score": 3.42, "suggested": true },
    { "item": { "id": "…", "name": "Panthella 400 Table", "designer": "Verner Panton" },
      "score": 1.10, "suggested": false }
  ]
}
```

To finish, re-POST the **identical payload** plus the chosen `item_id`, or
`"force_new": true` if none of them fit.

Scoring runs in Postgres against a trigram index on a normalised
`name + designer + brand` key:

```
3 × trigram similarity(item key, normalised title)
  + 2  if the title contains the item's designer
  + 1  if the title contains the item's brand
  + 1  if a size token in the title (250, 400, 24) appears in the item key
```

**3. `item_id` supplied** — `201`

```json
{ "status": "attached", "item": { }, "listing": { } }
```

If that URL is already known and points at a different item, the listing is moved
to the item you named. That is the correction path for a wrong attach.

**4. New URL, no match, or `force_new`** — `201`

A new item is created with a best-effort `name`, `designer` and `brand`
read out of the title, with both flags off. It comes back for editing.

```json
{ "status": "created", "item": { }, "listing": { } }
```

**Errors**

| Status | Body | Cause |
|---|---|---|
| `400` | `{ "error": "invalid_json" }` | Body is not JSON. |
| `400` | `{ "error": "invalid_body", "issues": { } }` | Schema validation failed. `issues` is a zod flattened error. |
| `400` | `{ "error": "invalid_url" }` | Not an http(s) URL. |
| `401` | `{ "error": "missing_bearer_token" }` | No `Authorization` header. |
| `401` | `{ "error": "invalid_token" }` | Token rejected by Supabase. |
| `404` | `{ "error": "item_not_found" }` | `item_id` does not exist or is not readable. |

### Images

The server fetches `image_url` with a 5 second timeout, rejects anything that is
not `image/*` or is over 8 MB, re-encodes to WebP at most 1600 px on the long
edge, and uploads it to the `product-images` bucket at
`items/{item_id}/{listing_id}.webp`.

A failed fetch never fails the capture: the listing keeps `image_url`, sets
`image_fetch_failed`, and can be retried.

---

## `GET /api/items?q=`

Search before you post, so the extension can offer an attach target without a
round trip through the candidate response.

`q` is optional. Without it the twenty most recent items come back. With it the
same normalised matcher runs, capped at twenty.

Anonymous callers see only items where `is_public` is true, and never `notes` or
`wanted_finish`. That is enforced by RLS and column grants, not by this route.

```json
{ "items": [ { "id": "…", "name": "Panthella 250 Table", "designer": "Verner Panton", "score": 3.42 } ] }
```

---

## Transcripts

The item shape has changed since these transcripts were captured: `manufacturer`
is now `brand`, `category` is gone, and `status` has been replaced by two
booleans, `owned` and `soon`. Listings no longer carry `condition`. The response
envelopes and status codes are unchanged.

Real output against the project, 2026-09-03. `$TOKEN` is an access token from
`supabase.auth.signInWithPassword`.

**No token**

```
$ curl -X POST $API -H 'content-type: application/json' \
    -d '{"url":"https://x.test/a","title":"x"}'
HTTP 401
{"error":"missing_bearer_token"}
```

**Invalid body**

```
$ curl -X POST $API -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
    -d '{"url":"not a url","title":"","price":{"amount":-5,"currency":"EURO"}}'
HTTP 400
{
  "error": "invalid_body",
  "issues": {
    "formErrors": [],
    "fieldErrors": {
      "url": ["Invalid URL"],
      "title": ["Too small: expected string to have >=1 characters"],
      "price": ["Too small: expected number to be >=0",
                "Expected a 3-letter ISO currency code"]
    }
  }
}
```

**Case 3 — new URL, no match**

Note the URL: `utm_source` stripped and `www.` dropped before storage. The
designer came out of the title; the brand did not, because Artek was not
yet known to the database.

```
$ curl -X POST $API -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{
    "url":"https://www.artek.fi/en/products/stool-60?utm_source=newsletter",
    "title":"Stool 60 by Alvar Aalto | Artek",
    "price":{"amount":29500,"currency":"EUR"},
    "variant":"Birch","in_stock":true }'
HTTP 201
status   created
item     Stool 60 | Alvar Aalto | null
listing  artek.fi https://artek.fi/en/products/stool-60
```

**Case 2 — new URL, likely match**

A Panthella captured from a fourth retailer. The two other Louis Poulsen lamps
score on the shared brand alone and stay well behind, so the winner is
marked `suggested`.

```
$ curl -X POST $API -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{
    "url":"https://www.ambientedirect.com/louis-poulsen/panthella-250-table-lamp_p12345",
    "title":"Louis Poulsen Panthella 250 Table Lamp, opal white acrylic",
    "price":{"amount":49900,"currency":"EUR"},
    "shipping":{"amount":0,"currency":"EUR"},
    "variant":"Opal white","in_stock":true }'
HTTP 200
status candidates
  3.50  suggested=True   Panthella 250 Table  (Verner Panton)
  1.76  suggested=False  AJ Floor Lamp        (Arne Jacobsen)
  1.59  suggested=False  PH 5 Pendant         (Poul Henningsen)

$ curl "$BASE/api/items?q=ambientedirect"
{"items":[]}          # nothing was written
```

**Case 4 — re-POST with `item_id`**

```
$ curl -X POST $API ... -d '{ ...same payload..., "item_id":"bcd52a9e-…" }'
HTTP 201
status  attached
item    Panthella 250 Table
listing ambientedirect.com 49900
```

**Case 1 — known URL, price moved**

```
$ curl -X POST $API ... -d '{ ...same URL..., "price":{"amount":45900,"currency":"EUR"} }'
HTTP 200
status updated | price_changed true | now 45900
```

**Case 1 — known URL, price unchanged**

```
$ curl -X POST $API ... -d '{ ...same URL..., "price":{"amount":45900,"currency":"EUR"} }'
HTTP 200
status updated | price_changed false
```

**Result in the database**

One object, four retailers, and no duplicate rows from three captures of the
same URL. The unchanged re-capture appended no price point.

```
item "Panthella 250 Table" now has 4 listings from 4 retailers:
  ambientedirect.com      45900  2 price point(s)
  finnishdesignshop.com   51900  2 price point(s)
  nordicnest.com          54900  1 price point(s)
  louispoulsen.com        57500  1 price point(s)

best price view: 45900 cents at ambientedirect.com
price drop view: high 51900, current 45900, drop 6000
```
