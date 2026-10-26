import pg from "pg";
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

const projectId = process.env.SUPABASE_PROJECT_ID;
const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error("Pass SUPABASE_DB_PASSWORD in the environment for this run only.");
  process.exit(1);
}

const regions = [
  "ap-northeast-1",
  "ap-southeast-1",
  "us-east-1",
  "us-west-1",
  "eu-west-1",
  "eu-central-1",
  "ap-south-1",
];

const attempts = [];
for (const r of regions) {
  attempts.push({
    label: `sess-${r}`,
    host: `aws-0-${r}.pooler.supabase.com`,
    port: 5432,
    user: `postgres.${projectId}`,
  });
  attempts.push({
    label: `txn-${r}`,
    host: `aws-0-${r}.pooler.supabase.com`,
    port: 6543,
    user: `postgres.${projectId}`,
  });
}
attempts.push({
  label: "direct",
  host: `db.${projectId}.supabase.co`,
  port: 5432,
  user: "postgres",
});

for (const h of attempts) {
  const c = new pg.Client({
    host: h.host,
    port: h.port,
    database: "postgres",
    user: h.user,
    password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  try {
    await c.connect();
    const r = await c.query("select current_database() as db, current_user as u");
    console.log("OK", h.label, JSON.stringify(r.rows[0]));
    await c.end();
    process.exit(0);
  } catch (e) {
    console.log("FAIL", h.label, String(e.message).split("\n")[0]);
    try {
      await c.end();
    } catch {
      // ignore
    }
  }
}
process.exit(1);
