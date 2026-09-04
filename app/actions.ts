"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getItem, getListings, getPriceHistory, getPurchases } from "@/lib/queries/items";

const FLAGS = ["owned", "soon"] as const;
type Flag = (typeof FLAGS)[number];

export async function setItemFlag(itemId: string, field: string, value: boolean) {
  if (!FLAGS.includes(field as Flag)) return { error: "unknown flag" };

  const supabase = await createClient();

  // @supabase/ssr initialises the session lazily. Without this call the update goes
  // out with the anon key alone, RLS matches no rows, and PostgREST reports success.
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "not signed in" };

  const { data, error } = await supabase
    .from("item")
    .update({ [field]: value })
    .eq("id", itemId)
    .select("id");

  if (error) return { error: error.message };
  // An RLS denial on UPDATE is not an error, it is zero rows. Treat it as a failure.
  if (!data || data.length === 0) return { error: "not allowed" };

  revalidatePath("/");
  revalidatePath("/owned");
  return { error: null };
}

export async function fetchItemDetail(itemId: string) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const isOwner = Boolean(auth.user);

  const item = await getItem(supabase, itemId, isOwner);
  if (!item) return null;

  const listings = await getListings(supabase, itemId);
  const [points, purchases] = await Promise.all([
    getPriceHistory(supabase, listings.map((listing) => listing.id)),
    isOwner ? getPurchases(supabase, [itemId]) : Promise.resolve([]),
  ]);

  return { item, listings, points, purchases, isOwner };
}

export type ItemDetail = NonNullable<Awaited<ReturnType<typeof fetchItemDetail>>>;
