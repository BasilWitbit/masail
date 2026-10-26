import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Invalid session" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return json({ error: "Invalid session" }, 401);
    }

    const { data: caller } = await admin
      .from("profiles")
      .select("role, tenant_id, mosque_id")
      .eq("id", userData.user.id)
      .maybeSingle();

    const isSsa = caller?.role === "super_super_admin";
    const isSa = caller?.role === "super_admin" && caller.tenant_id;
    const isMa = caller?.role === "mosque_admin" && caller.mosque_id && caller.tenant_id;
    if (!isSsa && !isSa && !isMa) {
      return json({ error: "Not authorized to create shaykhs." }, 403);
    }

    const body = await req.json();
    const full_name = String(body.full_name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    let mosque_id = String(body.mosque_id ?? caller?.mosque_id ?? "").trim();

    if (!full_name || !email || !password || !mosque_id) {
      return json({ error: "Missing required fields." }, 400);
    }

    const { data: mosque, error: mosqueError } = await admin
      .from("mosques")
      .select("id, tenant_id")
      .eq("id", mosque_id)
      .maybeSingle();
    if (mosqueError || !mosque) {
      return json({ error: "Mosque not found." }, 404);
    }
    if (!isSsa && mosque.tenant_id !== caller!.tenant_id) {
      return json({ error: "Mosque is outside your tenant." }, 403);
    }
    if (isMa && mosque.id !== caller!.mosque_id) {
      return json({ error: "You may only create shaykhs for your mosque." }, 403);
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (createError) {
      return json({ error: createError.message }, 400);
    }
    const userId = created.user?.id;
    if (!userId) return json({ error: "Failed to create user." }, 500);

    const { error: profileError } = await admin.from("profiles").upsert({
      id: userId,
      email,
      full_name,
      role: "shaykh",
      mosque_id: null,
      tenant_id: mosque.tenant_id,
      approval_status: "approved",
      must_change_password: true,
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(userId);
      return json({ error: profileError.message }, 400);
    }

    const { error: shaykhError } = await admin.from("shaykhs").insert({
      profile_id: userId,
      mosque_id: mosque.id,
      tenant_id: mosque.tenant_id,
      is_active: true,
    });
    if (shaykhError) {
      await admin.auth.admin.deleteUser(userId);
      return json({ error: shaykhError.message }, 400);
    }

    return json({ id: userId });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
