/**
 * One-time bootstrap: create (or promote) the platform owner (SSA).
 *
 * Requires in .env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/bootstrap-ssa.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env");
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const email = process.env.SSA_EMAIL || "islamicqa@gmail.com";
const password = process.env.SSA_PASSWORD || "Admin@!@#4";
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env. Add the service role key from Supabase → Project Settings → API (or Lovable Cloud).",
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const { data: listed } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existing = listed?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  let userId = existing?.id;
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Platform Owner" },
    });
    if (error) throw error;
    userId = data.user.id;
    console.log("Created auth user", userId);
  } else {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    if (error) throw error;
    console.log("Updated existing auth user", userId);
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: userId,
    email: email.toLowerCase(),
    role: "super_super_admin",
    full_name: "Platform Owner",
    mosque_id: null,
    tenant_id: null,
    approval_status: "approved",
    must_change_password: false,
  });
  if (profileError) throw profileError;

  console.log("SSA ready:");
  console.log("  email:", email);
  console.log("  role: super_super_admin");
  console.log("  login: /login → redirects to /ssa");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
