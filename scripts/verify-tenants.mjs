/**
 * Post-cutover smoke checks (requires SUPABASE_SERVICE_ROLE_KEY).
 * Usage: node scripts/verify-tenants.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const text = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    let value = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Need SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const { data: tenants, error: tErr } = await admin.from("tenants").select("id, slug, name, is_active");
  if (tErr) throw tErr;
  console.log("tenants:", tenants?.length ?? 0, tenants);

  const { data: sas, error: sErr } = await admin
    .from("profiles")
    .select("id, email, full_name, tenant_id, role")
    .eq("role", "super_admin");
  if (sErr) throw sErr;
  console.log("super_admins:", sas?.length ?? 0);
  for (const sa of sas ?? []) {
    if (!sa.tenant_id) console.warn("  MISSING tenant_id:", sa.email);
  }

  const { data: ssa } = await admin
    .from("profiles")
    .select("id, email")
    .eq("role", "super_super_admin");
  console.log("SSA accounts:", ssa);

  const { count: orphanMosques } = await admin
    .from("mosques")
    .select("id", { count: "exact", head: true })
    .is("tenant_id", null);
  console.log("mosques missing tenant_id:", orphanMosques);

  const { data: cats } = await admin.from("categories").select("id, tenant_id").limit(5);
  console.log("sample categories:", cats);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
