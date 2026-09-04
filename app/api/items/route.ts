import { bearerFromRequest, createBearerClient } from "@/lib/supabase/bearer";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { ITEM_PUBLIC_COLUMNS } from "@/lib/queries/items";

const SEARCH_LIMIT = 20;

export async function GET(request: Request) {
  const token = bearerFromRequest(request);
  const supabase = token
    ? createBearerClient(token)
    : createAnonClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
        auth: { persistSession: false },
      });

  const query = new URL(request.url).searchParams.get("q")?.trim();

  if (!query) {
    const { data, error } = await supabase
      .from("item")
      .select(ITEM_PUBLIC_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(SEARCH_LIMIT);

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ items: data ?? [] });
  }

  const { data, error } = await supabase.rpc("match_items", {
    query_title: query,
    max_results: SEARCH_LIMIT,
  });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ items: data ?? [] });
}
