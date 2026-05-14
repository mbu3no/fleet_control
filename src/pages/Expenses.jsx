import React, { useState } from 'react';
import { Pencil, Trash2, Shield, Receipt } from 'lucide-react';
import { PageHeader, TabBtn, DataTable, SectionPage, EmptyState, InfleetSyncBar } from '../components/ui.jsx';
import { formatLocalDate } from '../lib/format.js';

export function ExpensesView({ vehicles, expenses, insurances, openModal, removeItem, getVehicleName, onSyncInfleet, syncingInfleet }) {
  const [section, setSection] = useState('insurances');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const status = (i) => {
    const d = Math.ceil((new Date(i.end_date) - today) / 86400000);
    if (d < 0) return { d, label: 'Vencido', cls: 'bg-rose-500/10 text-rose-300 border-rose-500/20' };
    if (d <= 30) return { d, label: 'Crítico', cls: 'bg-rose-500/10 text-rose-300 border-rose-500/20' };
    if (d <= 60) return { d, label: 'Atenção', cls: 'bg-amber-500/10 text-amber-300 border-amber-500/20' };
    return { d, label: 'Ok', cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' };
  };

  return (
    <div>
      <PageHeader title="Despesas gerais" subtitle="Seguros, IPVA, licenciamento" />
      <div className="flex gap-1 mb-8 p-1 rounded-xl bg-slate-900/50 border border-slate-800 w-fit">
        <TabBtn active={section === 'insurances'} onClick={() => setSection('insurances')} icon={Shield}>Seguros</TabBtn>
        <TabBtn active={section === 'expenses'} onClick={() => setSection('expenses')} icon={Receipt}>Despesas</TabBtn>
      </div>

      {section === 'insurances' && (
        <SectionPage title="Seguros" count={insurances.length} canAdd={vehicles.length > 0} onAdd={() => openModal('insurance')} empty={insurances.length === 0} emptyIcon={Shield} emptyText={vehicles.length === 0 ? "Cadastre veículos primeiro" : "Sem seguros"}>
          <div className="grid md:grid-cols-2 gap-4">
            {insurances.map(ins => {
              const st = status(ins);
              return (
                <div key={ins.id} className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-semibold text-white">{getVehicleName(ins.vehicle_id)}</div>
                        <span className={`inline-flex px-2 py-0.5 text-[10px] rounded-full border ${st.cls}`}>{st.label}</span>
                      </div>
                      <div className="text-xs text-slate-400">{ins.company}</div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openModal('insurance', ins)} className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400"><Pencil size={14} /></button>
                      <button onClick={() => removeItem('insurances', ins.id, 'Seguro')} className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-400"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-4">
                    <span>{new Date(ins.start_date).toLocaleDateString('pt-BR')}</span>
                    <span>{st.d < 0 ? `Vencido há ${Math.abs(st.d)}d` : `${st.d}d restantes`}</span>
                    <span>{new Date(ins.end_date).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-800">
                    <div><div className="text-[10px] text-slate-500 uppercase">Prêmio</div><div className="text-sm font-semibold text-white mt-0.5">R$ {Number(ins.premium || 0).toLocaleString('pt-BR', {maximumFractionDigits: 0})}</div></div>
                    <div><div className="text-[10px] text-slate-500 uppercase">Cobertura</div><div className="text-sm font-semibold text-white mt-0.5">R$ {Number(ins.coverage || 0).toLocaleString('pt-BR', {maximumFractionDigits: 0})}</div></div>
                    <div><div className="text-[10px] text-slate-500 uppercase">Franquia</div><div className="text-sm font-semibold text-white mt-0.5">R$ {Number(ins.deductible || 0).toLocaleString('pt-BR', {maximumFractionDigits: 0})}</div></div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionPage>
      )}

      {section === 'expenses' && (
        <div>
          <PageHeader title="Despesas" count={expenses.length} onAdd={vehicles.length > 0 ? () => openModal('expense') : null} />
          {onSyncInfleet && (
            <InfleetSyncBar
              syncedCount={expenses.filter(e => e.infleet_id).length}
              totalCount={expenses.length}
              lastSync={expenses.reduce((a, e) => (e.last_synced_at && (!a || e.last_synced_at > a)) ? e.last_synced_at : a, null)}
              onSync={onSyncInfleet}
              syncing={syncingInfleet}
            />
          )}
          {expenses.length === 0 ? <EmptyState icon={Receipt} text={vehicles.length === 0 ? "Cadastre veículos primeiro" : "Sem despesas — cadastre manual ou sincronize da Infleet."} /> : (
            <DataTable columns={['Data', 'Veículo', 'Tipo', 'Descrição', 'Valor']}
              rows={expenses.map(e => ({ id: e.id, cells: [
                <span className="flex items-center gap-2">
                  <span className="tabular-nums">{formatLocalDate(e.date)}</span>
                  {e.infleet_id && <span title="Sincronizado da Infleet" className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-sky-500/10 text-sky-300 border border-sky-500/20 font-medium tracking-wide">INFLEET</span>}
                </span>,
                <span>{getVehicleName(e.vehicle_id)}</span>,
                <span className="inline-flex px-2 py-0.5 text-[10px] font-medium tracking-wide bg-violet-500/10 text-violet-300 rounded-full border border-violet-500/20">{e.type}</span>,
                e.description || '—',
                <span className="font-semibold tabular-nums">R$ {Number(e.value).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
              ], onEdit: () => openModal('expense', e),
                 onRemove: () => removeItem('expenses', e.id, 'Despesa') }))} />
          )}
        </div>
      )}
    </div>
  );
}
