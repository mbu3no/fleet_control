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
    // Vehicles e drivers em paralelo. Trips depende dos dois mapeamentos.
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

    const trips = await syncTrips(supabase, infleetToken, now).catch((e): SyncResult => ({
      inserted: 0,
      updated: 0,
      errors: [{ key: "all", action: "fetch_or_sync", error: String((e as Error)?.message || e) }],
    }));

    const expenses = await syncExpenses(supabase, infleetToken, now).catch((e): SyncResult => ({
      inserted: 0,
      updated: 0,
      errors: [{ key: "all", action: "fetch_or_sync", error: String((e as Error)?.message || e) }],
    }));

    return json({
      ok: true,
      vehicles,
      drivers,
      trips,
      expenses,
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

// Normaliza nome para matching: lowercase, sem acentos, sem espaço extra.
// Filtra por charCode para evitar bug de combining marks invisíveis no source.
function normalizeName(s: string): string {
  const lower = (s || "").toLowerCase().normalize("NFD");
  let out = "";
  for (const ch of lower) {
    const code = ch.charCodeAt(0);
    if (code < 0x0300 || code > 0x036F) out += ch;
  }
  return out.replace(/\s+/g, " ").trim();
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

// =====================================================================
// VIAGENS (Trips)
// =====================================================================
interface InfleetTrip {
  startedAt: string;
  finishedAt: string;
  distanceTraveled: number | null;
  driver: { id: string; name: string } | null;
  vehicle: { id: string; plate: string } | null;
}

async function fetchInfleetTripsForVehicle(token: string, infleetVehicleId: string, from: string, to: string): Promise<InfleetTrip[]> {
  const query = `query Trips($filter: ListVehicleTripsFilterInput!) {
    trips(filter: $filter) {
      startedAt finishedAt distanceTraveled
      driver { id name }
      vehicle { id plate }
    }
  }`;
  const variables = {
    filter: {
      fixTime: { startAt: from, endAt: to },
      vehicle_id: infleetVehicleId,
    },
  };
  const res = await fetch(INFLEET_URL, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Infleet HTTP ${res.status}: ${await res.text()}`);
  const body = await res.json();
  if (body.errors) throw new Error(`Infleet GraphQL (trips ${infleetVehicleId}): ${JSON.stringify(body.errors)}`);
  return (body?.data?.trips || []) as InfleetTrip[];
}

async function syncTrips(supabase: SupabaseClient, token: string, now: string): Promise<SyncResult> {
  // Janela de sincronização: últimos 30 dias
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);
  const from = fromDate.toISOString();
  const to = toDate.toISOString();

  // 1. Pega veículos sincronizados com infleet_id e mapeia infleet_id -> local id
  const { data: vehicles, error: vErr } = await supabase
    .from("vehicles")
    .select("id, infleet_id")
    .not("infleet_id", "is", null);
  if (vErr) throw vErr;
  const vehicleByInfleet = new Map<string, number>();
  for (const v of vehicles || []) {
    if (v.infleet_id) vehicleByInfleet.set(v.infleet_id, v.id);
  }

  // 2. Mapa motorista
  const { data: drivers, error: dErr } = await supabase
    .from("drivers")
    .select("id, infleet_id");
  if (dErr) throw dErr;
  const driverByInfleet = new Map<string, number>();
  for (const d of drivers || []) {
    if (d.infleet_id) driverByInfleet.set(d.infleet_id, d.id);
  }

  // 3. Chaves já existentes no banco (pra dedup)
  const { data: existingTrips, error: tErr } = await supabase
    .from("trips")
    .select("infleet_trip_key")
    .not("infleet_trip_key", "is", null);
  if (tErr) throw tErr;
  const existingKeys = new Set<string>((existingTrips || []).map((t) => t.infleet_trip_key as string));

  let inserted = 0;
  let updated = 0;
  const errors: SyncResult["errors"] = [];

  // 4. Pra cada veículo, busca viagens no período
  for (const [infleetVehicleId, localVehicleId] of vehicleByInfleet.entries()) {
    let infleetTrips: InfleetTrip[];
    try {
      infleetTrips = await fetchInfleetTripsForVehicle(token, infleetVehicleId, from, to);
    } catch (e) {
      errors.push({ key: infleetVehicleId, action: "fetch", error: String((e as Error)?.message || e) });
      continue;
    }

    for (const trip of infleetTrips) {
      if (!trip.startedAt || !trip.vehicle || !trip.driver) continue;
      const key = `${trip.vehicle.id}__${trip.startedAt}`;
      if (existingKeys.has(key)) continue; // já temos

      const localDriverId = driverByInfleet.get(trip.driver.id);
      if (!localDriverId) {
        errors.push({ key, action: "insert", error: `motorista Infleet ${trip.driver.id} não mapeado` });
        continue;
      }

      const km = trip.distanceTraveled != null ? Math.round(Number(trip.distanceTraveled) * 100) / 100 : 0;
      // Date em horário de Brasília (UTC-3): trip iniciada 01:00 UTC = 22:00 BRT do dia anterior
      const date = new Date(trip.startedAt).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

      const { error: insErr } = await supabase.from("trips").insert([{
        vehicle_id: localVehicleId,
        driver_id: localDriverId,
        date,
        km,
        started_at: trip.startedAt,
        finished_at: trip.finishedAt,
        infleet_trip_key: key,
        last_synced_at: now,
      }]);
      if (insErr) {
        errors.push({ key, action: "insert", error: insErr.message });
      } else {
        inserted++;
        existingKeys.add(key);
      }
    }
  }

  return { inserted, updated, errors };
}

// =====================================================================
// DESPESAS (Expenses)
// =====================================================================
interface InfleetExpense {
  id: string;
  title: string;
  amount: string | number | null;
  description: string | null;
  dueDate: string;
  paidAt: string | null;
  deletedAt: string | null;
  type: string | null;
  category: { name: string } | null;
  vehicle: { id: string } | null;
  costCenter: string | null;
}

async function fetchInfleetExpenses(token: string, fromIso: string, toIso: string): Promise<InfleetExpense[]> {
  const query = `query Expenses($filter: ListExpensesFilterInput!) {
    listExpenses(filter: $filter) {
      id title amount description dueDate paidAt deletedAt type costCenter
      category { name }
      vehicle { id }
    }
  }`;
  const variables = { filter: { occurredAt: { startAt: fromIso, endAt: toIso } } };
  const res = await fetch(INFLEET_URL, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Infleet HTTP ${res.status}: ${await res.text()}`);
  const body = await res.json();
  if (body.errors) throw new Error(`Infleet GraphQL (expenses): ${JSON.stringify(body.errors)}`);
  const list: InfleetExpense[] = body?.data?.listExpenses || [];
  return list.filter((e) => !e.deletedAt);
}

async function syncExpenses(supabase: SupabaseClient, token: string, now: string): Promise<SyncResult> {
  // Janela maior que trips porque despesas podem ser retroativas: últimos 365 dias
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 365);

  const infleetExpenses = await fetchInfleetExpenses(token, fromDate.toISOString(), toDate.toISOString());

  // Mapa de vehicle infleet_id → local id
  const { data: vehicles, error: vErr } = await supabase
    .from("vehicles")
    .select("id, infleet_id")
    .not("infleet_id", "is", null);
  if (vErr) throw vErr;
  const vehicleByInfleet = new Map<string, number>();
  for (const v of vehicles || []) {
    if (v.infleet_id) vehicleByInfleet.set(v.infleet_id, v.id);
  }

  // Expenses já existentes (matching por infleet_id)
  const { data: existing, error: eErr } = await supabase
    .from("expenses")
    .select("id, infleet_id")
    .not("infleet_id", "is", null);
  if (eErr) throw eErr;
  const byInfleetId = new Map<string, number>();
  for (const e of existing || []) {
    if (e.infleet_id) byInfleetId.set(e.infleet_id, e.id);
  }

  let inserted = 0;
  let updated = 0;
  const errors: SyncResult["errors"] = [];

  for (const exp of infleetExpenses) {
    if (!exp.vehicle?.id) {
      errors.push({ key: exp.id, action: "skip", error: "expense sem vehicleId" });
      continue;
    }
    const localVehicleId = vehicleByInfleet.get(exp.vehicle.id);
    if (!localVehicleId) {
      errors.push({ key: exp.id, action: "skip", error: `veículo Infleet ${exp.vehicle.id} não mapeado` });
      continue;
    }

    // Date: paidAt se pago, senão dueDate. Sempre em BRT.
    const refIso = exp.paidAt || exp.dueDate;
    const date = new Date(refIso).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    const dueDate = new Date(exp.dueDate).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

    // Tipo: categoria.name → fallback type → fallback "Outros"
    const type = exp.category?.name || exp.type || "Outros";

    // Descrição: title + (description se diferente)
    const desc = exp.description && exp.description !== exp.title
      ? `${exp.title} — ${exp.description}`
      : exp.title;

    const value = exp.amount != null ? Number(exp.amount) : 0;

    const payload = {
      infleet_id: exp.id,
      vehicle_id: localVehicleId,
      type,
      date,
      due_date: dueDate,
      value: isNaN(value) ? 0 : Math.round(value * 100) / 100,
      description: desc,
      last_synced_at: now,
    };

    const match = byInfleetId.get(exp.id);
    if (match) {
      const { error } = await supabase.from("expenses").update(payload).eq("id", match);
      if (error) errors.push({ key: exp.id, action: "update", error: error.message });
      else updated++;
    } else {
      const { error } = await supabase.from("expenses").insert([payload]);
      if (error) errors.push({ key: exp.id, action: "insert", error: error.message });
      else inserted++;
    }
  }

  return { inserted, updated, errors };
}
