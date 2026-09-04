import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { SEED_ITEMS, type SeedItem, type SeedListing } from "./seed-data";
import { normaliseUrl, retailerFromUrl, faviconForRetailer } from "../lib/capture/url";
import { storeListingImage } from "../lib/capture/image";

config({ path: ".env.local", quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const COMMONS = (file: string) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=1600`;

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

async function tagId(slug: string): Promise<string> {
  const label = slug.replace(/(^|\s)\w/g, (c) => c.toUpperCase());
  const { data } = await admin.from("tag").upsert({ slug, label }, { onConflict: "slug" }).select("id").single();
  return data!.id;
}

async function seedListing(item: SeedItem, itemId: string, seed: SeedListing) {
  const listingUrl = normaliseUrl(seed.url);
  const retailer = retailerFromUrl(listingUrl);

  const { data: listing, error } = await admin
    .from("listing")
    .insert({
      item_id: itemId,
      url: listingUrl,
      source_url: seed.url,
      retailer,
      retailer_favicon: faviconForRetailer(retailer),
      captured_title: `${item.name} — ${item.brand}`,
      variant: seed.variant ?? null,
      price_cents: seed.priceEur,
      currency: "EUR",
      price_eur_cents: seed.priceEur,
      shipping_cents: seed.shippingEur ?? null,
      in_stock: seed.inStock ?? true,
      first_seen_at: daysAgo(120),
      last_seen_at: daysAgo(1),
    })
    .select("id")
    .single();

  if (error || !listing) throw new Error(`${item.name}: ${error?.message}`);

  const history = seed.history ?? [seed.priceEur];
  const step = 110 / Math.max(history.length, 1);
  await admin.from("price_point").insert(
    history.map((price, index) => ({
      listing_id: listing.id,
      price_cents: price,
      currency: "EUR",
      price_eur_cents: price,
      in_stock: seed.inStock ?? true,
      seen_at: daysAgo(Math.round(115 - index * step)),
    })),
  );

  return listing.id as string;
}

async function main() {
  const reset = process.argv.includes("--reset");
  if (reset) {
    const names = SEED_ITEMS.map((item) => item.name);
    const { error } = await admin.from("item").delete().in("name", names);
    if (error) throw error;
    console.log(`reset: removed ${names.length} seed items and everything hanging off them`);
  }

  let withImage = 0;

  for (const item of SEED_ITEMS) {
    const { data: existing } = await admin.from("item").select("id").eq("name", item.name).maybeSingle();
    if (existing) {
      console.log(`skip    ${item.name} (already present)`);
      continue;
    }

    const { data: row, error } = await admin
      .from("item")
      .insert({
        name: item.name,
        designer: item.designer,
        brand: item.brand,
        design_year: item.designYear,
        owned: item.owned ?? false,
        soon: item.soon ?? false,
        wanted_finish: item.wantedFinish ?? null,
        room: item.room ?? null,
        dimensions: item.dimensions ?? null,
        notes: item.notes ?? null,
        is_public: true,
      })
      .select("id")
      .single();

    if (error || !row) throw new Error(`${item.name}: ${error?.message}`);

    const listingIds: string[] = [];
    for (const listing of item.listings) listingIds.push(await seedListing(item, row.id, listing));

    for (const slug of item.tags) {
      await admin.from("item_tag").insert({ item_id: row.id, tag_id: await tagId(slug) });
    }

    if (item.purchase) {
      await admin.from("purchase").insert({
        item_id: row.id,
        bought_at: item.purchase.boughtAt,
        paid_cents: item.purchase.paidEur,
        currency: "EUR",
        bought_from: item.purchase.boughtFrom,
        receipt_note: item.purchase.receiptNote ?? null,
      });
    }

    let imageNote = "no image on Wikimedia Commons";
    if (item.commonsFile) {
      const path = await storeListingImage(admin, {
        imageUrl: COMMONS(item.commonsFile),
        itemId: row.id,
        listingId: listingIds[0],
      });
      if (path) {
        await admin.from("item").update({ cover_image_path: path }).eq("id", row.id);
        await admin.from("listing").update({ image_path: path, image_url: COMMONS(item.commonsFile) }).eq("id", listingIds[0]);
        withImage += 1;
        imageNote = path;
      } else {
        imageNote = "image fetch FAILED";
      }
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }

    console.log(`insert  ${item.name.padEnd(30)} ${item.listings.length} listings  ${imageNote}`);
  }

  console.log(`\n${SEED_ITEMS.length} items, ${withImage} with a real photo`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
