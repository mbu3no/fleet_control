// =====================================================================
// Edge Function: sync-infleet-vehicles
// Sincroniza veículos E motoristas da Infleet (GraphQL) com o Supabase.
// Nome legado mantido pra não quebrar o cron existente.
// =====================================================================
// Secrets necessários no Supabase (Project Settings > Edge Functions > Secrets):
//   INFLEET_TOKEN              — Bearer token da Infleet
//   SUPABASE_URL               — (Supabase já injeta automaticamente)
//   SUPABASE_SERVICE_ROLE_KEY  — (Supabase já injeta automaticamente)
// =====================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const INFLEET_URL = "https://api.infleet.com.br/v1/graphql";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SyncResult {
  inserted: number;
  updated: number;
  errors: Array<{ key: string; action: string; error: string }>;
}

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

    const now = new Date().toISOString();
    const [vehicles, drivers] = await Promise.all([
      syncVehicles(supabase, infleetToken, now).catch((e): SyncResult => ({
        inserted: 0,
        updated: 0,
        errors: [{ key: "all", action: "fetch_or_sync", error: String((e as Error)?.message || e) }],
      })),
      syncDrivers(supabase, infleetToken, now).catch((e): SyncResult => ({
        inserted: 0,
        updated: 0,
        errors: [{ key: "all", action: "fetch_or_sync", error: String((e as Error)?.message || e) }],
      })),
    ]);

    return json({
      ok: true,
      vehicles,
      drivers,
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

function normalizeName(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// =====================================================================
// VEÍCULOS
// =====================================================================
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
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Infleet HTTP ${res.status}: ${await res.text()}`);
  const body = await res.json();
  if (body.errors) throw new Error(`Infleet GraphQL (vehicles): ${JSON.stringify(body.errors)}`);
  const list: InfleetVehicle[] = body?.data?.listVehicles || [];
  return list.filter((v) => !v.deactivatedAt);
}

async function syncVehicles(supabase: SupabaseClient, token: string, now: string): Promise<SyncResult> {
  const infleetVehicles = await fetchInfleetVehicles(token);

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

  let inserted = 0;
  let updated = 0;
  const errors: SyncResult["errors"] = [];

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

    const match = byInfleetId.get(iv.id) || byPlate.get(normalizePlate(iv.plate));

    if (match) {
      const { error } = await supabase.from("vehicles").update(payload).eq("id", match.id);
      if (error) errors.push({ key: iv.plate, action: "update", error: error.message });
      else updated++;
    } else {
      const { error } = await supabase.from("vehicles").insert([{ ...payload, status: "disponível" }]);
      if (error) errors.push({ key: iv.plate, action: "insert", error: error.message });
      else inserted++;
    }
  }

  return { inserted, updated, errors };
}

// =====================================================================
// MOTORISTAS
// =====================================================================
interface InfleetDriver {
  id: string;
  name: string;
  active: boolean;
  cnh: string | null;
}

async function fetchInfleetDrivers(token: string): Promise<InfleetDriver[]> {
  const query = `query { listDriversPaginated(limit: 1000, offset: 0) { id name active cnh } }`;
  const res = await fetch(INFLEET_URL, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Infleet HTTP ${res.status}: ${await res.text()}`);
  const body = await res.json();
  if (body.errors) throw new Error(`Infleet GraphQL (drivers): ${JSON.stringify(body.errors)}`);
  const list: InfleetDriver[] = body?.data?.listDriversPaginated || [];
  return list.filter((d) => d.active);
}

async function syncDrivers(supabase: SupabaseClient, token: string, now: string): Promise<SyncResult> {
  const infleetDrivers = await fetchInfleetDrivers(token);

  const { data: existing, error: fetchErr } = await supabase
    .from("drivers")
    .select("id, infleet_id, name");
  if (fetchErr) throw fetchErr;

  const byInfleetId = new Map<string, { id: number; name: string }>();
  const byName = new Map<string, { id: number; name: string }>();
  for (const d of existing || []) {
    if (d.infleet_id) byInfleetId.set(d.infleet_id, d);
    if (d.name) byName.set(normalizeName(d.name), d);
  }

  let inserted = 0;
  let updated = 0;
  const errors: SyncResult["errors"] = [];

  for (const idriver of infleetDrivers) {
    // Payload: campos vindos da Infleet apenas. Empresa, centro de custo e telefone seguem locais.
    const payloadUpdate: Record<string, unknown> = {
      infleet_id: idriver.id,
      name: idriver.name,
      last_synced_at: now,
    };
    if (idriver.cnh) payloadUpdate.cnh = idriver.cnh;

    const match = byInfleetId.get(idriver.id) || byName.get(normalizeName(idriver.name));

    if (match) {
      const { error } = await supabase.from("drivers").update(payloadUpdate).eq("id", match.id);
      if (error) errors.push({ key: idriver.name, action: "update", error: error.message });
      else updated++;
    } else {
      const insertPayload: Record<string, unknown> = {
        infleet_id: idriver.id,
        name: idriver.name,
        last_synced_at: now,
      };
      if (idriver.cnh) insertPayload.cnh = idriver.cnh;
      const { error } = await supabase.from("drivers").insert([insertPayload]);
      if (error) errors.push({ key: idriver.name, action: "insert", error: error.message });
      else inserted++;
    }
  }

  return { inserted, updated, errors };
}
