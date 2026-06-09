// =====================================================================
// Edge Function: resend-invite
// Reenvia o convite (ou link de recuperacao) para um usuario existente.
// Apenas admins podem chamar. Funciona para:
//   - usuario que ainda nao aceitou o convite -> reenvia o convite
//   - usuario ja confirmado -> envia link de recuperacao (mesmo fluxo)
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

    // 1. Confirmar quem chamou pelo token do Authorization
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
      return json({ ok: false, error: "Apenas administradores podem reenviar convites" }, 403);
    }

    // 3. Validar entrada
    const body = await req.json();
    const email = (body.email || "").toString().trim().toLowerCase();
    const redirectTo = body.redirectTo || undefined;
    // Erros de regra de negocio retornam HTTP 200 com ok:false para o
    // supabase-js entregar a mensagem em vez de embrulhar num "non-2xx".
    if (!email) return json({ ok: false, error: "Email obrigatorio" });

    // 4. Confirmar que o email existe em profiles (evita disparar email para
    // qualquer endereco do mundo via essa funcao)
    const { data: target } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (!target) return json({ ok: false, error: "Usuario nao encontrado na lista" });

    // Transforma erro do Supabase em mensagem amigavel em portugues
    const friendly = (raw: string | undefined): string => {
      if (!raw) return "Nao foi possivel enviar o email. Tente de novo em alguns minutos.";
      const m = raw.toLowerCase();
      // Cooldown por email: "For security purposes, you can only request this after N seconds"
      const secMatch = m.match(/after (\d+) seconds?/);
      if (secMatch) {
        return `Aguarde ${secMatch[1]} segundos antes de reenviar para este email.`;
      }
      if (/for security purposes/.test(m)) {
        return "Aguarde alguns segundos antes de reenviar para este email.";
      }
      // Limite por hora / outros rate limits
      if (/rate|limit|too many|over.*quota/.test(m)) {
        return "Limite de emails atingido (Supabase libera poucos por hora). Aguarde alguns minutos antes de tentar de novo.";
      }
      if (/not found|does not exist/.test(m)) return "Usuario nao encontrado";
      if (/invalid.*email/.test(m)) return "Email invalido";
      // Fallback: qualquer outro erro em ingles vira mensagem generica em portugues
      return "Nao foi possivel enviar o email. Tente de novo em alguns minutos.";
    };

    // 5. Tenta reenviar convite (so funciona se o usuario nao confirmou ainda)
    const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (!inviteErr) return json({ ok: true, mode: "invite" });

    // 6. Fallback: usuario ja confirmou -> envia link de recuperacao de senha
    //    (a tela SetPassword aceita os dois fluxos, type=invite ou type=recovery)
    const { error: recoveryErr } = await admin.auth.resetPasswordForEmail(email, { redirectTo });
    if (recoveryErr) {
      return json({ ok: false, error: friendly(recoveryErr.message) });
    }
    return json({ ok: true, mode: "recovery" });
  } catch (e) {
    return json({ ok: false, error: String((e as Error)?.message || e) }, 500);
  }
});
