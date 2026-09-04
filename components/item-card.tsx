"use client";

import { useState } from "react";
import { ItemDialog } from "@/components/item-dialog";
import { ItemImage } from "@/components/item-image";
import { FlagToggle } from "@/components/flag-toggle";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import type { ItemOverview } from "@/lib/types";

export function ItemCard({ item, editable }: { item: ItemOverview; editable: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="overflow-hidden py-0">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative block aspect-square w-full cursor-pointer"
        aria-label={item.name}
      >
        <ItemImage
          path={item.cover_image_path}
          alt={item.name}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
      </button>

      <CardContent className="flex flex-col gap-2 px-4 pb-4">
        <div>
          <button type="button" onClick={() => setOpen(true)} className="cursor-pointer text-left text-sm font-medium hover:underline">
            {item.name}
          </button>
          <p className="text-xs text-muted-foreground">
            {[item.designer, item.design_year].filter(Boolean).join(", ") || "Designer unknown"}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-sm">{formatMoney(item.best_total_eur_cents)}</span>
          <span className="text-xs text-muted-foreground">
            {item.listing_count} {item.listing_count === 1 ? "offer" : "offers"}
          </span>
        </div>

        {item.drop_eur_cents !== null && item.drop_eur_cents > 0 && (
          <Badge variant="secondary" className="w-fit">−{formatMoney(item.drop_eur_cents)}</Badge>
        )}

        {editable ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <FlagToggle itemId={item.id} field="owned" value={item.owned} label="Owned" />
            <FlagToggle itemId={item.id} field="soon" value={item.soon} label="Soon" />
          </div>
        ) : (
          (item.owned || item.soon) && (
            <div className="flex flex-wrap gap-1">
              {item.owned && <Badge variant="outline">Owned</Badge>}
              {item.soon && <Badge>Soon</Badge>}
            </div>
          )
        )}
      </CardContent>

      <ItemDialog itemId={open ? item.id : null} onClose={() => setOpen(false)} />
    </Card>
  );
}
