import Link from "next/link";
import { OpenItem } from "@/components/open-item";
import { createClient } from "@/lib/supabase/server";
import { listItems, getPurchases } from "@/lib/queries/items";
import { parseFilters } from "@/lib/queries/filters";
import { ItemImage } from "@/components/item-image";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/money";

export default async function OwnedPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16 text-center text-sm text-muted-foreground">
        What I paid is private.{" "}
        <Link href="/login" className="underline">
          Sign in
        </Link>
        .
      </div>
    );
  }

  const items = await listItems(supabase, { ...parseFilters({}), owned: true });
  const purchases = await getPurchases(supabase, items.map((item) => item.id));
  const paid = purchases.reduce((sum, purchase) => sum + (purchase.paid_cents ?? 0), 0);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex flex-col gap-1 pb-6">
        <h1 className="text-2xl font-semibold">Owned</h1>
        <p className="text-sm text-muted-foreground">
          {items.length} pieces, {formatMoney(paid)} paid
        </p>
      </div>

      {items.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Nothing owned yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead colSpan={2}>Object</TableHead>
              <TableHead>Where</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Now</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const bought = purchases.filter((purchase) => purchase.item_id === item.id);
              const spent = bought.reduce((sum, purchase) => sum + (purchase.paid_cents ?? 0), 0);

              return (
                <TableRow key={item.id}>
                  <TableCell colSpan={2}>
                    <OpenItem itemId={item.id} label={item.name} className="flex cursor-pointer items-center gap-3 text-left">
                      <span className="relative block aspect-square w-14 shrink-0 overflow-hidden rounded border">
                        <ItemImage path={item.cover_image_path} alt={item.name} sizes="56px" compact />
                      </span>
                      <span>
                        <span className="block font-medium hover:underline">{item.name}</span>
                        <span className="block text-xs text-muted-foreground">{item.designer}</span>
                      </span>
                    </OpenItem>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {[item.room, bought[0]?.bought_from, bought[0]?.bought_at].filter(Boolean).join(" · ") || "—"}
                  </TableCell>
                  <TableCell className="text-right">{spent ? formatMoney(spent) : "—"}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatMoney(item.best_total_eur_cents)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
