import type { SupabaseClient } from "@supabase/supabase-js";
import type { ItemOverview, Item, Listing, Purchase } from "@/lib/types";
import type { Filters } from "@/lib/queries/filters";

export const ITEM_PUBLIC_COLUMNS = [
  "id",
  "name",
  "designer",
  "brand",
  "design_year",
  "owned",
  "soon",
  "room",
  "dimensions",
  "cover_image_path",
  "is_public",
  "created_at",
  "updated_at",
].join(",");

export const ITEM_OWNER_COLUMNS = [ITEM_PUBLIC_COLUMNS, "wanted_finish", "notes"].join(",");

export const LISTING_COLUMNS = [
  "id",
  "item_id",
  "url",
  "source_url",
  "retailer",
  "retailer_favicon",
  "captured_title",
  "variant",
  "price_cents",
  "currency",
  "price_eur_cents",
  "shipping_cents",
  "in_stock",
  "image_url",
  "image_path",
  "is_active",
  "first_seen_at",
  "last_seen_at",
].join(",");

export async function listItems(supabase: SupabaseClient, filters: Filters): Promise<ItemOverview[]> {
  let query = supabase.from("item_overview").select("*");

  if (filters.owned) query = query.eq("owned", true);
  if (filters.designer.length) query = query.in("designer", filters.designer);
  if (filters.brand.length) query = query.in("brand", filters.brand);
  if (filters.tag.length) query = query.overlaps("tags", filters.tag);
  if (filters.soon) query = query.eq("soon", true);

  if (filters.q) {
    const term = filters.q.replace(/[%,()]/g, " ");
    query = query.or(
      `name.ilike.%${term}%,designer.ilike.%${term}%,brand.ilike.%${term}%,tags.cs.{${term.toLowerCase()}}`,
    );
  }

  switch (filters.sort) {
    case "best_price":
      query = query.order("best_total_eur_cents", { ascending: true, nullsFirst: false });
      break;
    case "highest_price":
      query = query.order("best_total_eur_cents", { ascending: false, nullsFirst: false });
      break;
    case "drop":
      query = query.order("drop_eur_cents", { ascending: false, nullsFirst: false });
      break;
    case "designer":
      query = query.order("designer", { ascending: true, nullsFirst: false });
      break;
    case "year":
      query = query.order("design_year", { ascending: true, nullsFirst: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query.overrideTypes<ItemOverview[], { merge: false }>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getItem(supabase: SupabaseClient, id: string, canReadPrivate: boolean) {
  const { data, error } = await supabase
    .from("item")
    .select(canReadPrivate ? ITEM_OWNER_COLUMNS : ITEM_PUBLIC_COLUMNS)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<Item, { merge: false }>();

  if (error) throw new Error(error.message);
  return data;
}

export async function getListings(supabase: SupabaseClient, itemId: string): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listing")
    .select(LISTING_COLUMNS)
    .eq("item_id", itemId)
    .order("is_active", { ascending: false })
    .overrideTypes<Listing[], { merge: false }>();

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPriceHistory(supabase: SupabaseClient, listingIds: string[]) {
  if (!listingIds.length) return [];
  const { data, error } = await supabase
    .from("price_point")
    .select("listing_id,price_cents,currency,price_eur_cents,seen_at")
    .in("listing_id", listingIds)
    .order("seen_at", { ascending: true })
    .overrideTypes<
      { listing_id: string; price_cents: number; currency: string; price_eur_cents: number | null; seen_at: string }[],
      { merge: false }
    >();

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPurchases(supabase: SupabaseClient, itemIds: string[]): Promise<Purchase[]> {
  if (!itemIds.length) return [];
  const { data } = await supabase
    .from("purchase")
    .select("id,item_id,bought_at,paid_cents,currency,bought_from,receipt_note")
    .in("item_id", itemIds)
    .overrideTypes<Purchase[], { merge: false }>();
  return data ?? [];
}

export async function getFacets(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("item_overview")
    .select("designer,brand,tags")
    .overrideTypes<
      { designer: string | null; brand: string | null; tags: string[] }[],
      { merge: false }
    >();

  const collect = (values: (string | null)[]) => [...new Set(values.filter(Boolean) as string[])].sort();

  return {
    designers: collect((data ?? []).map((row) => row.designer)),
    brands: collect((data ?? []).map((row) => row.brand)),
    tags: collect((data ?? []).flatMap((row) => row.tags ?? [])),
  };
}
