import React, { useState } from 'react';
import { Car, CalendarCheck, Clock, AlertTriangle, ExternalLink } from 'lucide-react';
import { PageHeader, EmptyState } from '../components/ui.jsx';

const NEW_SYSTEM_URL = 'https://grupofamiliapires.com.br/m/controle-de-frotas/reservas';

export function ReservationsView({ vehicles, reservations, openModal, removeItem, updateStatus, getVehicleName, canWrite, canDelete, canCreate }) {
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

  const goToNewSystem = () => { window.location.href = NEW_SYSTEM_URL; };

  return (
    <div>
      <PageHeader title="Reservas" count={reservations.length} onAdd={goToNewSystem} />

      <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
          <AlertTriangle size={20} className="text-amber-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-white mb-1">
            As reservas agora são feitas no novo sistema interno.
          </div>
          <div className="text-xs text-slate-400 mb-3 leading-relaxed">
            Este app não recebe mais reservas — as antigas ficam aqui só para consulta.
          </div>
          <button onClick={goToNewSystem}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500 hover:bg-violet-400 text-white text-sm font-medium transition-colors shadow-sm shadow-violet-500/15">
            <ExternalLink size={14} /> Ir para o novo sistema de reservas
          </button>
        </div>
      </div>

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
            <div key={r.id} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <div className="font-semibold text-white truncate">{r.requester_name}</div>
                    <span className={`inline-flex px-2 py-0.5 text-[10px] rounded-full border ${sc[r.status]?.cls}`}>{sc[r.status]?.label}</span>
                  </div>
                  {r.department && <div className="text-xs text-slate-400">{r.department}</div>}
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
            </div>
          ))}
        </div>
      }
    </div>
  );
}
