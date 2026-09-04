"use client";

import { useState } from "react";
import { ItemDialog } from "@/components/item-dialog";

export function OpenItem({
  itemId,
  className,
  label,
  children,
}: {
  itemId: string;
  className?: string;
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className} aria-label={label}>
        {children}
      </button>
      <ItemDialog itemId={open ? itemId : null} onClose={() => setOpen(false)} />
    </>
  );
}
