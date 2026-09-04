// The reference must be a literal `process.env.NEXT_PUBLIC_X`: Next inlines those
// into the client bundle at build time by textual substitution. Reading through a
// dynamic key (process.env[name]) is never replaced, so it is undefined in the browser.
function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export const SUPABASE_URL = () =>
  required(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");

export const SUPABASE_ANON_KEY = () =>
  required(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY");

export const SUPABASE_SERVICE_ROLE_KEY = () =>
  required(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY");

export const IMAGE_BUCKET = "product-images";
