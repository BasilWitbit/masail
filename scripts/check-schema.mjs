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
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const checks = [
  ["tenants", () => admin.from("tenants").select("id").limit(1)],
  ["profiles.tenant_id", () => admin.from("profiles").select("id, tenant_id").limit(1)],
  ["ssa role", () => admin.from("profiles").select("id, email, role").eq("role", "super_super_admin")],
];

for (const [label, fn] of checks) {
  const { data, error } = await fn();
  console.log(label + ":", error ? `ERR ${error.message}` : JSON.stringify(data));
}
