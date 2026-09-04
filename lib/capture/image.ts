import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { IMAGE_BUCKET } from "@/lib/env";

const MAX_BYTES = 8 * 1024 * 1024;
const TIMEOUT_MS = 5000;
const MAX_EDGE = 1600;
const USER_AGENT = "someday/0.1 (personal collection tracker)";

const PRIVATE_HOST = /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1)/i;

export async function storeListingImage(
  supabase: SupabaseClient,
  input: { imageUrl: string; itemId: string; listingId: string },
): Promise<string | null> {
  const { imageUrl, itemId, listingId } = input;

  try {
    const parsed = new URL(imageUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    if (PRIVATE_HOST.test(parsed.hostname)) return null;

    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: "image/*", "user-agent": USER_AGENT },
      redirect: "follow",
    });
    if (!response.ok) return null;
    if (!response.headers.get("content-type")?.startsWith("image/")) return null;

    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared > MAX_BYTES) return null;

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > MAX_BYTES) return null;

    const webp = await sharp(bytes)
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const path = `items/${itemId}/${listingId}.webp`;
    const { error } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, webp, { contentType: "image/webp", upsert: true });

    return error ? null : path;
  } catch {
    return null;
  }
}

