/**
 * Apply multi-tenant SQL migrations via direct Postgres connection.
 *
 * Requires in .env:
 *   SUPABASE_DB_PASSWORD  (Project Settings → Database → Database password)
 *   SUPABASE_PROJECT_ID   (already present)
 *
 * Usage:
 *   node scripts/apply-migrations.mjs
 */
import pg from "pg";
import { readFileSync, readdirSync } from "node:fs";
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

const projectId = process.env.SUPABASE_PROJECT_ID || process.env.VITE_SUPABASE_PROJECT_ID;
const password = process.env.SUPABASE_DB_PASSWORD;

if (!projectId || !password) {
  console.error(
    "Missing SUPABASE_PROJECT_ID or SUPABASE_DB_PASSWORD.\n" +
      "Add the database password from Supabase → Project Settings → Database.",
  );
  process.exit(1);
}

const files = readdirSync(resolve(process.cwd(), "supabase/migrations"))
  .filter((f) => f.endsWith(".sql") && f.startsWith("20261022"))
  .sort();

if (!files.length) {
  console.error("No 20261022* migration files found.");
  process.exit(1);
}

const hosts = [
  {
    label: "pooler-session",
    host: `aws-0-ap-northeast-1.pooler.supabase.com`,
    port: 5432,
    user: `postgres.${projectId}`,
  },
  {
    label: "pooler-transaction",
    host: `aws-0-ap-northeast-1.pooler.supabase.com`,
    port: 6543,
    user: `postgres.${projectId}`,
  },
  {
    label: "direct",
    host: `db.${projectId}.supabase.co`,
    port: 5432,
    user: "postgres",
  },
];

let client;
let lastErr;
for (const h of hosts) {
  const c = new pg.Client({
    host: h.host,
    port: h.port,
    database: "postgres",
    user: h.user,
    password,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await c.connect();
    client = c;
    console.log("Connected via", h.label);
    break;
  } catch (err) {
    lastErr = err;
    console.warn("Failed", h.label + ":", err.message);
    try {
      await c.end();
    } catch {
      // ignore
    }
  }
}

if (!client) {
  console.error("Could not connect to Postgres.", lastErr?.message ?? "");
  process.exit(1);
}

console.log("Applying:", files.join(", "));

try {
  for (const file of files) {
    const sql = readFileSync(resolve(process.cwd(), "supabase/migrations", file), "utf8");
    console.log("\n>>>", file);
    // Enum ADD VALUE must commit before use — run each file in its own transaction
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("COMMIT");
      console.log("OK", file);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  }
  console.log("\nAll multi-tenant migrations applied.");
} finally {
  await client.end();
}
