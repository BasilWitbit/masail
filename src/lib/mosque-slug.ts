import { supabase } from "@/integrations/supabase/client";

export function slugifyMosqueName(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "mosque";
}

function candidateSlug(base: string, n: number): string {
  if (n <= 1) return base;
  const suffix = `-${n}`;
  return `${base.slice(0, Math.max(1, 60 - suffix.length))}${suffix}`;
}

/** Best-effort unique slug from rows the current user can see. Prefer assignMosqueSlug for writes. */
export async function uniqueMosqueSlug(name: string, excludeId?: string): Promise<string> {
  const base = slugifyMosqueName(name);
  const { data, error } = await supabase.from("mosques").select("id, slug");
  if (error) throw error;

  const taken = new Set(
    ((data ?? []) as { id: string; slug: string | null }[])
      .filter((row) => row.slug && row.id !== excludeId)
      .map((row) => row.slug as string),
  );

  let n = 1;
  while (taken.has(candidateSlug(base, n))) n += 1;
  return candidateSlug(base, n);
}

function isUniqueViolation(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  if (err.code === "23505") return true;
  return /duplicate key|unique constraint/i.test(err.message ?? "");
}

/**
 * Persist a unique slug on a mosque row, retrying on unique conflicts
 * (needed when RLS hides other mosques during client-side uniqueness checks).
 */
export async function assignMosqueSlug(mosqueId: string, name: string): Promise<string> {
  const base = slugifyMosqueName(name);
  let firstTry = base;
  try {
    firstTry = await uniqueMosqueSlug(name, mosqueId);
  } catch {
    firstTry = base;
  }

  for (let attempt = 0; attempt < 40; attempt++) {
    const slug = attempt === 0 ? firstTry : candidateSlug(base, attempt + 1);
    const { error } = await supabase.from("mosques").update({ slug }).eq("id", mosqueId);
    if (!error) {
      const { data } = await supabase
        .from("mosques")
        .select("slug")
        .eq("id", mosqueId)
        .maybeSingle();
      if ((data as { slug?: string | null } | null)?.slug === slug) return slug;
      continue;
    }
    if (isUniqueViolation(error)) continue;
    throw new Error(error.message);
  }

  throw new Error("Could not assign a unique signup link for this mosque.");
}

/** Insert a mosque with a unique slug, retrying on unique conflicts. */
export async function insertMosqueWithSlug(payload: {
  name: string;
  address: string;
  city: string | null;
  country: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}): Promise<{ error: string | null }> {
  const base = slugifyMosqueName(payload.name);
  let firstTry = base;
  try {
    firstTry = await uniqueMosqueSlug(payload.name);
  } catch {
    firstTry = base;
  }

  for (let attempt = 0; attempt < 40; attempt++) {
    const slug = attempt === 0 ? firstTry : candidateSlug(base, attempt + 1);
    const { error } = await supabase.from("mosques").insert({ ...payload, slug });
    if (!error) return { error: null };
    if (isUniqueViolation(error)) continue;
    return { error: error.message };
  }
  return { error: "Could not create a unique signup link for this mosque." };
}
