import type { SupabaseClient } from "@supabase/supabase-js";
import { LISTING_COLUMNS } from "@/lib/queries/items";
import { storeListingImage } from "@/lib/capture/image";
import { faviconForRetailer } from "@/lib/capture/url";
import type { CaptureInput } from "@/lib/capture/schema";
import type { Listing } from "@/lib/types";
import { eurSnapshot } from "@/lib/money";

export type PriceFields = {
  price_cents: number | null;
  currency: string;
  price_eur_cents: number | null;
  shipping_cents: number | null;
};

export function priceFields(input: CaptureInput): PriceFields | null {
  if (!input.price) return null;
  return {
    price_cents: input.price.amount,
    currency: input.price.currency,
    price_eur_cents: eurSnapshot(input.price),
    shipping_cents: input.shipping?.amount ?? null,
  };
}

export async function insertListing(
  supabase: SupabaseClient,
  args: { itemId: string; url: string; retailer: string; input: CaptureInput; seenAt: string },
) {
  const { itemId, url, retailer, input, seenAt } = args;
  const price = priceFields(input);

  const { data: listing, error } = await supabase
    .from("listing")
    .insert({
      item_id: itemId,
      url,
      source_url: input.url,
      retailer,
      retailer_favicon: faviconForRetailer(retailer),
      captured_title: input.title,
      variant: input.variant ?? null,
      price_cents: price?.price_cents ?? null,
      currency: price?.currency ?? "EUR",
      price_eur_cents: price?.price_eur_cents ?? null,
      shipping_cents: price?.shipping_cents ?? null,
      in_stock: input.in_stock ?? null,
      image_url: input.image_url ?? null,
      first_seen_at: seenAt,
      last_seen_at: seenAt,
    })
    .select(LISTING_COLUMNS)
    .single()
    .overrideTypes<Listing, { merge: false }>();

  if (error || !listing) throw new Error(error?.message ?? "listing insert failed");

  if (price) {
    await supabase.from("price_point").insert({
      listing_id: listing.id,
      price_cents: price.price_cents,
      currency: price.currency,
      price_eur_cents: price.price_eur_cents,
      in_stock: input.in_stock ?? null,
      seen_at: seenAt,
    });
  }

  const imagePath = input.image_url
    ? await storeListingImage(supabase, { imageUrl: input.image_url, itemId, listingId: listing.id })
    : null;

  if (input.image_url) {
    await supabase
      .from("listing")
      .update({ image_path: imagePath, image_fetch_failed: imagePath === null })
      .eq("id", listing.id);
    listing.image_path = imagePath;
  }

  return listing;
}
