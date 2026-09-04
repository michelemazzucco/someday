
export type Item = {
  id: string;
  name: string;
  designer: string | null;
  brand: string | null;
  design_year: number | null;
  owned: boolean;
  soon: boolean;
  room: string | null;
  dimensions: string | null;
  cover_image_path: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  wanted_finish?: string | null;
  notes?: string | null;
};

export type Listing = {
  id: string;
  item_id: string;
  url: string;
  source_url: string | null;
  retailer: string;
  retailer_favicon: string | null;
  captured_title: string | null;
  variant: string | null;
  price_cents: number | null;
  currency: string;
  price_eur_cents: number | null;
  shipping_cents: number | null;
  in_stock: boolean | null;
  image_url: string | null;
  image_path: string | null;
  is_active: boolean;
  first_seen_at: string;
  last_seen_at: string;
};

export type MatchCandidate = Pick<
  Item,
  "id" | "name" | "designer" | "brand" | "design_year" | "owned" | "soon" | "cover_image_path"
> & { score: number };

export type ItemOverview = Pick<
  Item,
  | "id" | "name" | "designer" | "brand" | "design_year"
  | "owned" | "soon" | "room" | "dimensions" | "cover_image_path"
  | "is_public" | "created_at" | "updated_at"
> & {
  best_listing_id: string | null;
  best_total_eur_cents: number | null;
  best_retailer: string | null;
  drop_eur_cents: number | null;
  tags: string[];
  listing_count: number;
};

export type Purchase = {
  id: string;
  item_id: string;
  bought_at: string | null;
  paid_cents: number | null;
  currency: string;
  bought_from: string | null;
  receipt_note: string | null;
};
