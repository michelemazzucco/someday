export type Money = { amount: number; currency: string };

export function formatMoney(cents: number | null | undefined, currency = "EUR"): string {
  if (cents === null || cents === undefined) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function totalCents(price: number | null, shipping: number | null): number | null {
  if (price === null) return null;
  return price + (shipping ?? 0);
}

/**
 * v1 converts nothing: price_eur_cents is a snapshot only when the listing is
 * already priced in EUR. fx_rate and fx_rate_date stay null until real rates land.
 */
export function eurSnapshot(money: Money): number | null {
  return money.currency === "EUR" ? money.amount : null;
}
