import React, { useState } from 'react';
import {
  Coins, Car, FileDown, Fuel, Wrench, Receipt, Shield, ChevronRight, ChevronDown,
} from 'lucide-react';
import { KPICard, EmptyState, SearchInput } from '../components/ui.jsx';
import { computePeriod } from '../lib/allocation.js';
import { formatLocalDate, matchesSearch } from '../lib/format.js';

const PRESETS = [
  { id: 'this_month', label: 'Este mês' },
  { id: 'last_month', label: 'Mês anterior' },
  { id: 'last_30', label: 'Últimos 30 dias' },
  { id: 'this_year', label: 'Este ano' },
  { id: 'last_year', label: 'Ano anterior' },
  { id: 'all', label: 'Tudo' },
  { id: 'custom', label: 'Personalizado' },
];

const SORT_OPTIONS = [
  { value: 'total_desc', label: 'Custo total (maior)' },
  { value: 'total_asc', label: 'Custo total (menor)' },
  { value: 'cpk_desc', label: 'Custo/km (maior)' },
  { value: 'name_asc', label: 'Placa (A–Z)' },
];

const money = (n) => `R$ ${Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;

export function CostsView({ vehicles, fuelings, maintenances, expenses, insurances, trips }) {
  const [preset, setPreset] = useState('this_year');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [sortBy, setSortBy] = useState('total_desc');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});

  const [from, to] = computePeriod(preset, customFrom, customTo);
  const inPeriod = (d) => {
    if (!d) return false;
    const s = String(d).slice(0, 10);
    return s >= from && s <= to;
  };
  const fromMs = new Date(from + 'T00:00:00').getTime();
  const toMs = new Date(to + 'T23:59:59').getTime();

  const insuranceForVehicle = (vehicleId) => {
    return insurances.reduce((sum, i) => {
      if (i.vehicle_id != vehicleId || !i.start_date || !i.end_date) return sum;
      const sMs = new Date(i.start_date + 'T00:00:00').getTime();
      const eMs = new Date(i.end_date + 'T23:59:59').getTime();
      if (eMs < fromMs || sMs > toMs) return sum;
      const overlap = Math.max(0, Math.min(toMs, eMs) - Math.max(fromMs, sMs));
      const total = Math.max(1, eMs - sMs);
      return sum + (Number(i.premium) || 0) * (overlap / total);
    }, 0);
  };

  let rows = vehicles.map(v => {
    const vFuelings = fuelings.filter(f => f.vehicle_id == v.id && inPeriod(f.date));
    const vMaint = maintenances.filter(m => m.vehicle_id == v.id && inPeriod(m.date));
    const vExp = expenses.filter(e => e.vehicle_id == v.id && inPeriod(e.date));
    const combustivel = vFuelings.reduce((s, f) => s + Number(f.value || 0), 0);
    const manutencao = vMaint.reduce((s, m) => s + Number(m.cost || 0), 0);
    const despesas = vExp.reduce((s, e) => s + Number(e.value || 0), 0);
    const seguros = insuranceForVehicle(v.id);
    const total = combustivel + manutencao + despesas + seguros;
    const km = trips.filter(t => t.vehicle_id == v.id && inPeriod(t.date)).reduce((s, t) => s + Number(t.km || 0), 0);
    const cpk = km > 0 ? total / km : 0;
    return { vehicle: v, combustivel, manutencao, despesas, seguros, total, km, cpk, vFuelings, vMaint, vExp };
  });

  rows = rows.filter(r => matchesSearch(r, search, [x => x.vehicle.plate, x => x.vehicle.model]));

  rows.sort((a, b) => {
    switch (sortBy) {
      case 'total_asc': return a.total - b.total;
      case 'cpk_desc': return b.cpk - a.cpk;
      case 'name_asc': return (a.vehicle.plate || '').localeCompare(b.vehicle.plate || '', 'pt-BR');
      default: return b.total - a.total;
    }
  });

  const grand = rows.reduce((g, r) => ({
    combustivel: g.combustivel + r.combustivel,
    manutencao: g.manutencao + r.manutencao,
    despesas: g.despesas + r.despesas,
    seguros: g.seguros + r.seguros,
    total: g.total + r.total,
    km: g.km + r.km,
  }), { combustivel: 0, manutencao: 0, despesas: 0, seguros: 0, total: 0, km: 0 });
  const grandCpk = grand.km > 0 ? grand.total / grand.km : 0;

  const toggle = (id) => setExpanded(s => ({ ...s, [id]: !s[id] }));

  const exportCSV = () => {
    const esc = (s) => { const t = String(s ?? ''); return /[",;\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
    const lines = [['Placa', 'Modelo', 'Combustivel', 'Manutencao', 'Despesas', 'Seguros', 'Total', 'Km', 'Custo/km'].join(';')];
    for (const r of rows) {
      lines.push([
        esc(r.vehicle.plate), esc(r.vehicle.model),
        r.combustivel.toFixed(2), r.manutencao.toFixed(2), r.despesas.toFixed(2),
        r.seguros.toFixed(2), r.total.toFixed(2), Math.round(r.km), r.cpk.toFixed(2),
      ].join(';'));
    }
    lines.push('');
    lines.push(['TOTAL', '', grand.combustivel.toFixed(2), grand.manutencao.toFixed(2), grand.despesas.toFixed(2), grand.seguros.toFixed(2), grand.total.toFixed(2), Math.round(grand.km), grandCpk.toFixed(2)].join(';'));
    lines.push(['Periodo', `${from} a ${to}`].join(';'));
    const csv = '﻿' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `custos_${from}_a_${to}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl lg:text-3xl font-semibold tracking-tight mb-1">Custos por veículo</h2>
          <p className="text-sm text-slate-400">Combustível, manutenção, despesas e seguros consolidados · {from} → {to}</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-medium hover:bg-slate-800 transition-colors">
          <FileDown size={14} /> Exportar CSV
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex gap-1 flex-wrap">
          {PRESETS.map(p => (
            <button key={p.id} onClick={() => setPreset(p.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${preset === p.id ? 'bg-violet-500/15 border border-violet-500/30 text-white' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'}`}>
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="flex gap-3 items-end mt-3">
            <div className="flex-1">
              <label className="block text-[11px] text-slate-500 mb-1">De</label>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500" />
            </div>
            <div className="flex-1">
              <label className="block text-[11px] text-slate-500 mb-1">Até</label>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500" />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard label="Combustível" value={money(grand.combustivel)} icon={Fuel} gradient="from-amber-500/20 to-amber-600/5" iconColor="text-amber-400" />
        <KPICard label="Manutenção" value={money(grand.manutencao)} icon={Wrench} gradient="from-fuchsia-500/20 to-fuchsia-600/5" iconColor="text-fuchsia-400" />
        <KPICard label="Despesas" value={money(grand.despesas)} icon={Receipt} gradient="from-indigo-500/20 to-indigo-600/5" iconColor="text-indigo-400" />
        <KPICard label="Seguros" value={money(grand.seguros)} icon={Shield} gradient="from-sky-500/20 to-sky-600/5" iconColor="text-sky-400" />
        <KPICard label="Total" value={money(grand.total)} icon={Coins} gradient="from-rose-500/20 to-rose-600/5" iconColor="text-rose-400" />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar veículo..." />
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-violet-500 mb-4">
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Coins} text="Nenhum veículo com custos no período selecionado" />
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-800 bg-slate-950/40">
            <div className="col-span-3">Veículo</div>
            <div className="col-span-2 text-right">Combustível</div>
            <div className="col-span-2 text-right">Manutenção</div>
            <div className="col-span-1 text-right">Despesas</div>
            <div className="col-span-1 text-right">Seguros</div>
            <div className="col-span-2 text-right">Total</div>
            <div className="col-span-1 text-right">Custo/km</div>
          </div>

          {rows.map(r => {
            const open = expanded[r.vehicle.id];
            return (
              <div key={r.vehicle.id}>
                <button onClick={() => toggle(r.vehicle.id)} className="w-full grid grid-cols-12 px-4 py-3 text-sm hover:bg-slate-800/30 border-b border-slate-800 text-left transition-colors">
                  <div className="col-span-3 flex items-center gap-2 min-w-0">
                    {open ? <ChevronDown size={14} className="text-slate-500 shrink-0" /> : <ChevronRight size={14} className="text-slate-500 shrink-0" />}
                    <Car size={14} className="text-violet-400 shrink-0" />
                    <span className="text-white font-semibold truncate">{r.vehicle.plate}</span>
                    <span className="text-slate-500 truncate hidden sm:inline">{r.vehicle.model}</span>
                  </div>
                  <div className="col-span-2 text-right text-amber-300 tabular-nums">{money(r.combustivel)}</div>
                  <div className="col-span-2 text-right text-fuchsia-300 tabular-nums">{money(r.manutencao)}</div>
                  <div className="col-span-1 text-right text-indigo-300 tabular-nums">{money(r.despesas)}</div>
                  <div className="col-span-1 text-right text-sky-300 tabular-nums">{money(r.seguros)}</div>
                  <div className="col-span-2 text-right text-white font-bold tabular-nums">{money(r.total)}</div>
                  <div className="col-span-1 text-right text-slate-400 tabular-nums">{r.km > 0 ? `R$ ${r.cpk.toFixed(2)}` : '—'}</div>
                </button>

                {open && (
                  <div className="bg-slate-950/40 px-4 py-3 border-b border-slate-800 space-y-3">
                    <CostDetail icon={Fuel} color="text-amber-400" label="Abastecimentos" items={r.vFuelings.map(f => ({ id: f.id, date: f.date, desc: `${f.liters || 0} L`, value: f.value }))} />
                    <CostDetail icon={Wrench} color="text-fuchsia-400" label="Manutenções" items={r.vMaint.map(m => ({ id: m.id, date: m.date, desc: m.type || '', value: m.cost }))} />
                    <CostDetail icon={Receipt} color="text-indigo-400" label="Despesas" items={r.vExp.map(e => ({ id: e.id, date: e.date, desc: `${e.type || ''}${e.description ? ' · ' + e.description : ''}`, value: e.value }))} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CostDetail({ icon: Icon, color, label, items }) {
  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-600">
        <Icon size={13} className={color} />
        <span>{label}: sem lançamentos no período</span>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-medium text-slate-300 mb-1.5">
        <Icon size={13} className={color} />
        {label} <span className="text-slate-600">({items.length})</span>
      </div>
      <div className="space-y-1 pl-5">
        {items.map(it => (
          <div key={it.id} className="flex items-center gap-3 text-xs">
            <span className="text-slate-500 tabular-nums w-20 shrink-0">{formatLocalDate(it.date)}</span>
            <span className="text-slate-400 flex-1 truncate">{it.desc || '—'}</span>
            <span className="text-slate-200 tabular-nums">{money(it.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
