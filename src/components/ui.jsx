import React, { useEffect } from 'react';
import {
  CheckCircle2, AlertCircle, Activity, X, Plus, Pencil, Trash2,
  Database, Loader2, RefreshCw, Search,
} from 'lucide-react';
import { fmtRelativeTime } from '../lib/format.js';

export function ConfirmDialog({ dialog, onClose }) {
  useEffect(() => {
    if (!dialog) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dialog, onClose]);

  if (!dialog) return null;
  const toneClass = dialog.confirmTone === 'violet'
    ? 'bg-violet-500 hover:bg-violet-400 shadow-violet-500/15'
    : 'bg-rose-500 hover:bg-rose-400 shadow-rose-500/15';
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" onClick={onClose}>
      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-white mb-2 tracking-tight">{dialog.title}</h3>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">{dialog.message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors">
            Cancelar
          </button>
          <button onClick={async () => { onClose(); await dialog.onConfirm(); }} className={`px-4 py-2 rounded-xl ${toneClass} text-white text-sm font-medium shadow-sm transition-colors`}>
            {dialog.confirmLabel || 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = "Buscar..." }) {
  return (
    <div className="relative w-full sm:max-w-sm mb-4">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-9 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-shadow"
      />
      {value && (
        <button onClick={() => onChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export function Toast({ toast, onClose }) {
  useEffect(() => {
    if (toast) {
      const t = setTimeout(onClose, toast?.duration || 4000);
      return () => clearTimeout(t);
    }
  }, [toast, onClose]);

  if (!toast) return null;
  const cfg = {
    success: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-100', icon: CheckCircle2, color: 'text-emerald-300' },
    error: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-100', icon: AlertCircle, color: 'text-rose-300' },
    info: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-100', icon: Activity, color: 'text-cyan-300' }
  };
  const c = cfg[toast.type] || cfg.info;
  const Icon = c.icon;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md">
      <div className={`flex items-start gap-3 p-4 rounded-2xl border backdrop-blur-xl shadow-2xl ${c.bg} ${c.border}`}>
        <Icon size={18} className={`${c.color} flex-shrink-0 mt-0.5`} strokeWidth={2} />
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${c.text}`}>{toast.title}</div>
          {toast.message && <div className="text-xs text-slate-300 mt-1 break-words whitespace-pre-wrap">{toast.message}</div>}
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white flex-shrink-0">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, count, onAdd }) {
  return (
    <div className="flex items-center justify-between mb-8 gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl lg:text-2xl font-semibold text-white tracking-tight truncate">{title}</h2>
          {count != null && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold tabular-nums bg-violet-500/10 text-violet-300 border border-violet-500/20">{count}</span>
          )}
        </div>
        {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {onAdd && (
        <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-white text-sm font-medium shadow-sm shadow-violet-500/15 transition-colors">
          <Plus size={16} strokeWidth={2.5} /><span className="hidden sm:inline">Adicionar</span>
        </button>
      )}
    </div>
  );
}

export function SectionPage({ title, subtitle, count, canAdd, onAdd, empty, emptyIcon, emptyText, children }) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} count={count} onAdd={canAdd ? onAdd : null} />
      {empty ? <EmptyState icon={emptyIcon} text={emptyText} /> : children}
    </div>
  );
}

export function TabBtn({ active, onClick, icon: Icon, children }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${active ? 'bg-violet-500 text-white' : 'text-slate-400 hover:text-white'}`}>
      <Icon size={14} /><span className="font-medium">{children}</span>
    </button>
  );
}

export function DataTable({ columns, rows }) {
  const lastColIdx = columns.length - 1;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
      <div className="overflow-auto max-h-[calc(100vh-220px)]">
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-slate-900 backdrop-blur-xl">
            <tr className="border-b border-slate-800">
              {columns.map((col, i) => (
                <th key={i} className={`text-left px-6 py-3.5 text-[11px] font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap ${i < lastColIdx ? 'border-r border-slate-800/60' : ''}`}>{col}</th>
              ))}
              <th className="px-6 py-3.5 border-l border-slate-800/60"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="border-b border-slate-800/50 last:border-0 text-sm text-slate-300 hover:bg-slate-800/30 transition-colors duration-150 group">
                {row.cells.map((cell, i) => (
                  <td key={i} className={`px-6 py-4 whitespace-nowrap ${i < lastColIdx ? 'border-r border-slate-800/40' : ''}`}>{cell}</td>
                ))}
                <td className="px-6 py-4 text-right whitespace-nowrap border-l border-slate-800/40">
                  <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    {row.onEdit && <button onClick={row.onEdit} className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-violet-400 transition-colors"><Pencil size={14} /></button>}
                    {row.onRemove && <button onClick={row.onRemove} className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-400 transition-colors"><Trash2 size={14} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, text }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 px-8 py-16 text-center">
      <div className="inline-flex w-16 h-16 mx-auto mb-5 items-center justify-center rounded-2xl bg-slate-800/60 border border-slate-800">
        <Icon size={26} className="text-slate-500" strokeWidth={1.5} />
      </div>
      <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">{text}</p>
    </div>
  );
}

export function InfleetSyncBar({ syncedCount, totalCount, lastSync, onSync, syncing }) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap mb-6 p-4 rounded-xl bg-sky-500/5 border border-sky-500/20">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
          <Database size={18} className="text-sky-400" />
        </div>
        <div className="min-w-0">
          <div className="text-sm text-white font-medium">Sincronização Infleet</div>
          <div className="text-xs text-slate-400">
            {syncedCount} de {totalCount} sincronizados
            {lastSync && <> · última sync {fmtRelativeTime(lastSync)}</>}
            {!lastSync && <> · ainda não sincronizado</>}
          </div>
        </div>
      </div>
      <button onClick={onSync} disabled={syncing} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-200 text-xs font-medium hover:bg-sky-500/20 disabled:opacity-50">
        {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        {syncing ? 'Sincronizando...' : 'Sincronizar agora'}
      </button>
    </div>
  );
}

export function KPICard({ label, value, icon: Icon, gradient, iconColor }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-50`}></div>
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">{label}</span>
          <Icon size={16} className={iconColor} strokeWidth={2} />
        </div>
        <div className="text-2xl font-bold text-white tracking-tight tabular-nums">{value}</div>
      </div>
    </div>
  );
}

export function Input({ label, value, onChange, type = 'text', placeholder, readOnly = false, hint }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1.5 font-medium">
        {label}
        {hint && <span className="ml-2 text-[10px] text-slate-500 font-normal italic">{hint}</span>}
      </label>
      <input type={type} value={value || ''} onChange={e => !readOnly && onChange(e.target.value)} placeholder={placeholder} readOnly={readOnly}
        className={`w-full px-3.5 py-2.5 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-shadow ${readOnly ? 'bg-slate-900 text-slate-400 cursor-not-allowed' : 'bg-slate-950'}`} />
    </div>
  );
}

export function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1.5 font-medium">{label}</label>
      <select value={value || ''} onChange={e => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-shadow">
        <option value="">Selecione...</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function SaveButton({ onClick, busy }) {
  return (
    <button onClick={onClick} disabled={busy}
      className="w-full mt-2 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-white text-sm font-medium shadow-sm shadow-violet-500/15 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
      {busy ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
      {busy ? 'Salvando...' : 'Salvar no Supabase'}
    </button>
  );
}
