import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const NAV = [
  { href: "/", label: "Collection" },
  { href: "/owned", label: "Owned" },
];

export async function SiteHeader() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4">
        <Link href="/" className="font-medium">
          Someday
        </Link>
        <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {NAV.map((entry) => (
            <Link key={entry.href} href={entry.href} className="hover:text-foreground">
              {entry.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto text-sm text-muted-foreground">
          {data.user ? (
            "Signed in"
          ) : (
            <Link href="/login" className="hover:text-foreground">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
