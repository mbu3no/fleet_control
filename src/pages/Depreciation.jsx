import React from 'react';
import { Car, DollarSign, Wallet } from 'lucide-react';
import { KPICard, DataTable, EmptyState } from '../components/ui.jsx';

export function DepreciationView({ vehicles, pieColors }) {
  const RATE = 0.20 / 12;
  const today = new Date();
  const calc = (v) => {
    if (!v.purchase_value || !v.purchase_date) return { months: 0, dep: 0, current: v.purchase_value || 0, pct: 0 };
    const p = new Date(v.purchase_date);
    const months = Math.max(0, (today.getFullYear() - p.getFullYear()) * 12 + (today.getMonth() - p.getMonth()));
    const dep = Number(v.purchase_value) * RATE * months;
    return { months, dep, current: Math.max(0, Number(v.purchase_value) - dep), pct: v.purchase_value > 0 ? (dep / Number(v.purchase_value)) * 100 : 0 };
  };

  const wv = vehicles.filter(v => v.purchase_value > 0 && v.purchase_date);
  if (wv.length === 0) return <EmptyState icon={DollarSign} text="Informe valor e data de aquisição nos veículos para acompanhar depreciação" />;

  const ta = wv.reduce((s, v) => s + Number(v.purchase_value), 0);
  const tc = wv.reduce((s, v) => s + calc(v).current, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Aquisição" value={`R$ ${ta.toLocaleString('pt-BR', {maximumFractionDigits: 0})}`} icon={DollarSign} gradient="from-emerald-500/20 to-emerald-600/5" iconColor="text-emerald-400" />
        <KPICard label="Atual" value={`R$ ${tc.toLocaleString('pt-BR', {maximumFractionDigits: 0})}`} icon={Wallet} gradient="from-violet-500/20 to-violet-600/5" iconColor="text-violet-400" />
        <KPICard label="Depreciado" value={`R$ ${(ta - tc).toLocaleString('pt-BR', {maximumFractionDigits: 0})}`} icon={DollarSign} gradient="from-rose-500/20 to-rose-600/5" iconColor="text-rose-400" />
        <KPICard label="Veículos" value={wv.length} icon={Car} gradient="from-cyan-500/20 to-cyan-600/5" iconColor="text-cyan-400" />
      </div>
      <DataTable columns={['Veículo', 'Original', 'Meses', 'Acumulada', 'Atual', '% Dep.']}
        rows={wv.map((v, i) => {
          const c = calc(v);
          return { id: v.id, cells: [
            <div className="flex items-center gap-2.5"><div className="w-2.5 h-2.5 rounded-full" style={{ background: pieColors[i % pieColors.length] }}></div><div><div className="font-semibold text-white">{v.plate}</div><div className="text-[11px] text-slate-500">{v.model}</div></div></div>,
            <span className="text-emerald-300">R$ {Number(v.purchase_value).toLocaleString('pt-BR')}</span>,
            c.months, <span className="text-rose-300">R$ {c.dep.toLocaleString('pt-BR', {maximumFractionDigits: 0})}</span>,
            <span className="font-semibold text-white">R$ {c.current.toLocaleString('pt-BR', {maximumFractionDigits: 0})}</span>,
            <div className="inline-flex items-center gap-2"><div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden"><div className="h-full bg-gradient-to-r from-rose-500 to-rose-400" style={{ width: `${Math.min(100, c.pct)}%` }}></div></div><span className="text-xs text-slate-400 w-12 text-right">{c.pct.toFixed(1)}%</span></div>
          ] };
        })} />
    </div>
  );
}
