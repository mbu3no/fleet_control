import React, { useState } from 'react';
import { Car, CalendarCheck, Clock, Pencil, Trash2, CheckCircle2, X } from 'lucide-react';
import { PageHeader, EmptyState } from '../components/ui.jsx';

export function ReservationsView({ vehicles, reservations, openModal, removeItem, updateStatus, getVehicleName, canWrite, canDelete }) {
  const [filter, setFilter] = useState('all');
  const sc = {
    pendente: { cls: 'bg-amber-500/10 text-amber-300 border-amber-500/20', label: 'Pendente' },
    confirmada: { cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', label: 'Confirmada' },
    em_andamento: { cls: 'bg-violet-500/10 text-violet-300 border-violet-500/20', label: 'Em andamento' },
    concluida: { cls: 'bg-slate-500/10 text-slate-300 border-slate-500/20', label: 'Concluída' },
    cancelada: { cls: 'bg-rose-500/10 text-rose-300 border-rose-500/20', label: 'Cancelada' },
    rejeitada: { cls: 'bg-rose-500/10 text-rose-300 border-rose-500/20', label: 'Rejeitada' }
  };
  const fmt = (dt) => new Date(dt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const filtered = filter === 'all' ? reservations : reservations.filter(r => r.status === filter);

  return (
    <div>
      <PageHeader title="Reservas" count={reservations.length} onAdd={canWrite && vehicles.length > 0 ? () => openModal('reservation') : null} />
      <div className="flex gap-2 flex-wrap mb-6">
        {['all', 'pendente', 'confirmada', 'em_andamento', 'concluida'].map(s => {
          const count = s === 'all' ? reservations.length : reservations.filter(r => r.status === s).length;
          return (
            <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${filter === s ? 'bg-violet-500/20 text-violet-300 border-violet-500/30' : 'bg-slate-900/50 text-slate-400 border-slate-800'}`}>
              {s === 'all' ? 'Todas' : sc[s].label} ({count})
            </button>
          );
        })}
      </div>
      {filtered.length === 0 ? <EmptyState icon={CalendarCheck} text={vehicles.length === 0 ? "Cadastre veículos primeiro" : "Sem reservas"} /> :
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(r => (
            <div key={r.id} className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <div className="font-semibold text-white truncate">{r.requester_name}</div>
                    <span className={`inline-flex px-2 py-0.5 text-[10px] rounded-full border ${sc[r.status]?.cls}`}>{sc[r.status]?.label}</span>
                  </div>
                  {r.department && <div className="text-xs text-slate-400">{r.department}</div>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {canWrite && <button onClick={() => openModal('reservation', r)} className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400"><Pencil size={14} /></button>}
                  {canDelete && <button onClick={() => removeItem(r.id)} className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-400"><Trash2 size={14} /></button>}
                </div>
              </div>
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-slate-950/50 border border-slate-800">
                <Car size={14} className="text-cyan-400" /><span className="text-sm font-medium text-white">{getVehicleName(r.vehicle_id)}</span>
              </div>
              <div className="space-y-1 text-xs mb-3">
                <div className="flex items-center gap-2"><Clock size={11} className="text-emerald-400" /><span className="text-slate-400">Retirada:</span><span className="text-white">{fmt(r.start_date_time)}</span></div>
                <div className="flex items-center gap-2"><Clock size={11} className="text-rose-400" /><span className="text-slate-400">Devolução:</span><span className="text-white">{fmt(r.end_date_time)}</span></div>
              </div>
              {r.reason && <div className="pt-3 border-t border-slate-800 text-xs text-slate-300">{r.reason}</div>}
              {canWrite && r.status === 'pendente' && (
                <div className="mt-4 pt-4 border-t border-slate-800 flex gap-2">
                  <button onClick={() => updateStatus(r.id, 'confirmada')} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium hover:bg-emerald-500/20"><CheckCircle2 size={13} />Aprovar</button>
                  <button onClick={() => updateStatus(r.id, 'rejeitada')} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium hover:bg-rose-500/20"><X size={13} />Rejeitar</button>
                </div>
              )}
            </div>
          ))}
        </div>
      }
    </div>
  );
}
