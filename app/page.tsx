import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { listItems, getFacets } from "@/lib/queries/items";
import { parseFilters, isFiltered } from "@/lib/queries/filters";
import { FilterBar } from "@/components/filter-bar";
import { ItemCard } from "@/components/item-card";

export default async function CollectionPage(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const filters = parseFilters(searchParams);

  const supabase = await createClient();
  const [{ data: auth }, items, facets] = await Promise.all([
    supabase.auth.getUser(),
    listItems(supabase, filters),
    getFacets(supabase),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <Suspense>
        <FilterBar facets={facets} />
      </Suspense>

      <p className="py-4 text-sm text-muted-foreground">
        {items.length} {items.length === 1 ? "object" : "objects"}
        {isFiltered(filters) && " matching"}
      </p>

      {items.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Nothing here yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} editable={Boolean(auth.user)} />
          ))}
        </div>
      )}
    </div>
  );
}
