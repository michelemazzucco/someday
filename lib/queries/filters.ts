export const SORTS = {
  best_price: "Best price",
  highest_price: "Highest price",
  recent: "Recently added",
  drop: "Biggest price drop",
  designer: "Designer",
  year: "Design year",
} as const;

export type Sort = keyof typeof SORTS;

export type Filters = {
  q: string | null;
  owned: boolean;
  designer: string[];
  brand: string[];
  tag: string[];
  soon: boolean;
  sort: Sort;
};

const list = (value: string | string[] | undefined): string[] =>
  (Array.isArray(value) ? value : value ? value.split(",") : []).filter(Boolean);

export function parseFilters(params: Record<string, string | string[] | undefined>): Filters {
  const sort = (Array.isArray(params.sort) ? params.sort[0] : params.sort) as Sort;
  const q = Array.isArray(params.q) ? params.q[0] : params.q;

  return {
    q: q?.trim() || null,
    owned: params.owned === "1",
    designer: list(params.designer),
    brand: list(params.brand),
    tag: list(params.tag),
    soon: params.soon === "1",
    sort: sort in SORTS ? sort : "recent",
  };
}

export function toSearchParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  for (const key of ["designer", "brand", "tag"] as const) {
    if (filters[key].length) params.set(key, filters[key].join(","));
  }
  if (filters.soon) params.set("soon", "1");
  if (filters.owned) params.set("owned", "1");
  if (filters.sort !== "recent") params.set("sort", filters.sort);
  return params;
}

export function isFiltered(filters: Filters): boolean {
  return (
    Boolean(filters.q) ||
    filters.designer.length > 0 ||
    filters.brand.length > 0 ||
    filters.tag.length > 0 ||
    filters.soon ||
    filters.owned
  );
}
