"use client";

import { useEffect, useState } from "react";
import { fetchItemDetail, type ItemDetail } from "@/app/actions";
import { ItemImage } from "@/components/item-image";
import { FlagToggle } from "@/components/flag-toggle";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, totalCents } from "@/lib/money";

export function ItemDialog({ itemId, onClose }: { itemId: string | null; onClose: () => void }) {
  const [detail, setDetail] = useState<ItemDetail | null>(null);

  useEffect(() => {
    if (!itemId) {
      setDetail(null);
      return;
    }
    let live = true;
    fetchItemDetail(itemId).then((result) => {
      if (live) setDetail(result);
    });
    return () => {
      live = false;
    };
  }, [itemId]);

  const sorted = [...(detail?.listings ?? [])].sort((a, b) => {
    const left = totalCents(a.price_eur_cents, a.shipping_cents);
    const right = totalCents(b.price_eur_cents, b.shipping_cents);
    if (left === null) return 1;
    if (right === null) return -1;
    return left - right;
  });
  const bestId = sorted.find((listing) => listing.is_active && listing.price_eur_cents !== null)?.id;

  const gallery = detail
    ? [detail.item.cover_image_path, ...detail.listings.map((listing) => listing.image_path)].filter(
        (path, index, all): path is string => Boolean(path) && all.indexOf(path) === index,
      )
    : [];

  function priceRange(listingId: string) {
    const own = (detail?.points ?? [])
      .filter((point) => point.listing_id === listingId && point.price_eur_cents !== null)
      .map((point) => point.price_eur_cents as number);
    if (own.length < 2) return null;
    return `${formatMoney(Math.max(...own))} → ${formatMoney(own.at(-1)!)}`;
  }

  const facts: [string, string | null][] = detail
    ? [
        ["Designer", detail.item.designer],
        ["Brand", detail.item.brand],
        ["Designed", detail.item.design_year ? String(detail.item.design_year) : null],
        ["Dimensions", detail.item.dimensions],
        ["Room", detail.item.room],
        ["Finish wanted", detail.item.wanted_finish ?? null],
      ]
    : [];

  return (
    <Dialog open={itemId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        {!detail ? (
          <DialogHeader>
            <DialogTitle>Loading</DialogTitle>
            <DialogDescription>Fetching the object and its offers.</DialogDescription>
          </DialogHeader>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{detail.item.name}</DialogTitle>
              <DialogDescription>
                {[detail.item.designer, detail.item.brand, detail.item.design_year].filter(Boolean).join(" · ") ||
                  "No attribution yet"}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-3">
                <div className={`relative overflow-hidden rounded-md border ${gallery.length ? "aspect-square" : "h-32"}`}>
                  <ItemImage path={gallery[0] ?? null} alt={detail.item.name} sizes="(max-width: 768px) 100vw, 40vw" />
                </div>
                {gallery.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {gallery.slice(1).map((path) => (
                      <div key={path} className="relative aspect-square overflow-hidden rounded border">
                        <ItemImage path={path} alt={detail.item.name} sizes="80px" compact />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-4">
                {detail.isOwner ? (
                  <div className="flex items-center gap-5">
                    <FlagToggle itemId={detail.item.id} field="owned" value={detail.item.owned} label="Owned" />
                    <FlagToggle itemId={detail.item.id} field="soon" value={detail.item.soon} label="Soon" />
                  </div>
                ) : (
                  (detail.item.owned || detail.item.soon) && (
                    <div className="flex gap-1">
                      {detail.item.owned && <Badge variant="outline">Owned</Badge>}
                      {detail.item.soon && <Badge>Soon</Badge>}
                    </div>
                  )
                )}

                <dl className="grid grid-cols-[8rem_1fr] gap-y-1.5 text-sm">
                  {facts
                    .filter(([, value]) => value)
                    .map(([label, value]) => (
                      <div key={label} className="contents">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                </dl>

                {detail.item.notes && (
                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-medium">Notes</h3>
                    <p className="text-sm text-muted-foreground">{detail.item.notes}</p>
                  </div>
                )}

                {detail.purchases.map((purchase) => (
                  <div key={purchase.id} className="flex flex-col gap-1">
                    <h3 className="text-sm font-medium">Bought</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatMoney(purchase.paid_cents, purchase.currency)}
                      {purchase.bought_from && ` from ${purchase.bought_from}`}
                      {purchase.bought_at && `, ${purchase.bought_at}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">
                {detail.listings.length} {detail.listings.length === 1 ? "offer" : "offers"}, cheapest total first
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Retailer</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>History</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((listing) => (
                    <TableRow key={listing.id}>
                      <TableCell>
                        <a
                          href={listing.source_url ?? listing.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="hover:underline"
                        >
                          {listing.retailer}
                        </a>
                        {listing.id === bestId && (
                          <Badge variant="secondary" className="ml-2">
                            best
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{listing.variant ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {listing.in_stock === null ? "—" : listing.in_stock ? "in stock" : "out of stock"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{priceRange(listing.id) ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <div>{formatMoney(totalCents(listing.price_eur_cents, listing.shipping_cents))}</div>
                        <div className="text-xs text-muted-foreground">
                          {listing.shipping_cents === null
                            ? "shipping unknown"
                            : listing.shipping_cents > 0
                              ? `incl. ${formatMoney(listing.shipping_cents)} shipping`
                              : "free shipping"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
