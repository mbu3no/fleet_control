// =====================================================================
// Edge Function: sync-webposto-fuelings
// Sincroniza abastecimentos da API Quality/Webposto com a tabela fuelings.
// =====================================================================
// Secrets necessários (Project Settings > Edge Functions > Secrets):
//   WEBPOSTO_TOKEN             — token da API Quality/Webposto
//   SUPABASE_URL               — (injetado automaticamente)
//   SUPABASE_SERVICE_ROLE_KEY  — (injetado automaticamente)
//
// Estratégia: cursor-based. Cada execução pagina até PAGES_PER_RUN páginas
// de vendas a partir do último cursor salvo em sync_state, filtra as placas
// dos veículos cadastrados, e cria os abastecimentos. O cursor avança de
// BACKFILL_START até o presente ao longo de várias execuções (cron 3h).
// =====================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const WEBPOSTO_URL = "https://web.qualityautomacao.com.br";
const BACKFILL_START = "2026-01-01";
const PAGES_PER_RUN = 15;
const PAGE_SIZE = 2000;
const DETAIL_BATCH = 40;
const CURSOR_KEY = "webposto_cursor";

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
    const token = Deno.env.get("WEBPOSTO_TOKEN");
    if (!token) {
      return json({ ok: false, error: "WEBPOSTO_TOKEN secret não configurado" }, 500);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const result = await syncFuelings(supabase, token);
    return json({ ok: true, ...result });
  } catch (e) {
    return json({ ok: false, error: (e as Error)?.message || String(e) }, 500);
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

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function webpostoGet(token: string, path: string): Promise<any> {
  const res = await fetch(`${WEBPOSTO_URL}${path}`, {
    headers: { "X-API-Key": token },
  });
  if (!res.ok) throw new Error(`Webposto HTTP ${res.status}: ${path}`);
  return res.json();
}

interface VendaMatch {
  vendaCodigo: number;
  placaNorm: string;
  dataHora: string;
}

async function syncFuelings(supabase: SupabaseClient, token: string) {
  // 1. Mapa placa normalizada -> vehicle_id local
  const { data: vehicles, error: vErr } = await supabase
    .from("vehicles")
    .select("id, plate");
  if (vErr) throw vErr;
  const plateToVehicle = new Map<string, number>();
  for (const v of vehicles || []) {
    if (v.plate) plateToVehicle.set(normalizePlate(v.plate), v.id);
  }

  // 2. Cursor atual
  const { data: stateRow } = await supabase
    .from("sync_state")
    .select("value")
    .eq("key", CURSOR_KEY)
    .maybeSingle();
  let cursor: string = stateRow?.value || "";

  // 3. Pagina vendas, coleta as que casam com nossas placas
  const dataFinal = todayIso();
  const matches: VendaMatch[] = [];
  let pagesScanned = 0;
  let vendasScanned = 0;
  let caughtUp = false;
  let lastCursor = cursor;

  for (let p = 0; p < PAGES_PER_RUN; p++) {
    const ucParam = lastCursor ? `&ultimoCodigo=${lastCursor}` : "";
    const path = `/INTEGRACAO/VENDA?dataInicial=${BACKFILL_START}&dataFinal=${dataFinal}&limite=${PAGE_SIZE}${ucParam}`;
    const body = await webpostoGet(token, path);
    const res: any[] = body?.resultados || [];
    pagesScanned++;
    vendasScanned += res.length;

    for (const v of res) {
      if (v.cancelada === "S") continue;
      if (!v.placaVeiculo) continue;
      const pn = normalizePlate(v.placaVeiculo);
      if (plateToVehicle.has(pn)) {
        matches.push({ vendaCodigo: v.vendaCodigo, placaNorm: pn, dataHora: v.dataHora || "" });
      }
    }

    if (body?.ultimoCodigo) lastCursor = String(body.ultimoCodigo);
    if (res.length < PAGE_SIZE) { caughtUp = true; break; }
  }

  // 4. Busca detalhes (itens) das vendas que casaram, em lotes
  let inserted = 0;
  let updated = 0;
  const errors: Array<{ key: string; error: string }> = [];

  for (let i = 0; i < matches.length; i += DETAIL_BATCH) {
    const batch = matches.slice(i, i + DETAIL_BATCH);
    const idList = batch.map((m) => m.vendaCodigo).join(",");
    let detailRes: any[];
    try {
      const detail = await webpostoGet(token, `/INTEGRACAO/VENDA/${idList}`);
      detailRes = detail?.resultados || [];
    } catch (e) {
      errors.push({ key: idList, error: `detalhe: ${(e as Error)?.message || e}` });
      continue;
    }

    for (const venda of detailRes) {
      const match = batch.find((m) => m.vendaCodigo === venda.vendaCodigo);
      if (!match) continue;
      const vehicleId = plateToVehicle.get(match.placaNorm);
      if (!vehicleId) continue;

      // dataHora vem com offset -03:00 (BRT) — slice direto dá a data local
      const date = (venda.dataHora || match.dataHora || "").slice(0, 10);
      const itens: any[] = venda.itens || [];

      for (const item of itens) {
        // Item de combustível tem bicoCodigo (bico de bomba)
        if (item.bicoCodigo == null) continue;
        const webpostoId = String(item.vendaItemCodigo);
        const liters = Number(item.quantidade) || 0;
        const value = Number(item.totalVenda) || 0;
        if (liters <= 0 && value <= 0) continue;

        const payload = {
          vehicle_id: vehicleId,
          date: date || todayIso(),
          liters: Math.round(liters * 100) / 100,
          value: Math.round(value * 100) / 100,
          webposto_id: webpostoId,
          last_synced_at: new Date().toISOString(),
        };

        // upsert por webposto_id
        const { data: existing } = await supabase
          .from("fuelings")
          .select("id")
          .eq("webposto_id", webpostoId)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase.from("fuelings").update(payload).eq("id", existing.id);
          if (error) errors.push({ key: webpostoId, error: error.message });
          else updated++;
        } else {
          const { error } = await supabase.from("fuelings").insert([payload]);
          if (error) errors.push({ key: webpostoId, error: error.message });
          else inserted++;
        }
      }
    }
  }

  // 5. Salva cursor
  await supabase.from("sync_state").upsert({
    key: CURSOR_KEY,
    value: lastCursor,
    updated_at: new Date().toISOString(),
  });

  return {
    inserted,
    updated,
    errors,
    pagesScanned,
    vendasScanned,
    matched: matches.length,
    caughtUp,
    cursor: lastCursor,
  };
}
