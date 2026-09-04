import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !anonKey || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const anon = createClient(url, anonKey, { auth: { persistSession: false } });
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

type Result = { name: string; passed: boolean; detail: string };
const results: Result[] = [];

type Query<T = unknown> = PromiseLike<{ error: unknown; data?: T }>;

async function mustFail(name: string, run: () => Query) {
  try {
    const { error } = await run();
    const message = error ? String((error as { message?: string }).message ?? error) : "";
    results.push({ name, passed: Boolean(error), detail: error ? message : "NO ERROR — the write went through" });
  } catch (thrown) {
    results.push({ name, passed: true, detail: String(thrown) });
  }
}

async function mustSucceed(name: string, run: () => Query) {
  const { error } = await run();
  const message = error ? String((error as { message?: string }).message ?? error) : "";
  results.push({ name, passed: !error, detail: error ? message : "ok" });
}

async function mustReturnRows(name: string, expected: number, run: () => Query) {
  const { error, data } = await run();
  const rows = Array.isArray(data) ? data.length : 0;
  results.push({
    name,
    passed: !error && rows === expected,
    detail: error ? String((error as { message?: string }).message) : `${rows} row(s), expected ${expected}`,
  });
}

async function main() {
  const { data: publicItem, error: e1 } = await admin
    .from("item")
    .insert({ name: "RLS probe public", is_public: true, notes: "secret note" })
    .select("id")
    .single();
  const { data: privateItem, error: e2 } = await admin
    .from("item")
    .insert({ name: "RLS probe private", is_public: false, notes: "secret note" })
    .select("id")
    .single();

  if (e1 || e2 || !publicItem || !privateItem) {
    console.error("Fixture setup failed:", e1?.message ?? e2?.message);
    process.exit(1);
  }

  await admin.from("purchase").insert({ item_id: publicItem.id, paid_cents: 1000, currency: "EUR" });

  try {
    await mustFail("anon cannot insert item", () =>
      anon.from("item").insert({ name: "anon write" }),
    );
    await mustFail("anon cannot update item", () =>
      anon.from("item").update({ name: "hijacked" }).eq("id", publicItem.id),
    );
    await mustFail("anon cannot delete item", () =>
      anon.from("item").delete().eq("id", publicItem.id),
    );
    await mustFail("anon cannot insert listing", () =>
      anon.from("listing").insert({ item_id: publicItem.id, url: "https://x.test/a", retailer: "x.test", currency: "EUR" }),
    );
    await mustFail("anon cannot insert price_point", () =>
      anon.from("price_point").insert({ listing_id: publicItem.id, price_cents: 1, currency: "EUR" }),
    );
    await mustFail("anon cannot insert tag", () =>
      anon.from("tag").insert({ slug: "x", label: "x" }),
    );
    await mustFail("anon cannot insert item_tag", () =>
      anon.from("item_tag").insert({ item_id: publicItem.id, tag_id: publicItem.id }),
    );
    await mustFail("anon cannot insert purchase", () =>
      anon.from("purchase").insert({ item_id: publicItem.id, currency: "EUR" }),
    );

    await mustFail("anon cannot read item.notes", () => anon.from("item").select("notes"));
    await mustFail("anon cannot read item.wanted_finish", () => anon.from("item").select("wanted_finish"));
    await mustFail("anon cannot select * from item", () => anon.from("item").select("*"));
    await mustFail("anon cannot read purchase", () => anon.from("purchase").select("id"));
    await mustFail("anon cannot read app_owner", () => anon.from("app_owner").select("user_id"));

    await mustFail("anon cannot upload to storage", async () => {
      const { error } = await anon.storage
        .from("product-images")
        .upload(`items/${publicItem.id}/anon.webp`, new Blob([new Uint8Array([1, 2, 3])]), {
          contentType: "image/webp",
        });
      return { error };
    });

    await mustReturnRows("anon sees the public item", 1, () =>
      anon.from("item").select("id,name").eq("id", publicItem.id),
    );
    await mustReturnRows("anon cannot see the private item", 0, () =>
      anon.from("item").select("id,name").eq("id", privateItem.id),
    );
    const matched = await anon.rpc("match_items", { query_title: "RLS probe private", max_results: 5 });
    const matchedIds = (matched.data ?? []).map((row: { id: string }) => row.id);
    results.push({
      name: "anon match_items hides private items",
      passed: !matched.error && !matchedIds.includes(privateItem.id) && matchedIds.includes(publicItem.id),
      detail: matched.error
        ? String(matched.error.message)
        : `returned ${matchedIds.length}: public=${matchedIds.includes(publicItem.id)} private=${matchedIds.includes(privateItem.id)}`,
    });
    await mustSucceed("anon can read the best-price view", () =>
      anon.from("item_best_price").select("item_id").limit(1),
    );
  } finally {
    await admin.from("item").delete().in("id", [publicItem.id, privateItem.id]);
  }

  const width = Math.max(...results.map((r) => r.name.length));
  for (const { name, passed, detail } of results) {
    console.log(`${passed ? "PASS" : "FAIL"}  ${name.padEnd(width)}  ${detail}`);
  }

  const failed = results.filter((r) => !r.passed);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
