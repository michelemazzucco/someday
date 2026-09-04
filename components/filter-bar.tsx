"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SORTS, type Sort } from "@/lib/queries/filters";

const ALL = "all";

// Base UI renders the raw value in the trigger unless Root is told the labels.
const labels = (values: string[], allLabel: string): Record<string, string> =>
  Object.fromEntries([[ALL, allLabel], ...values.map((value) => [value, value])]);

type Props = { facets: { designers: string[]; brands: string[]; tags: string[] } };

export function FilterBar({ facets }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  const update = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value === null || value === "" || value === ALL) next.delete(key);
      else next.set(key, value);
      router.push(next.size ? `/?${next}` : "/", { scroll: false });
    },
    [params, router],
  );

  const anyFilter = [...params.keys()].some((key) => key !== "sort");

  return (
    <div className="flex flex-wrap items-center gap-3 border-b pb-6">
      <Input
        type="search"
        defaultValue={params.get("q") ?? ""}
        placeholder="Search name, designer, brand, tag"
        onChange={(event) => update("q", event.target.value)}
        className="w-full sm:w-72"
      />

      <Select items={SORTS} value={(params.get("sort") as Sort) ?? "recent"} onValueChange={(value) => update("sort", value ?? null)}>
        <SelectTrigger className="w-48" aria-label="Sort">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(SORTS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={labels(facets.designers, "All designers")}
        value={params.get("designer") ?? ALL}
        onValueChange={(value) => update("designer", value ?? null)}
      >
        <SelectTrigger className="w-52" aria-label="Designer">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All designers</SelectItem>
          {facets.designers.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={labels(facets.brands, "All brands")}
        value={params.get("brand") ?? ALL}
        onValueChange={(value) => update("brand", value ?? null)}
      >
        <SelectTrigger className="w-52" aria-label="Brand">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All brands</SelectItem>
          {facets.brands.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Checkbox
          id="soon"
          checked={params.get("soon") === "1"}
          onCheckedChange={(checked) => update("soon", checked ? "1" : null)}
        />
        <Label htmlFor="soon">Soon</Label>
      </div>

      {anyFilter && (
        <Button type="button" size="sm" variant="ghost" onClick={() => router.push("/")}>
          Clear
        </Button>
      )}
    </div>
  );
}
