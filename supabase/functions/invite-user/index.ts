// =====================================================================
// Edge Function: invite-user
// Convida um novo usuario. Apenas admins podem chamar.
// Cria o usuario no Supabase Auth (com email de convite) e o registro
// correspondente em profiles.
// =====================================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 1. Identificar quem chamou, pelo token do header Authorization
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const callerClient = createClient(supabaseUrl, anonKey);
    const { data: { user: caller } } = await callerClient.auth.getUser(token);
    if (!caller) return json({ ok: false, error: "Nao autenticado" }, 401);

    // 2. Confirmar que o chamador e admin ativo
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("role, active")
      .eq("id", caller.id)
      .maybeSingle();
    if (!callerProfile || callerProfile.role !== "admin" || !callerProfile.active) {
      return json({ ok: false, error: "Apenas administradores podem convidar" }, 403);
    }

    // 3. Ler e validar o corpo
    const body = await req.json();
    const email = (body.email || "").trim().toLowerCase();
    const name = (body.name || "").trim() || null;
    const role = body.role;
    const allowedPages = Array.isArray(body.allowed_pages) ? body.allowed_pages : [];
    const redirectTo = body.redirectTo || undefined;
    if (!email) return json({ ok: false, error: "Email obrigatorio" }, 400);
    if (!["admin", "editor", "viewer"].includes(role)) {
      return json({ ok: false, error: "Papel invalido" }, 400);
    }

    // 4. Convidar via Supabase Auth (envia o email de convite)
    const { data: invited, error: inviteErr } =
      await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (inviteErr || !invited?.user) {
      return json({ ok: false, error: inviteErr?.message || "Falha ao convidar" }, 400);
    }

    // 5. Criar o registro em profiles
    const { error: profileErr } = await admin.from("profiles").insert({
      id: invited.user.id,
      email,
      name,
      role,
      allowed_pages: allowedPages,
      active: true,
    });
    if (profileErr) {
      return json({ ok: false, error: profileErr.message }, 400);
    }

    return json({ ok: true, user_id: invited.user.id });
  } catch (e) {
    return json({ ok: false, error: String((e as Error)?.message || e) }, 500);
  }
});
