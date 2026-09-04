"use client";

import { useId, useOptimistic, useState, useTransition } from "react";
import { setItemFlag } from "@/app/actions";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function FlagToggle({
  itemId,
  field,
  value,
  label,
}: {
  itemId: string;
  field: "owned" | "soon";
  value: boolean;
  label: string;
}) {
  const [optimistic, setOptimistic] = useOptimistic(value);
  const [, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  const id = useId();

  return (
    <div className="flex items-center gap-2">
      <Switch
        id={id}
        checked={optimistic}
        onCheckedChange={(checked) =>
          startTransition(async () => {
            setOptimistic(checked);
            setFailed(false);
            const result = await setItemFlag(itemId, field, checked);
            if (result.error) setFailed(true);
          })
        }
      />
      <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      {failed && (
        <span role="alert" className="text-xs text-destructive">
          not saved
        </span>
      )}
    </div>
  );
}
