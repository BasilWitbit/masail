import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const HEX = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

const brandingSchema = z.object({
  primary_color: z.string().regex(HEX, "Invalid primary color"),
  secondary_color: z.string().regex(HEX, "Invalid secondary color"),
  logo_url: z.string().nullable().optional(),
  heading_font: z.string().min(1).max(80),
  body_font: z.string().min(1).max(80),
});

const RESERVED_TENANT_SLUGS = new Set([
  "ssa",
  "login",
  "signup",
  "verify-otp",
  "dashboard",
  "tenant-unavailable",
  "api",
  "qa",
]);

function slugifyName(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "tenant";
}

type AdminClient = Awaited<ReturnType<typeof assertIsSsa>>;

async function assertIsSsa(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data?.role !== "super_super_admin") {
    throw new Error("Unauthorized: platform owner access required.");
  }
  return supabaseAdmin;
}

async function uniqueTenantSlug(admin: AdminClient, name: string): Promise<string> {
  const base = slugifyName(name);
  for (let n = 1; n < 200; n++) {
    const suffix = n === 1 ? "" : `-${n}`;
    const candidate = `${base.slice(0, 60 - suffix.length)}${suffix}`;
    if (RESERVED_TENANT_SLUGS.has(candidate)) continue;
    const { data, error } = await admin
      .from("tenants")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return candidate;
  }
  throw new Error("Could not generate a unique tenant slug.");
}

async function tenantIdForSa(admin: AdminClient, saId: string): Promise<string> {
  const { data, error } = await admin
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", saId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.role !== "super_admin" || !data.tenant_id) {
    throw new Error("Super admin tenant not found.");
  }
  return data.tenant_id;
}

async function rollbackAuthUser(admin: AdminClient, userId: string | undefined) {
  if (!userId) return;
  try {
    await admin.auth.admin.deleteUser(userId);
  } catch {
    // best-effort cleanup
  }
}

async function logActivity(
  admin: AdminClient,
  actorId: string,
  action: string,
  targetTable: string,
  targetId: string | null,
  tenantId: string | null,
  metadata: Record<string, unknown> = {},
) {
  try {
    await admin.from("activity_logs").insert({
      actor_id: actorId,
      action,
      target_table: targetTable,
      target_id: targetId,
      tenant_id: tenantId,
      metadata,
    } as never);
  } catch {
    // optional table / best-effort
  }
}

export const createSuperAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        email: z.string().email(),
        first_name: z.string().min(1).max(80),
        last_name: z.string().min(1).max(80),
        tenant_name: z.string().min(1).max(120),
        phone: z.string().min(5).max(40),
        password: z.string().min(8),
        branding: brandingSchema.partial().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const admin = await assertIsSsa(context.userId);
    const email = data.email.trim().toLowerCase();
    const fullName = `${data.first_name.trim()} ${data.last_name.trim()}`.trim();
    let createdUserId: string | undefined;
    let tenantId: string | undefined;

    const branding = {
      primary_color: data.branding?.primary_color ?? "#1B4F72",
      secondary_color: data.branding?.secondary_color ?? "#2E86C1",
      logo_url: data.branding?.logo_url ?? null,
      heading_font: data.branding?.heading_font ?? "Montserrat",
      body_font: data.branding?.body_font ?? "Source Sans 3",
    };

    try {
      const slug = await uniqueTenantSlug(admin, data.tenant_name);
      const { data: tenant, error: tenantError } = await admin
        .from("tenants")
        .insert({
          name: data.tenant_name.trim(),
          slug,
          logo_url: branding.logo_url,
          primary_color: branding.primary_color,
          secondary_color: branding.secondary_color,
          heading_font: branding.heading_font,
          body_font: branding.body_font,
          is_active: true,
          created_by: context.userId,
        })
        .select("id, slug")
        .single();
      if (tenantError) throw new Error(tenantError.message);
      tenantId = tenant.id;

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          first_name: data.first_name.trim(),
          last_name: data.last_name.trim(),
        },
      });
      if (createError) throw new Error(createError.message);
      createdUserId = created.user?.id;
      if (!createdUserId) throw new Error("Failed to create auth user.");

      const { error: profileError } = await admin.from("profiles").upsert({
        id: createdUserId,
        email,
        full_name: fullName,
        phone: data.phone.trim(),
        role: "super_admin",
        tenant_id: tenantId,
        approval_status: "approved",
        must_change_password: true,
      });
      if (profileError) throw new Error(profileError.message);

      await logActivity(admin, context.userId, "ssa_create_super_admin", "tenants", tenantId, tenantId, {
        email,
        sa_id: createdUserId,
      });

      return { id: createdUserId, tenant_id: tenantId, slug: tenant.slug };
    } catch (error) {
      await rollbackAuthUser(admin, createdUserId);
      if (tenantId) {
        try {
          await admin.from("tenants").delete().eq("id", tenantId);
        } catch {
          // best-effort
        }
      }
      throw error;
    }
  });

export const updateSuperAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        sa_id: z.string().uuid(),
        first_name: z.string().min(1).max(80).optional(),
        last_name: z.string().min(1).max(80).optional(),
        full_name: z.string().min(1).max(160).optional(),
        tenant_name: z.string().min(1).max(120).optional(),
        phone: z.string().max(40).optional().nullable(),
        branding: brandingSchema.partial().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const admin = await assertIsSsa(context.userId);
    const tenantId = await tenantIdForSa(admin, data.sa_id);

    const profilePatch: { full_name?: string; phone?: string | null } = {};
    if (data.first_name !== undefined || data.last_name !== undefined) {
      const { data: existing } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", data.sa_id)
        .maybeSingle();
      const parts = (existing?.full_name ?? "").trim().split(/\s+/);
      const first = data.first_name ?? parts[0] ?? "";
      const last =
        data.last_name ?? (parts.length > 1 ? parts.slice(1).join(" ") : "");
      profilePatch.full_name = `${first} ${last}`.trim();
    } else if (data.full_name !== undefined) {
      profilePatch.full_name = data.full_name.trim();
    }
    if (data.phone !== undefined) profilePatch.phone = data.phone?.trim() || null;
    if (Object.keys(profilePatch).length > 0) {
      const { error } = await admin.from("profiles").update(profilePatch).eq("id", data.sa_id);
      if (error) throw new Error(error.message);
    }

    const tenantPatch: Record<string, string | null> = {};
    if (data.tenant_name !== undefined) tenantPatch.name = data.tenant_name.trim();
    if (data.branding) {
      for (const [key, value] of Object.entries(data.branding)) {
        if (value !== undefined) tenantPatch[key] = value as string | null;
      }
    }
    if (Object.keys(tenantPatch).length > 0) {
      const { error } = await admin
        .from("tenants")
        .update({ ...tenantPatch, updated_at: new Date().toISOString() })
        .eq("id", tenantId);
      if (error) throw new Error(error.message);
    }

    await logActivity(admin, context.userId, "ssa_update_super_admin", "tenants", tenantId, tenantId, {
      sa_id: data.sa_id,
    });

    return { ok: true };
  });

export const resetSuperAdminPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ sa_id: z.string().uuid(), password: z.string().min(8) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const admin = await assertIsSsa(context.userId);
    const tenantId = await tenantIdForSa(admin, data.sa_id);

    const { error } = await admin.auth.admin.updateUserById(data.sa_id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);

    await admin.from("profiles").update({ must_change_password: true }).eq("id", data.sa_id);
    await logActivity(
      admin,
      context.userId,
      "ssa_reset_super_admin_password",
      "profiles",
      data.sa_id,
      tenantId,
    );
    return { ok: true };
  });

/** Deactivate/reactivate tenant via is_active only (no auth ban). */
export const setSuperAdminActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ sa_id: z.string().uuid(), active: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const admin = await assertIsSsa(context.userId);
    const tenantId = await tenantIdForSa(admin, data.sa_id);
    const now = new Date().toISOString();

    const { error } = await admin
      .from("tenants")
      .update({
        is_active: data.active,
        deactivated_at: data.active ? null : now,
        deactivated_by: data.active ? null : context.userId,
        updated_at: now,
      })
      .eq("id", tenantId);
    if (error) throw new Error(error.message);

    await logActivity(
      admin,
      context.userId,
      data.active ? "ssa_activate_tenant" : "ssa_deactivate_tenant",
      "tenants",
      tenantId,
      tenantId,
      { sa_id: data.sa_id },
    );

    return { ok: true };
  });
