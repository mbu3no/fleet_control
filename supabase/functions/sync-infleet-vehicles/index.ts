// =====================================================================
// Edge Function: sync-infleet-vehicles
// Sincroniza veículos da Infleet (GraphQL) com a tabela vehicles
// =====================================================================
// Secrets necessários no Supabase (Project Settings > Edge Functions > Secrets):
//   INFLEET_TOKEN              — Bearer token da Infleet
//   SUPABASE_URL               — (Supabase já injeta automaticamente)
//   SUPABASE_SERVICE_ROLE_KEY  — (Supabase já injeta automaticamente)
// =====================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const INFLEET_URL = "https://api.infleet.com.br/v1/graphql";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const infleetToken = Deno.env.get("INFLEET_TOKEN");
    if (!infleetToken) {
      return json({ ok: false, error: "INFLEET_TOKEN secret não configurado" }, 500);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const infleetVehicles = await fetchInfleetVehicles(infleetToken);

    const { data: existing, error: fetchErr } = await supabase
      .from("vehicles")
      .select("id, infleet_id, plate");
    if (fetchErr) throw fetchErr;

    const byInfleetId = new Map<string, { id: number; plate: string }>();
    const byPlate = new Map<string, { id: number; plate: string }>();
    for (const v of existing || []) {
      if (v.infleet_id) byInfleetId.set(v.infleet_id, v);
      if (v.plate) byPlate.set(normalizePlate(v.plate), v);
    }

    const now = new Date().toISOString();
    let inserted = 0;
    let updated = 0;
    const errors: Array<{ plate: string; action: string; error: string }> = [];

    for (const iv of infleetVehicles) {
      const yearNum = iv.year ? parseInt(String(iv.year), 10) : null;
      const payload = {
        infleet_id: iv.id,
        plate: iv.plate,
        model: iv.model,
        year: Number.isFinite(yearNum) ? yearNum : null,
        current_km: iv.odometer != null ? Math.round(iv.odometer * 100) / 100 : 0,
        last_synced_at: now,
      };

      const match =
        byInfleetId.get(iv.id) ||
        byPlate.get(normalizePlate(iv.plate));

      if (match) {
        const { error } = await supabase
          .from("vehicles")
          .update(payload)
          .eq("id", match.id);
        if (error) errors.push({ plate: iv.plate, action: "update", error: error.message });
        else updated++;
      } else {
        const { error } = await supabase
          .from("vehicles")
          .insert([{ ...payload, status: "disponível" }]);
        if (error) errors.push({ plate: iv.plate, action: "insert", error: error.message });
        else inserted++;
      }
    }

    return json({
      ok: true,
      inserted,
      updated,
      total_in_infleet: infleetVehicles.length,
      errors,
      synced_at: now,
    });
  } catch (e) {
    const msg = (e as Error)?.message || String(e);
    return json({ ok: false, error: msg }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function normalizePlate(p: string): string {
  return (p || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

interface InfleetVehicle {
  id: string;
  plate: string;
  model: string;
  year: string | null;
  odometer: number | null;
  document: string | null;
  status: string | null;
  deactivatedAt: string | null;
}

async function fetchInfleetVehicles(token: string): Promise<InfleetVehicle[]> {
  const query = `query { listVehicles { id plate model year odometer document status deactivatedAt } }`;
  const res = await fetch(INFLEET_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Infleet HTTP ${res.status}: ${txt}`);
  }
  const body = await res.json();
  if (body.errors) {
    throw new Error(`Infleet GraphQL: ${JSON.stringify(body.errors)}`);
  }
  const list: InfleetVehicle[] = body?.data?.listVehicles || [];
  return list.filter((v) => !v.deactivatedAt);
}
