// =====================================================================
// Edge Function: sync-webposto-fuelings
// Sincroniza abastecimentos da API Quality/Webposto com a tabela fuelings.
// =====================================================================
// Secrets necessários (Project Settings > Edge Functions > Secrets):
//   WEBPOSTO_TOKEN             — token da API Quality/Webposto
//   SUPABASE_URL               — (injetado automaticamente)
//   SUPABASE_SERVICE_ROLE_KEY  — (injetado automaticamente)
//
// Estratégia: cursor-based com auto-continuação. Cada execução pagina até
// PAGES_PER_RUN páginas a partir do cursor salvo em sync_state. Se ainda
// não alcançou o presente, dispara uma nova invocação de si mesma
// (self-chaining) até o backfill terminar. Um clique = backfill completo.
// O cursor é salvo a cada página — crash não perde progresso.
// =====================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const WEBPOSTO_URL = "https://web.qualityautomacao.com.br";
const BACKFILL_START = "2026-01-01";
const PAGES_PER_RUN = 15;
const PAGE_SIZE = 2000;
const DETAIL_BATCH = 40;
const CURSOR_KEY = "webposto_cursor";
const MAX_CHAIN = 30;

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Profundidade da cadeia de auto-invocação (vem no body quando é self-call)
    let chain = 0;
    try {
      const b = await req.json();
      chain = Number(b?._chain) || 0;
    } catch (_) { /* body vazio = clique manual */ }

    const result = await syncFuelings(supabase, token);

    // Auto-continua se ainda não terminou o backfill
    if (!result.caughtUp && chain < MAX_CHAIN) {
      const selfUrl = `${supabaseUrl}/functions/v1/sync-webposto-fuelings`;
      EdgeRuntime.waitUntil(
        fetch(selfUrl, {
          method: "POST",
          headers: { "Authorization": `Bearer ${serviceKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ _chain: chain + 1 }),
        }).catch(() => { /* se a cadeia quebrar, o cron de 3h retoma */ }),
      );
    }

    return json({ ok: true, chain, ...result });
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
  const res = await fetch(`${WEBPOSTO_URL}${path}`, { headers: { "X-API-Key": token } });
  if (!res.ok) throw new Error(`Webposto HTTP ${res.status}: ${path}`);
  return res.json();
}

async function syncFuelings(supabase: SupabaseClient, token: string) {
  // Mapa placa normalizada -> vehicle_id local
  const { data: vehicles, error: vErr } = await supabase.from("vehicles").select("id, plate");
  if (vErr) throw vErr;
  const plateToVehicle = new Map<string, number>();
  for (const v of vehicles || []) {
    if (v.plate) plateToVehicle.set(normalizePlate(v.plate), v.id);
  }

  // Cursor atual
  const { data: stateRow } = await supabase
    .from("sync_state").select("value").eq("key", CURSOR_KEY).maybeSingle();
  let cursor: string = stateRow?.value || "";

  const dataFinal = todayIso();
  let pagesScanned = 0;
  let vendasScanned = 0;
  let inserted = 0;
  let updated = 0;
  let caughtUp = false;
  const errors: Array<{ key: string; error: string }> = [];

  for (let p = 0; p < PAGES_PER_RUN; p++) {
    const ucParam = cursor ? `&ultimoCodigo=${cursor}` : "";
    const listPath = `/INTEGRACAO/VENDA?dataInicial=${BACKFILL_START}&dataFinal=${dataFinal}&limite=${PAGE_SIZE}${ucParam}`;
    const body = await webpostoGet(token, listPath);
    const res: any[] = body?.resultados || [];
    pagesScanned++;
    vendasScanned += res.length;

    // Vendas dessa página que casam com nossas placas
    const matches: Array<{ vendaCodigo: number; placaNorm: string; dataHora: string }> = [];
    for (const v of res) {
      if (v.cancelada === "S" || !v.placaVeiculo) continue;
      const pn = normalizePlate(v.placaVeiculo);
      if (plateToVehicle.has(pn)) {
        matches.push({ vendaCodigo: v.vendaCodigo, placaNorm: pn, dataHora: v.dataHora || "" });
      }
    }

    // Detalhes em lote + insert/update dos abastecimentos
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
        const m = batch.find((x) => x.vendaCodigo === venda.vendaCodigo);
        if (!m) continue;
        const vehicleId = plateToVehicle.get(m.placaNorm);
        if (!vehicleId) continue;
        const date = (venda.dataHora || m.dataHora || "").slice(0, 10) || todayIso();

        for (const item of (venda.itens || [])) {
          if (item.bicoCodigo == null) continue; // só itens de bomba (combustível)
          const webpostoId = String(item.vendaItemCodigo);
          const liters = Number(item.quantidade) || 0;
          const value = Number(item.totalVenda) || 0;
          if (liters <= 0 && value <= 0) continue;

          const payload = {
            vehicle_id: vehicleId,
            date,
            liters: Math.round(liters * 100) / 100,
            value: Math.round(value * 100) / 100,
            webposto_id: webpostoId,
            last_synced_at: new Date().toISOString(),
          };

          const { data: existing } = await supabase
            .from("fuelings").select("id").eq("webposto_id", webpostoId).maybeSingle();
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

    // Salva cursor após cada página — crash não perde progresso
    if (body?.ultimoCodigo) {
      cursor = String(body.ultimoCodigo);
      await supabase.from("sync_state").upsert({
        key: CURSOR_KEY, value: cursor, updated_at: new Date().toISOString(),
      });
    }

    if (res.length < PAGE_SIZE) { caughtUp = true; break; }
  }

  return { inserted, updated, errors, pagesScanned, vendasScanned, caughtUp, cursor };
}
