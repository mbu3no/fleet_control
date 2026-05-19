import React, { useState } from 'react';
import {
  Car, Fuel, Wrench, Activity, Wallet, DollarSign, Shield, Receipt, TrendingUp,
  Database, CheckCircle2, CalendarCheck,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { KPICard } from '../components/ui.jsx';
import { formatLocalDate } from '../lib/format.js';
import { computePeriod } from '../lib/allocation.js';

const PRESETS = [
  { id: 'this_month', label: 'Este mês' },
  { id: 'last_month', label: 'Mês anterior' },
  { id: 'last_30', label: '30 dias' },
  { id: 'this_year', label: 'Este ano' },
  { id: 'last_year', label: 'Ano anterior' },
  { id: 'all', label: 'Tudo' },
  { id: 'custom', label: 'Personalizado' },
];

export function DashboardView({ vehicles, trips, fuelings, maintenances, expenses, insurances, reservations, pieColors }) {
  const [preset, setPreset] = useState('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [from, to] = computePeriod(preset, customFrom, customTo);
  const inPeriod = (d) => {
    if (!d) return false;
    const s = String(d).slice(0, 10);
    return s >= from && s <= to;
  };

  const periodTrips = trips.filter(t => inPeriod(t.date));
  const periodFuelings = fuelings.filter(f => inPeriod(f.date));
  const periodMaint = maintenances.filter(m => inPeriod(m.date));
  const periodExp = expenses.filter(e => inPeriod(e.date));

  // Seguros pro-rateados pelo overlap com o período
  const fromMs = new Date(from + 'T00:00:00').getTime();
  const toMs = new Date(to + 'T23:59:59').getTime();
  const totalIns = insurances.reduce((s, i) => {
    if (!i.start_date || !i.end_date) return s;
    const sMs = new Date(i.start_date + 'T00:00:00').getTime();
    const eMs = new Date(i.end_date + 'T23:59:59').getTime();
    if (eMs < fromMs || sMs > toMs) return s;
    const overlap = Math.max(0, Math.min(toMs, eMs) - Math.max(fromMs, sMs));
    const total = Math.max(1, eMs - sMs);
    return s + (Number(i.premium) || 0) * (overlap / total);
  }, 0);

  const totalKm = periodTrips.reduce((s, t) => s + (Number(t.km) || 0), 0);
  const totalLiters = periodFuelings.reduce((s, f) => s + (Number(f.liters) || 0), 0);
  const totalFuel = periodFuelings.reduce((s, f) => s + (Number(f.value) || 0), 0);
  const totalMaint = periodMaint.reduce((s, m) => s + (Number(m.cost) || 0), 0);
  const totalExp = periodExp.reduce((s, e) => s + (Number(e.value) || 0), 0);
  const totalCost = totalFuel + totalMaint + totalExp + totalIns;
  const cpk = totalKm > 0 ? totalCost / totalKm : 0;
  const consumption = totalLiters > 0 ? totalKm / totalLiters : 0;

  const costByVehicle = vehicles.map(v => {
    const vF = periodFuelings.filter(f => f.vehicle_id == v.id).reduce((s, f) => s + Number(f.value || 0), 0);
    const vM = periodMaint.filter(m => m.vehicle_id == v.id).reduce((s, m) => s + Number(m.cost || 0), 0);
    const total = vF + vM;
    const vK = periodTrips.filter(t => t.vehicle_id == v.id).reduce((s, t) => s + Number(t.km || 0), 0);
    return { plate: v.plate, total, km: vK };
  }).filter(v => v.total > 0 || v.km > 0).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl lg:text-3xl font-semibold tracking-tight mb-1">Bem-vindo de volta</h2>
        <p className="text-sm text-slate-400">Visão geral da frota · {from} → {to}</p>
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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard label="Veículos" value={vehicles.length} icon={Car} gradient="from-violet-500/20 to-violet-600/5" iconColor="text-violet-400" />
        <KPICard label="Km rodados" value={totalKm.toLocaleString('pt-BR')} icon={Activity} gradient="from-cyan-500/20 to-cyan-600/5" iconColor="text-cyan-400" />
        <KPICard label="Consumo médio" value={consumption > 0 ? `${consumption.toFixed(1)} km/L` : '—'} icon={TrendingUp} gradient="from-teal-500/20 to-teal-600/5" iconColor="text-teal-400" />
        <KPICard label="Custo/km" value={`R$ ${cpk.toFixed(2)}`} icon={DollarSign} gradient="from-emerald-500/20 to-emerald-600/5" iconColor="text-emerald-400" />
        <KPICard label="Total" value={`R$ ${totalCost.toLocaleString('pt-BR', {maximumFractionDigits: 0})}`} icon={Wallet} gradient="from-rose-500/20 to-rose-600/5" iconColor="text-rose-400" />
        <KPICard label="Combustível" value={`R$ ${totalFuel.toLocaleString('pt-BR', {maximumFractionDigits: 0})}`} icon={Fuel} gradient="from-amber-500/20 to-amber-600/5" iconColor="text-amber-400" />
        <KPICard label="Manutenção" value={`R$ ${totalMaint.toLocaleString('pt-BR', {maximumFractionDigits: 0})}`} icon={Wrench} gradient="from-fuchsia-500/20 to-fuchsia-600/5" iconColor="text-fuchsia-400" />
        <KPICard label="Seguros" value={`R$ ${totalIns.toLocaleString('pt-BR', {maximumFractionDigits: 0})}`} icon={Shield} gradient="from-sky-500/20 to-sky-600/5" iconColor="text-sky-400" />
        <KPICard label="Despesas" value={`R$ ${totalExp.toLocaleString('pt-BR', {maximumFractionDigits: 0})}`} icon={Receipt} gradient="from-indigo-500/20 to-indigo-600/5" iconColor="text-indigo-400" />
      </div>

      {vehicles.length === 0 ? (
        <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-8 text-center">
          <Database size={36} className="text-violet-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">Banco de dados conectado!</h3>
          <p className="text-sm text-slate-300 mb-4">Comece cadastrando suas empresas, depois veículos e motoristas.</p>
          <p className="text-xs text-slate-500">Use o menu lateral para navegar entre as seções.</p>
        </div>
      ) : (
        <>
          <div className="grid lg:grid-cols-2 gap-4">
            <TotalBreakdown totalFuel={totalFuel} totalMaint={totalMaint} totalIns={totalIns} totalExp={totalExp} totalCost={totalCost} pieColors={pieColors} />
            <TodayReservations reservations={reservations} vehicles={vehicles} />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <DueAlerts insurances={insurances} expenses={expenses} vehicles={vehicles} />
            <RevisionAlerts vehicles={vehicles} />
          </div>

          {costByVehicle.length > 0 && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                <h3 className="text-sm font-semibold text-white mb-1">Custo por veículo</h3>
                <p className="text-xs text-slate-500 mb-5">Ranking</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={costByVehicle.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" stroke="#64748b" fontSize={11} tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="plate" stroke="#64748b" fontSize={11} width={80} />
                    <Tooltip contentStyle={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(167, 139, 250, 0.3)', borderRadius: '12px', fontSize: '12px', fontFamily: 'Geist, ui-sans-serif, system-ui, sans-serif', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)' }} labelStyle={{ color: '#cbd5e1', fontWeight: 500 }} itemStyle={{ color: '#fff' }} cursor={{ fill: 'rgba(167, 139, 250, 0.08)' }} formatter={(v) => `R$ ${v.toLocaleString('pt-BR')}`} />
                    <Bar dataKey="total" fill="#a78bfa" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                <h3 className="text-sm font-semibold text-white mb-1">Distribuição</h3>
                <p className="text-xs text-slate-500 mb-5">Por categoria</p>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={[
                      { name: 'Combustível', value: totalFuel },
                      { name: 'Manutenção', value: totalMaint },
                      { name: 'Seguros', value: totalIns },
                      { name: 'Despesas', value: totalExp }
                    ].filter(d => d.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3}>
                      {[0,1,2,3].map(i => <Cell key={i} fill={pieColors[i]} stroke="none" />)}
                    </Pie>
                    <Tooltip formatter={(v) => `R$ ${v.toLocaleString('pt-BR')}`} contentStyle={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(167, 139, 250, 0.3)', borderRadius: '12px', fontSize: '12px', fontFamily: 'Geist, ui-sans-serif, system-ui, sans-serif', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)' }} itemStyle={{ color: '#fff' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'Geist, ui-sans-serif, system-ui, sans-serif' }} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <RecentActivity fuelings={fuelings} maintenances={maintenances} expenses={expenses} vehicles={vehicles} />
        </>
      )}
    </div>
  );
}

function TotalBreakdown({ totalFuel, totalMaint, totalIns, totalExp, totalCost, pieColors }) {
  const items = [
    { label: 'Combustível', value: totalFuel, color: pieColors[0] },
    { label: 'Manutenção', value: totalMaint, color: pieColors[1] },
    { label: 'Seguros', value: totalIns, color: pieColors[2] },
    { label: 'Despesas', value: totalExp, color: pieColors[3] }
  ].filter(d => d.value > 0);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
      <h3 className="text-sm font-semibold text-white mb-1">Composição do Total</h3>
      <p className="text-xs text-slate-500 mb-5">R$ {totalCost.toLocaleString('pt-BR', {maximumFractionDigits: 0})}</p>
      {totalCost === 0 ? (
        <p className="text-xs text-slate-500 py-8 text-center">Sem custos lançados ainda</p>
      ) : (
        <>
          <div className="flex h-3 rounded-full overflow-hidden mb-4 bg-slate-800">
            {items.map(it => (
              <div key={it.label} style={{ width: `${(it.value / totalCost) * 100}%`, background: it.color }} />
            ))}
          </div>
          <div className="space-y-2">
            {items.map(it => {
              const pct = (it.value / totalCost) * 100;
              return (
                <div key={it.label} className="flex items-center gap-3 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: it.color }} />
                  <span className="text-slate-300 flex-1">{it.label}</span>
                  <span className="text-slate-500 tabular-nums w-10 text-right">{pct.toFixed(0)}%</span>
                  <span className="text-white font-semibold tabular-nums w-28 text-right">R$ {it.value.toLocaleString('pt-BR', {maximumFractionDigits: 0})}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function TodayReservations({ reservations, vehicles }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayItems = reservations.filter(r => {
    if (!['confirmada', 'em_andamento', 'pendente'].includes(r.status)) return false;
    const start = new Date(r.start_date_time);
    const end = new Date(r.end_date_time);
    return start < tomorrow && end >= today;
  }).sort((a, b) => new Date(a.start_date_time) - new Date(b.start_date_time));

  const getVehicleLabel = (id) => {
    const v = vehicles.find(x => x.id == id);
    return v ? `${v.plate} · ${v.model}` : '—';
  };

  const fmt = (dt) => new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
      <h3 className="text-sm font-semibold text-white mb-1">Reservas de hoje</h3>
      <p className="text-xs text-slate-500 mb-5">{today.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
      {todayItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-xs text-slate-500">
          <CalendarCheck size={28} className="text-slate-600 mb-2" />
          Sem reservas para hoje
        </div>
      ) : (
        <div className="space-y-2 max-h-[260px] overflow-auto pr-1">
          {todayItems.slice(0, 6).map(r => (
            <div key={r.id} className="flex items-center gap-3 text-xs p-3 rounded-xl bg-slate-950/50 border border-slate-800">
              <div className={`w-2 h-2 rounded-full shrink-0 ${r.status === 'em_andamento' ? 'bg-cyan-400' : r.status === 'confirmada' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium truncate">{r.requester_name}</div>
                <div className="text-slate-500 truncate">{getVehicleLabel(r.vehicle_id)}</div>
              </div>
              <div className="text-slate-300 tabular-nums whitespace-nowrap">{fmt(r.start_date_time)} – {fmt(r.end_date_time)}</div>
            </div>
          ))}
          {todayItems.length > 6 && (
            <p className="text-[11px] text-slate-500 text-center pt-1">+{todayItems.length - 6} mais</p>
          )}
        </div>
      )}
    </div>
  );
}

function DueAlerts({ insurances, expenses, vehicles }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const getVehicle = (id) => vehicles.find(v => v.id == id);
  const daysBetween = (d) => Math.floor((new Date(d) - today) / (1000 * 60 * 60 * 24));

  const items = [];

  insurances.forEach(i => {
    if (!i.end_date) return;
    const days = daysBetween(i.end_date);
    if (days > 30) return;
    const severity = days <= 15 ? 'critical' : 'warning';
    items.push({
      id: `ins-${i.id}`,
      kind: 'Seguro',
      icon: Shield,
      vehicle: getVehicle(i.vehicle_id),
      days,
      severity,
      subtitle: i.company || ''
    });
  });

  expenses.forEach(e => {
    if (!e.due_date) return;
    // Se data efetiva está preenchida e não é futura, considera despesa concluída → não alerta
    if (e.date) {
      const dateStr = String(e.date).slice(0, 10);
      const todayStr = today.toISOString().slice(0, 10);
      if (dateStr <= todayStr) return;
    }
    const days = daysBetween(e.due_date);
    const isIpva = (e.type || '').trim().toLowerCase() === 'ipva';
    if (isIpva) {
      if (days > 14) return;
    } else if (days > 30) {
      return;
    }
    const severity = isIpva ? (days <= 7 ? 'critical' : 'warning') : (days <= 7 ? 'critical' : 'warning');
    items.push({
      id: `exp-${e.id}`,
      kind: e.type || 'Despesa',
      icon: Receipt,
      vehicle: getVehicle(e.vehicle_id),
      days,
      severity,
      subtitle: `R$ ${Number(e.value).toLocaleString('pt-BR', {maximumFractionDigits: 0})}`
    });
  });

  items.sort((a, b) => a.days - b.days);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
      <h3 className="text-sm font-semibold text-white mb-1">Alertas de vencimento</h3>
      <p className="text-xs text-slate-500 mb-5">Seguros, IPVA e despesas</p>
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-xs text-slate-500">
          <CheckCircle2 size={28} className="text-emerald-500/60 mb-2" />
          Tudo em dia
        </div>
      ) : (
        <div className="space-y-2 max-h-[260px] overflow-auto pr-1">
          {items.slice(0, 10).map(it => {
            const Icon = it.icon;
            const styles = it.severity === 'critical'
              ? { bg: 'bg-rose-500/5', border: 'border-rose-500/30', iconColor: 'text-rose-400', text: 'text-rose-300' }
              : { bg: 'bg-amber-500/5', border: 'border-amber-500/30', iconColor: 'text-amber-400', text: 'text-amber-300' };
            const label = it.days < 0 ? `vencido há ${-it.days}d` : it.days === 0 ? 'vence hoje' : `em ${it.days}d`;
            return (
              <div key={it.id} className={`flex items-center gap-3 text-xs p-3 rounded-xl border ${styles.bg} ${styles.border}`}>
                <Icon size={16} className={`${styles.iconColor} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">{it.kind} · {it.vehicle?.plate || '—'}</div>
                  <div className="text-slate-400 truncate">{it.subtitle}</div>
                </div>
                <div className={`tabular-nums ${styles.text} whitespace-nowrap font-medium`}>{label}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RevisionAlerts({ vehicles }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysBetween = (d) => Math.floor((new Date(d) - today) / (1000 * 60 * 60 * 24));

  const items = vehicles.map(v => {
    const km = Number(v.current_km) || 0;
    const targetKm = v.next_revision_km != null && v.next_revision_km !== '' ? Number(v.next_revision_km) : null;
    const targetDate = v.next_revision_date || null;
    const kmRemaining = targetKm != null ? targetKm - km : null;
    const daysRemaining = targetDate ? daysBetween(targetDate) : null;

    let severity = null;
    const reasons = [];

    if (kmRemaining != null) {
      if (kmRemaining <= 0) { severity = 'critical'; reasons.push(`${(-kmRemaining).toLocaleString('pt-BR')} km além do limite`); }
      else if (kmRemaining <= 500) { severity = severity || 'warning'; reasons.push(`faltam ${kmRemaining.toLocaleString('pt-BR')} km`); }
    }
    if (daysRemaining != null) {
      if (daysRemaining <= 0) { severity = 'critical'; reasons.push(daysRemaining === 0 ? 'vence hoje' : `vencido há ${-daysRemaining}d`); }
      else if (daysRemaining <= 15) { severity = severity || 'warning'; reasons.push(`em ${daysRemaining}d`); }
    }

    if (!severity) return null;
    return { id: v.id, vehicle: v, severity, reasons, kmRemaining, daysRemaining };
  }).filter(Boolean).sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
    const aDays = a.daysRemaining ?? 999;
    const bDays = b.daysRemaining ?? 999;
    return aDays - bDays;
  });

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
      <h3 className="text-sm font-semibold text-white mb-1">Alertas de revisão</h3>
      <p className="text-xs text-slate-500 mb-5">Por km ou data, o que vier primeiro</p>
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-xs text-slate-500">
          <CheckCircle2 size={28} className="text-emerald-500/60 mb-2" />
          Revisões em dia
        </div>
      ) : (
        <div className="space-y-2 max-h-[260px] overflow-auto pr-1">
          {items.slice(0, 10).map(it => {
            const styles = it.severity === 'critical'
              ? { bg: 'bg-rose-500/5', border: 'border-rose-500/30', iconColor: 'text-rose-400' }
              : { bg: 'bg-amber-500/5', border: 'border-amber-500/30', iconColor: 'text-amber-400' };
            return (
              <div key={it.id} className={`flex items-center gap-3 text-xs p-3 rounded-xl border ${styles.bg} ${styles.border}`}>
                <Wrench size={16} className={`${styles.iconColor} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">{it.vehicle.plate} · {it.vehicle.model}</div>
                  <div className="text-slate-400 truncate">{it.reasons.join(' · ')}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RecentActivity({ fuelings, maintenances, expenses, vehicles }) {
  const getVehicle = (id) => {
    const v = vehicles.find(x => x.id == id);
    return v ? v.plate : '—';
  };

  const items = [];
  fuelings.forEach(f => items.push({
    id: `f-${f.id}`,
    kind: 'Abastecimento',
    icon: Fuel,
    color: 'amber',
    vehicle: getVehicle(f.vehicle_id),
    value: Number(f.value) || 0,
    date: f.date,
    created_at: f.created_at || f.date,
    subtitle: `${f.liters || 0} L`
  }));
  maintenances.forEach(m => items.push({
    id: `m-${m.id}`,
    kind: 'Manutenção',
    icon: Wrench,
    color: 'fuchsia',
    vehicle: getVehicle(m.vehicle_id),
    value: Number(m.cost) || 0,
    date: m.date,
    created_at: m.created_at || m.date,
    subtitle: m.type || ''
  }));
  expenses.forEach(e => items.push({
    id: `e-${e.id}`,
    kind: e.type || 'Despesa',
    icon: Receipt,
    color: 'indigo',
    vehicle: getVehicle(e.vehicle_id),
    value: Number(e.value) || 0,
    date: e.date,
    created_at: e.created_at || e.date,
    subtitle: e.description || ''
  }));

  items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const colorMap = {
    amber: 'text-amber-400 bg-amber-500/10',
    fuchsia: 'text-fuchsia-400 bg-fuchsia-500/10',
    indigo: 'text-indigo-400 bg-indigo-500/10'
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
      <h3 className="text-sm font-semibold text-white mb-1">Atividade recente</h3>
      <p className="text-xs text-slate-500 mb-5">Últimos lançamentos</p>
      {items.length === 0 ? (
        <p className="text-xs text-slate-500 py-8 text-center">Sem lançamentos ainda</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-2">
          {items.slice(0, 10).map(it => {
            const Icon = it.icon;
            return (
              <div key={it.id} className="flex items-center gap-3 text-xs p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colorMap[it.color]}`}>
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">{it.kind} · {it.vehicle}</div>
                  <div className="text-slate-500 truncate">
                    {it.subtitle && `${it.subtitle} · `}{formatLocalDate(it.date)}
                  </div>
                </div>
                <div className="text-white font-semibold tabular-nums whitespace-nowrap">R$ {it.value.toLocaleString('pt-BR', {maximumFractionDigits: 0})}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
