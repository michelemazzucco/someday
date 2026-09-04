import { IMAGE_BUCKET } from "@/lib/env";

/**
 * Kept apart from lib/capture/image.ts on purpose: that module imports sharp, and
 * this helper is used by client components. Importing it from there drags a native
 * Node dependency into the browser bundle.
 */
export function publicImageUrl(supabaseUrl: string, path: string | null): string | null {
  if (!path) return null;
  return `${supabaseUrl}/storage/v1/object/public/${IMAGE_BUCKET}/${path}`;
}
