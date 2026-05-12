import React, { useState } from 'react';
import {
  Car, Users, Wallet, Activity, DollarSign, Building2, Calculator,
  FileDown, Printer, ChevronRight, ChevronDown, X,
} from 'lucide-react';
import { KPICard, EmptyState } from '../components/ui.jsx';
import {
  computePeriod, computeAllocation, sortTree, filterTree, totalsFromTree, exportAllocationCSV,
} from '../lib/allocation.js';

export function AllocationView({ vehicles, drivers, companies, trips, fuelings, maintenances, expenses, insurances }) {
  const [preset, setPreset] = useState('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [sortBy, setSortBy] = useState('km_desc');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCompanies, setExpandedCompanies] = useState({});
  const [expandedDrivers, setExpandedDrivers] = useState({});

  const period = computePeriod(preset, customFrom, customTo);
  const data = computeAllocation({ period, vehicles, drivers, companies, trips, fuelings, maintenances, expenses, insurances });
  const sortedTree = sortTree(data.tree, sortBy);
  const tree = filterTree(sortedTree, { companyId: companyFilter, search: searchTerm });
  const filtered = totalsFromTree(tree, data.breakdown);
  const isFiltered = (companyFilter && companyFilter !== 'all') || searchTerm.trim().length > 0;
  const searchActive = searchTerm.trim().length > 0;

  const toggleCompany = (id) => setExpandedCompanies(s => ({ ...s, [id]: !s[id] }));
  const toggleDriver = (cid, did) => {
    const key = `${cid}:${did}`;
    setExpandedDrivers(s => ({ ...s, [key]: !s[key] }));
  };

  const expandAll = () => {
    const c = {};
    const d = {};
    tree.forEach(co => {
      c[co.id] = true;
      co.drivers.forEach(dr => { d[`${co.id}:${dr.id}`] = true; });
    });
    setExpandedCompanies(c);
    setExpandedDrivers(d);
  };
  const collapseAll = () => {
    setExpandedCompanies({});
    setExpandedDrivers({});
  };
  const handlePrint = () => {
    expandAll();
    setTimeout(() => window.print(), 120);
  };

  const fmtKm = (n) => `${Math.round(n).toLocaleString('pt-BR')} km`;
  const fmtMoney = (n) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const fmtPct = (n) => `${(n * 100).toFixed(1)}%`;

  const presets = [
    { id: 'this_month', label: 'Este mês' },
    { id: 'last_month', label: 'Mês anterior' },
    { id: 'last_30', label: 'Últimos 30 dias' },
    { id: 'this_year', label: 'Este ano' },
    { id: 'last_year', label: 'Ano anterior' },
    { id: 'all', label: 'Tudo' },
    { id: 'custom', label: 'Personalizado' }
  ];

  const sortOptions = [
    { value: 'km_desc', label: 'Km (maior primeiro)' },
    { value: 'km_asc', label: 'Km (menor primeiro)' },
    { value: 'cost_desc', label: 'Custo (maior primeiro)' },
    { value: 'cost_asc', label: 'Custo (menor primeiro)' },
    { value: 'name_asc', label: 'Nome (A–Z)' },
    { value: 'name_desc', label: 'Nome (Z–A)' }
  ];

  return (
    <div className="space-y-6 allocation-page">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl lg:text-3xl font-semibold tracking-tight mb-1">Rateio</h2>
          <p className="text-sm text-slate-400">Por empresa, motorista e veículo · proporcional ao km rodado</p>
          <p className="text-[11px] text-slate-500 mt-1">Período: {period[0]} → {period[1]}</p>
        </div>
        <div className="flex gap-2 flex-wrap print-hide">
          <button onClick={() => exportAllocationCSV(filtered, period)} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-medium hover:bg-slate-800">
            <FileDown size={14} /> Exportar CSV
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-medium hover:bg-slate-800">
            <Printer size={14} /> Imprimir / PDF
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 print-hide">
        <div className="flex gap-1 flex-wrap mb-3">
          {presets.map(p => (
            <button key={p.id} onClick={() => setPreset(p.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${preset === p.id ? 'bg-violet-500/20 border border-violet-500/30 text-white' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'}`}>
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="flex gap-3 items-end mb-3">
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
        <div className="grid md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-800/60">
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">Empresa</label>
            <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500">
              <option value="all">Todas</option>
              {companies.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
              <option value="NONE">Sem empresa</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">Buscar (empresa, motorista ou veículo)</label>
            <div className="relative">
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="ex: João, ACME, ABC-1234..." className="w-full px-3 py-2 pr-8 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500" />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-slate-500 hover:text-white">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
        {isFiltered && (
          <p className="text-[11px] text-amber-400 mt-3">
            Filtro ativo · KPIs e exportação refletem só o que está visível ·
            <button onClick={() => { setCompanyFilter('all'); setSearchTerm(''); }} className="ml-1 underline hover:text-amber-300">limpar</button>
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label={isFiltered ? "Km (filtrado)" : "Km no período"} value={Math.round(filtered.totalKm).toLocaleString('pt-BR')} icon={Activity} gradient="from-cyan-500/20 to-cyan-600/5" iconColor="text-cyan-400" />
        <KPICard label={isFiltered ? "Custo (filtrado)" : "Custo no período"} value={fmtMoney(filtered.totalCost)} icon={Wallet} gradient="from-rose-500/20 to-rose-600/5" iconColor="text-rose-400" />
        <KPICard label="Custo/km" value={data.totalKm > 0 ? `R$ ${(data.totalCost / data.totalKm).toFixed(2)}` : '—'} icon={DollarSign} gradient="from-emerald-500/20 to-emerald-600/5" iconColor="text-emerald-400" />
        <KPICard label="Empresas" value={tree.length} icon={Building2} gradient="from-violet-500/20 to-violet-600/5" iconColor="text-violet-400" />
      </div>

      <div className="flex items-center gap-3 flex-wrap print-hide">
        <span className="text-xs text-slate-400">Ordenar:</span>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-violet-500">
          {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button onClick={expandAll} className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-white">Expandir tudo</button>
        <button onClick={collapseAll} className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-white">Recolher tudo</button>
      </div>

      {tree.length === 0 ? (
        <EmptyState icon={Calculator} text={isFiltered ? "Nenhum resultado com os filtros atuais" : "Sem viagens no período selecionado"} />
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden allocation-table">
          <div className="grid grid-cols-12 px-4 py-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-800 bg-slate-950/40">
            <div className="col-span-5">Empresa / Motorista / Veículo</div>
            <div className="col-span-2 text-right">Km</div>
            <div className="col-span-2 text-right">% do pai</div>
            <div className="col-span-3 text-right">Custo rateado</div>
          </div>

          {tree.map(c => {
            const cOpen = searchActive ? true : expandedCompanies[c.id];
            return (
              <div key={c.id}>
                <button onClick={() => toggleCompany(c.id)} className="w-full grid grid-cols-12 px-4 py-3 text-sm hover:bg-slate-800/30 border-b border-slate-800 text-left">
                  <div className="col-span-5 flex items-center gap-2 min-w-0">
                    {cOpen ? <ChevronDown size={14} className="text-slate-500 shrink-0" /> : <ChevronRight size={14} className="text-slate-500 shrink-0" />}
                    <Building2 size={14} className="text-violet-400 shrink-0" />
                    <span className="text-white font-semibold truncate">{c.name}</span>
                  </div>
                  <div className="col-span-2 text-right text-slate-300 tabular-nums">{fmtKm(c.km)}</div>
                  <div className="col-span-2 text-right text-slate-400 tabular-nums">{fmtPct(c.ratio)}</div>
                  <div className="col-span-3 text-right text-white font-semibold tabular-nums">{fmtMoney(c.cost)}</div>
                </button>

                {cOpen && c.drivers.map(d => {
                  const dKey = `${c.id}:${d.id}`;
                  const dOpen = searchActive ? true : expandedDrivers[dKey];
                  return (
                    <div key={d.id}>
                      <button onClick={() => toggleDriver(c.id, d.id)} className="w-full grid grid-cols-12 px-4 py-2.5 text-xs hover:bg-slate-800/30 border-b border-slate-800/50 text-left bg-slate-950/30">
                        <div className="col-span-5 flex items-center gap-2 pl-6 min-w-0">
                          {dOpen ? <ChevronDown size={12} className="text-slate-500 shrink-0" /> : <ChevronRight size={12} className="text-slate-500 shrink-0" />}
                          <Users size={12} className="text-cyan-400 shrink-0" />
                          <span className="text-slate-200 truncate">{d.name}</span>
                        </div>
                        <div className="col-span-2 text-right text-slate-300 tabular-nums">{fmtKm(d.km)}</div>
                        <div className="col-span-2 text-right text-slate-500 tabular-nums">{fmtPct(d.ratio)}</div>
                        <div className="col-span-3 text-right text-slate-200 tabular-nums">{fmtMoney(d.cost)}</div>
                      </button>

                      {dOpen && d.vehicles.map(v => (
                        <div key={v.id} className="grid grid-cols-12 px-4 py-2 text-xs border-b border-slate-800/30 bg-slate-950/50">
                          <div className="col-span-5 flex items-center gap-2 pl-12 min-w-0">
                            <Car size={11} className="text-amber-400 shrink-0" />
                            <span className="text-slate-400 truncate">{v.name}</span>
                          </div>
                          <div className="col-span-2 text-right text-slate-400 tabular-nums">{fmtKm(v.km)}</div>
                          <div className="col-span-2 text-right text-slate-600 tabular-nums">{fmtPct(v.ratio)}</div>
                          <div className="col-span-3 text-right text-slate-300 tabular-nums">{fmtMoney(v.cost)}</div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <p className="text-xs text-slate-500 mb-3">Composição do custo no período</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div><span className="text-slate-500">Combustível: </span><span className="text-amber-300 font-semibold">{fmtMoney(data.breakdown.fuelCost)}</span></div>
          <div><span className="text-slate-500">Manutenção: </span><span className="text-fuchsia-300 font-semibold">{fmtMoney(data.breakdown.maintCost)}</span></div>
          <div><span className="text-slate-500">Seguros: </span><span className="text-sky-300 font-semibold">{fmtMoney(data.breakdown.insCost)}</span></div>
          <div><span className="text-slate-500">Despesas: </span><span className="text-indigo-300 font-semibold">{fmtMoney(data.breakdown.expenseCost)}</span></div>
        </div>
        <p className="text-[10px] text-slate-600 mt-3">Seguros são pro-rateados pelo overlap de dias da apólice com o período selecionado.</p>
      </div>
    </div>
  );
}
