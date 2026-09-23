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

export async function uniqueMosqueSlug(name: string, excludeId?: string): Promise<string> {
  const base = slugifyMosqueName(name);
  const { data, error } = await supabase.from("mosques").select("id, slug");
  if (error) throw error;

  const taken = new Set(
    ((data ?? []) as { id: string; slug: string | null }[])
      .filter((row) => row.slug && row.id !== excludeId)
      .map((row) => row.slug as string),
  );

  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
