import { config } from "dotenv";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

async function main() {
  const email = process.argv[2] ?? process.env.OWNER_EMAIL;
  if (!email) {
    console.error("Usage: pnpm setup:owner <email>");
    process.exit(1);
  }

  const { data: existing } = await admin.auth.admin.listUsers();
  let user = existing.users.find((candidate) => candidate.email === email);
  let password: string | null = null;

  if (!user) {
    password = randomBytes(18).toString("base64url");
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(error?.message ?? "createUser failed");
    user = data.user;
  }

  const { error } = await admin.from("app_owner").upsert({ user_id: user.id }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);

  console.log(`owner   ${email}`);
  console.log(`uid     ${user.id}`);
  if (password) console.log(`password ${password}\n\nChange it in the Supabase dashboard or with a password reset. It is printed once.`);
  else console.log("password unchanged (user already existed)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
