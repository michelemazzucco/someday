import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bearerFromRequest, createBearerClient } from "@/lib/supabase/bearer";
import { captureSchema, type CaptureInput } from "@/lib/capture/schema";
import { normaliseUrl, retailerFromUrl } from "@/lib/capture/url";
import { insertListing, priceFields } from "@/lib/capture/listing";
import { storeListingImage } from "@/lib/capture/image";
import { guessItemFields } from "@/lib/capture/guess";
import { ITEM_OWNER_COLUMNS, LISTING_COLUMNS } from "@/lib/queries/items";
import type { Item, Listing, MatchCandidate } from "@/lib/types";

const CANDIDATE_LIMIT = 5;
const SUGGEST_MIN_SCORE = 1.2;
const SUGGEST_LEAD = 0.5;

function json(body: unknown, status: number) {
  return Response.json(body, { status });
}

async function fetchItem(supabase: SupabaseClient, id: string) {
  const { data } = await supabase
    .from("item")
    .select(ITEM_OWNER_COLUMNS)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<Item, { merge: false }>();
  return data;
}

async function adoptCover(supabase: SupabaseClient, itemId: string, imagePath: string | null) {
  if (!imagePath) return;
  await supabase
    .from("item")
    .update({ cover_image_path: imagePath })
    .eq("id", itemId)
    .is("cover_image_path", null);
}

export async function POST(request: Request) {
  const token = bearerFromRequest(request);
  if (!token) return json({ error: "missing_bearer_token" }, 401);

  const supabase = createBearerClient(token);
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user) return json({ error: "invalid_token" }, 401);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const parsed = captureSchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: "invalid_body", issues: z.flattenError(parsed.error) }, 400);
  }
  const input: CaptureInput = parsed.data;

  let url: string;
  let retailer: string;
  try {
    url = normaliseUrl(input.url);
    retailer = retailerFromUrl(url);
  } catch {
    return json({ error: "invalid_url" }, 400);
  }

  const seenAt = input.captured_at ?? new Date().toISOString();

  const { data: existing } = await supabase
    .from("listing")
    .select(LISTING_COLUMNS)
    .eq("url", url)
    .maybeSingle()
    .overrideTypes<Listing, { merge: false }>();

  if (existing) {
    return updateKnownListing(supabase, { existing, input, seenAt });
  }

  if (input.item_id) {
    const item = await fetchItem(supabase, input.item_id);
    if (!item) return json({ error: "item_not_found" }, 404);

    const listing = await insertListing(supabase, { itemId: item.id, url, retailer, input, seenAt });
    await adoptCover(supabase, item.id, listing.image_path);
    return json({ status: "attached", item: await fetchItem(supabase, item.id), listing }, 201);
  }

  if (!input.force_new) {
    const { data: candidates } = await supabase.rpc("match_items", {
      query_title: input.title,
      max_results: CANDIDATE_LIMIT,
    });

    if (candidates && candidates.length > 0) {
      const [top, second] = candidates as MatchCandidate[];
      const suggestedId =
        top.score >= SUGGEST_MIN_SCORE && (!second || top.score - second.score >= SUGGEST_LEAD)
          ? top.id
          : null;

      return json(
        {
          status: "candidates",
          candidates: (candidates as MatchCandidate[]).map(({ score, ...item }) => ({
            item,
            score,
            suggested: item.id === suggestedId,
          })),
        },
        200,
      );
    }
  }

  return createItemFromCapture(supabase, { input, url, retailer, seenAt });
}

async function updateKnownListing(
  supabase: SupabaseClient,
  args: { existing: Listing; input: CaptureInput; seenAt: string },
) {
  const { existing, input, seenAt } = args;
  const price = priceFields(input);
  const listingId = existing.id;
  let itemId = existing.item_id;

  const priceChanged = price
    ? existing.price_cents !== price.price_cents ||
      existing.currency !== price.currency ||
      (existing.in_stock ?? null) !== (input.in_stock ?? null)
    : false;

  if (input.item_id && input.item_id !== itemId) {
    const target = await fetchItem(supabase, input.item_id);
    if (!target) return json({ error: "item_not_found" }, 404);
    itemId = input.item_id;
  }

  const refreshImage =
    Boolean(input.image_url) && (!existing.image_path || input.image_url !== existing.image_url);
  const imagePath = refreshImage
    ? await storeListingImage(supabase, { imageUrl: input.image_url!, itemId, listingId })
    : existing.image_path;

  const { data: listing, error } = await supabase
    .from("listing")
    .update({
      item_id: itemId,
      captured_title: input.title,
      variant: input.variant ?? existing.variant,
      source_url: input.url,
      in_stock: input.in_stock ?? existing.in_stock,
      is_active: true,
      last_seen_at: seenAt,
      image_url: input.image_url ?? existing.image_url,
      image_path: imagePath,
      image_fetch_failed: refreshImage && imagePath === null,
      // A capture without a price must not erase the price we already hold.
      ...(price ?? {}),
    })
    .eq("id", listingId)
    .select(LISTING_COLUMNS)
    .single()
    .overrideTypes<Listing, { merge: false }>();

  if (error) return json({ error: "listing_update_failed", detail: error.message }, 500);

  if (price && priceChanged) {
    await supabase.from("price_point").insert({
      listing_id: listingId,
      price_cents: price.price_cents,
      currency: price.currency,
      price_eur_cents: price.price_eur_cents,
      in_stock: input.in_stock ?? null,
      seen_at: seenAt,
    });
  }

  await adoptCover(supabase, itemId, imagePath);

  return json(
    { status: "updated", item: await fetchItem(supabase, itemId), listing, price_changed: priceChanged },
    200,
  );
}

async function createItemFromCapture(
  supabase: SupabaseClient,
  args: { input: CaptureInput; url: string; retailer: string; seenAt: string },
) {
  const { input, url, retailer, seenAt } = args;

  const { data: known } = await supabase
    .from("item")
    .select("designer,brand")
    .overrideTypes<{ designer: string | null; brand: string | null }[], { merge: false }>();
  const guess = guessItemFields(input.title, {
    designers: unique(known?.map((row) => row.designer)),
    brands: unique(known?.map((row) => row.brand)),
  });

  const { data: item, error } = await supabase
    .from("item")
    .insert({
      name: guess.name,
      designer: guess.designer,
      brand: guess.brand,
      status: "watching",
    })
    .select(ITEM_OWNER_COLUMNS)
    .single()
    .overrideTypes<Item, { merge: false }>();

  if (error || !item) return json({ error: "item_insert_failed", detail: error?.message }, 500);

  const listing = await insertListing(supabase, { itemId: item.id, url, retailer, input, seenAt });
  await adoptCover(supabase, item.id, listing.image_path);

  return json({ status: "created", item: await fetchItem(supabase, item.id), listing }, 201);
}

function unique(values: (string | null)[] | undefined): string[] {
  return [...new Set((values ?? []).filter((value): value is string => Boolean(value)))];
}
