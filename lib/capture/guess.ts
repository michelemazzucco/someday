const SEPARATORS = /\s*[|•·–—]\s*|\s+[-]\s+/;
const NOISE = /\b(buy|shop|online|sale|free shipping|official|authorised dealer|in stock)\b/gi;

function findKnown(title: string, known: string[]): string | null {
  const haystack = title.toLowerCase();
  const hit = known
    .filter((candidate) => candidate && haystack.includes(candidate.toLowerCase()))
    .sort((a, b) => b.length - a.length)[0];
  return hit ?? null;
}

/**
 * Best-effort only. Case 3 of the capture API hands the item straight back for editing,
 * so a wrong guess costs one correction, not a bad row.
 */
export function guessItemFields(
  title: string,
  known: { designers: string[]; brands: string[] },
): { name: string; designer: string | null; brand: string | null } {
  const cleaned = title.replace(NOISE, " ").replace(/\s+/g, " ").trim();
  const segments = cleaned.split(SEPARATORS).map((part) => part.trim()).filter(Boolean);

  const designer =
    findKnown(cleaned, known.designers) ?? cleaned.match(/\bby\s+([A-Z][\w'’.-]+(?:\s+[A-Z][\w'’.-]+){0,2})/)?.[1] ?? null;
  const brand = findKnown(cleaned, known.brands);

  let name = segments[0] ?? cleaned;
  name = name.replace(/\s*\bby\s+.+$/i, "").trim();
  if (designer) name = name.replace(new RegExp(`\\s*${escapeRegex(designer)}\\s*`, "i"), " ").trim();
  if (brand) name = name.replace(new RegExp(`\\s*${escapeRegex(brand)}\\s*`, "i"), " ").trim();
  name = name.replace(/\s+/g, " ").replace(/^[,\-–—:]+|[,\-–—:]+$/g, "").trim();

  return { name: name || cleaned.slice(0, 200), designer, brand };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
