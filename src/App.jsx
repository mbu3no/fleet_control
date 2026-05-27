import React, { useState, useEffect } from 'react';
import {
  Car, Fuel, Wrench, Users, LayoutDashboard, MapPin, Settings, Building2,
  Wallet, Menu, Pencil, Trash2, DollarSign, Receipt, CalendarCheck, Loader2,
  Database, RefreshCw, Wifi, WifiOff, Sun, Moon, Calculator, Coins, X,
} from 'lucide-react';
import { supabase, fetchTable, insertRow, updateRow, deleteRow } from './lib/supabase.js';
import { formatLocalDate, matchesSearch } from './lib/format.js';
import {
  Toast, PageHeader, SectionPage, TabBtn, DataTable, EmptyState,
  Input, Select, SaveButton, InfleetSyncBar, SearchInput, ConfirmDialog,
} from './components/ui.jsx';
import { DashboardView } from './pages/Dashboard.jsx';
import { DepreciationView } from './pages/Depreciation.jsx';
import { ExpensesView } from './pages/Expenses.jsx';
import { ReservationsView } from './pages/Reservations.jsx';
import { AllocationView } from './pages/Allocation.jsx';
import { CostsView } from './pages/Costs.jsx';
import { UsersView } from './pages/Users.jsx';
import { useAuth, canSeePage } from './lib/auth.jsx';
import { isPasswordSetupUrl } from './lib/recovery.js';
import { LoginPage } from './pages/Login.jsx';
import { SetPasswordPage } from './pages/SetPassword.jsx';

function FleetApp() {
  const { role, allowedPages, isAdmin, canWrite, canDelete, profile: currentUser, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    const path = (typeof window !== 'undefined' && window.location.pathname) || '/';
    return PATH_TO_TAB[path] || 'dashboard';
  });
  const [showModal, setShowModal] = useState(null);
  const [formData, setFormData] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState('companies');
  const [vehiclesTab, setVehiclesTab] = useState('list');
  const [loadingData, setLoadingData] = useState(true);
  const [savingItem, setSavingItem] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [connectionError, setConnectionError] = useState('');
  const [toast, setToast] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('fleet_theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fleet_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [fuelings, setFuelings] = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [trips, setTrips] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [insurances, setInsurances] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [syncingInfleet, setSyncingInfleet] = useState(false);
  const [syncingWebposto, setSyncingWebposto] = useState(false);
  const [tableSearch, setTableSearch] = useState({});
  const updateSearch = (key, val) => setTableSearch(s => ({ ...s, [key]: val }));
  const [tripFilters, setTripFilters] = useState({ driver: '__all__', vehicle: '__all__' });
  const [tripPage, setTripPage] = useState(1);
  useEffect(() => { setTripPage(1); }, [tripFilters, tableSearch.trips]);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const showToast = (type, title, message, duration) => setToast({ type, title, message, duration });

  const syncInfleet = async () => {
    setSyncingInfleet(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-infleet-vehicles', { body: {} });
      if (error) throw new Error(error.message || String(error));
      if (!data?.ok) throw new Error(data?.error || 'Falha na sincronização');
      const v = data.vehicles || { inserted: 0, updated: 0, errors: [] };
      const d = data.drivers || { inserted: 0, updated: 0, errors: [] };
      const t = data.trips || { inserted: 0, updated: 0, errors: [] };
      const e = data.expenses || { inserted: 0, updated: 0, errors: [] };
      const m = data.maintenances || { inserted: 0, updated: 0, errors: [] };
      const totalErrors = (v.errors?.length || 0) + (d.errors?.length || 0) + (t.errors?.length || 0) + (e.errors?.length || 0) + (m.errors?.length || 0);
      const summary = `Veículos: +${v.inserted}/~${v.updated} · Motoristas: +${d.inserted}/~${d.updated} · Viagens: +${t.inserted} · Despesas: +${e.inserted}/~${e.updated} · Manutenções: +${m.inserted}/~${m.updated}`;
      if (totalErrors > 0) {
        showToast('error', 'Sincronização com avisos', `${summary} · ${totalErrors} erros`);
      } else {
        showToast('success', 'Sincronização concluída', summary);
      }
      await loadAll();
    } catch (e) {
      showToast('error', 'Erro na sincronização', e.message || String(e));
    } finally {
      setSyncingInfleet(false);
    }
  };

  const syncWebposto = async () => {
    setSyncingWebposto(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-webposto-fuelings', { body: {} });
      if (error) throw new Error(error.message || String(error));
      if (!data?.ok) throw new Error(data?.error || 'Falha na sincronização');
      const { inserted = 0, updated = 0, errors = [], caughtUp, vendasScanned = 0 } = data;
      const base = `+${inserted} novos · ${updated} atualizados`;
      if (errors.length > 0) {
        showToast('error', 'Sincronização com avisos', `${base} · ${errors.length} erros`);
      } else if (!caughtUp) {
        showToast('info', 'Backfill rodando em segundo plano', `${base} · ${vendasScanned} vendas varridas neste lote. A sincronização continua sozinha — atualize a página em alguns minutos.`, 8000);
      } else {
        showToast('success', 'Webposto sincronizado', `${base} · histórico completo`);
      }
      await loadAll();
    } catch (e) {
      showToast('error', 'Erro na sincronização Webposto', e.message || String(e));
    } finally {
      setSyncingWebposto(false);
    }
  };

  const loadAll = async () => {
    setLoadingData(true);
    setConnectionError('');
    try {
      const [cs, ccs, vs, ds, fs, ms, ts, es, is_, rs] = await Promise.all([
        fetchTable('companies', { order: 'name' }),
        fetchTable('cost_centers', { order: 'code' }),
        fetchTable('vehicles', { order: 'plate' }),
        fetchTable('drivers', { order: 'name' }),
        fetchTable('fuelings', { order: 'date', ascending: false }),
        fetchTable('maintenances', { order: 'date', ascending: false }),
        fetchTable('trips', { order: 'date', ascending: false }),
        fetchTable('expenses', { order: 'date', ascending: false }),
        fetchTable('insurances'),
        fetchTable('reservations', { order: 'start_date_time', ascending: false }),
      ]);
      setCompanies(cs);
      setCostCenters(ccs);
      setVehicles(vs);
      setDrivers(ds);
      setFuelings(fs);
      setMaintenances(ms);
      setTrips(ts);
      setExpenses(es);
      setInsurances(is_);
      setReservations(rs);
      setConnectionStatus('connected');
    } catch (e) {
      setConnectionStatus('error');
      setConnectionError(e.message);
      showToast('error', 'Erro ao conectar com Supabase', e.message, 0);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  // Volta para uma pagina valida se a aba atual nao for permitida ao usuario
  useEffect(() => {
    const PAGES = ['dashboard', 'vehicles', 'reservations', 'fuelings',
      'maintenances', 'expenses', 'drivers', 'trips', 'costs', 'allocation'];
    const adminOnly = activeTab === 'users' || activeTab === 'settings';
    if (adminOnly) {
      if (!isAdmin) setActiveTab('dashboard');
      return;
    }
    if (!canSeePage(activeTab, role, allowedPages)) {
      const first = PAGES.find(p => canSeePage(p, role, allowedPages));
      setActiveTab(first || 'dashboard');
    }
  }, [activeTab, role, isAdmin, allowedPages]);

  // Mantem a URL sincronizada com a aba ativa (e vice-versa, com back/forward)
  useEffect(() => {
    const sync = () => {
      const path = window.location.pathname || '/';
      setActiveTab(PATH_TO_TAB[path] || 'dashboard');
    };
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  useEffect(() => {
    const path = TAB_TO_PATH[activeTab] || '/';
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
  }, [activeTab]);

  // Atualiza o titulo da aba do navegador conforme a pagina
  useEffect(() => {
    const titles = {
      dashboard: 'Visão geral',
      vehicles: 'Veículos',
      reservations: 'Reservas',
      fuelings: 'Abastecimentos',
      maintenances: 'Manutenções',
      expenses: 'Despesas',
      drivers: 'Motoristas',
      trips: 'Viagens',
      costs: 'Custos',
      allocation: 'Rateio',
      settings: 'Configurações',
      users: 'Usuários',
    };
    const label = titles[activeTab];
    document.title = label ? `${label} · Fleet Control` : 'Fleet Control';
  }, [activeTab]);

  const openModal = (type, data = {}) => {
    if (!canWrite) { showToast('error', 'Sem permissão', 'Você não pode criar ou editar registros'); return; }
    setShowModal(type); setFormData(data);
  };
  const closeModal = () => { setShowModal(null); setFormData({}); };

  const saveGeneric = async (table, payload, id, label) => {
    setSavingItem(true);
    try {
      if (id) {
        await updateRow(table, id, payload);
        showToast('success', `${label} atualizado!`, '');
      } else {
        await insertRow(table, payload);
        showToast('success', `${label} criado!`, '');
      }
      await loadAll();
      closeModal();
    } catch (e) {
      showToast('error', `Erro ao salvar ${label.toLowerCase()}`, e.message, 0);
    } finally {
      setSavingItem(false);
    }
  };

  const removeItem = (table, id, label) => {
    if (!canDelete) { showToast('error', 'Sem permissão', 'Apenas administradores podem excluir'); return; }
    setConfirmDialog({
      title: `Excluir ${label.toLowerCase()}`,
      message: `Esta ação não pode ser desfeita. Tem certeza?`,
      confirmLabel: 'Excluir',
      confirmTone: 'rose',
      onConfirm: async () => {
        try {
          await deleteRow(table, id);
          showToast('success', `${label} excluído!`, '');
          await loadAll();
        } catch (e) {
          showToast('error', 'Erro ao excluir', e.message, 0);
        }
      }
    });
  };

  const saveCompany = () => {
    if (!formData.name?.trim()) { showToast('error', 'Erro', 'Nome é obrigatório'); return; }
    saveGeneric('companies', { name: formData.name.trim(), cnpj: formData.cnpj?.trim() || null }, formData.id, 'Empresa');
  };

  const saveCostCenter = () => {
    if (!formData.code?.trim() || !formData.name?.trim()) { showToast('error', 'Erro', 'Código e nome são obrigatórios'); return; }
    saveGeneric('cost_centers', {
      code: formData.code.trim(),
      name: formData.name.trim(),
      company_id: formData.company_id ? Number(formData.company_id) : null
    }, formData.id, 'Centro de custo');
  };

  const saveVehicle = () => {
    if (!formData.plate?.trim() || !formData.model?.trim()) { showToast('error', 'Erro', 'Placa e modelo são obrigatórios'); return; }
    const isInfleet = !!formData.infleet_id;
    const payload = {
      purchase_value: Number(formData.purchase_value) || 0,
      purchase_date: formData.purchase_date || null,
      next_revision_km: formData.next_revision_km ? Number(formData.next_revision_km) : null,
      next_revision_date: formData.next_revision_date || null,
      status: formData.status || 'disponível'
    };
    if (!isInfleet) {
      payload.plate = formData.plate.trim();
      payload.model = formData.model.trim();
      payload.year = formData.year ? Number(formData.year) : null;
      payload.current_km = Number(formData.current_km) || 0;
    }
    saveGeneric('vehicles', payload, formData.id, 'Veículo');
  };

  const saveDriver = () => {
    if (!formData.name?.trim()) { showToast('error', 'Erro', 'Nome é obrigatório'); return; }
    const isInfleet = !!formData.infleet_id;
    const payload = {
      phone: formData.phone?.trim() || null,
      company_id: formData.company_id ? Number(formData.company_id) : null,
      cost_center_id: formData.cost_center_id ? Number(formData.cost_center_id) : null
    };
    if (!isInfleet) {
      payload.name = formData.name.trim();
      payload.cnh = formData.cnh?.trim() || null;
    }
    saveGeneric('drivers', payload, formData.id, 'Motorista');
  };

  const saveFueling = () => {
    if (!formData.vehicle_id || !formData.liters || !formData.value) { showToast('error', 'Erro', 'Veículo, litros e valor são obrigatórios'); return; }
    if (formData.webposto_id) {
      showToast('info', 'Abastecimento do Webposto', 'Gerenciado pela integração — edição local desabilitada.');
      return;
    }
    saveGeneric('fuelings', {
      vehicle_id: Number(formData.vehicle_id),
      date: formData.date || new Date().toISOString().split('T')[0],
      liters: Number(formData.liters),
      value: Number(formData.value),
      km: formData.km ? Number(formData.km) : null
    }, formData.id, 'Abastecimento');
  };

  const saveMaintenance = () => {
    if (!formData.vehicle_id || !formData.type?.trim()) { showToast('error', 'Erro', 'Veículo e tipo são obrigatórios'); return; }
    saveGeneric('maintenances', {
      vehicle_id: Number(formData.vehicle_id),
      date: formData.date || new Date().toISOString().split('T')[0],
      type: formData.type.trim(),
      cost: Number(formData.cost) || 0,
      next_km: Number(formData.next_km) || 0
    }, formData.id, 'Manutenção');
  };

  const saveTrip = () => {
    if (!formData.vehicle_id || !formData.driver_id) { showToast('error', 'Erro', 'Veículo e motorista são obrigatórios'); return; }
    saveGeneric('trips', {
      vehicle_id: Number(formData.vehicle_id),
      driver_id: Number(formData.driver_id),
      date: formData.date || new Date().toISOString().split('T')[0],
      origin: formData.origin?.trim() || null,
      destination: formData.destination?.trim() || null,
      km: Number(formData.km) || 0
    }, formData.id, 'Viagem');
  };

  const saveExpense = () => {
    if (!formData.vehicle_id || !formData.type?.trim() || !formData.value) { showToast('error', 'Erro', 'Veículo, tipo e valor são obrigatórios'); return; }
    const isInfleet = !!formData.infleet_id;
    if (isInfleet) {
      showToast('info', 'Despesa gerenciada pela Infleet', 'Edite na Infleet — sincronização automática a cada 3h.');
      return;
    }
    saveGeneric('expenses', {
      vehicle_id: Number(formData.vehicle_id),
      type: formData.type,
      date: formData.date || new Date().toISOString().split('T')[0],
      due_date: formData.due_date || null,
      value: Number(formData.value),
      description: formData.description?.trim() || null
    }, formData.id, 'Despesa');
  };

  const saveInsurance = () => {
    if (!formData.vehicle_id || !formData.company?.trim() || !formData.start_date || !formData.end_date) { showToast('error', 'Erro', 'Veículo, seguradora e datas são obrigatórios'); return; }
    saveGeneric('insurances', {
      vehicle_id: Number(formData.vehicle_id),
      company: formData.company.trim(),
      policy_number: formData.policy_number?.trim() || null,
      start_date: formData.start_date,
      end_date: formData.end_date,
      premium: Number(formData.premium) || 0,
      coverage: Number(formData.coverage) || 0,
      deductible: Number(formData.deductible) || 0,
      broker: formData.broker?.trim() || null
    }, formData.id, 'Seguro');
  };

  const saveReservation = () => {
    if (!formData.requester_name?.trim() || !formData.vehicle_id || !formData.start_date_time || !formData.end_date_time || !formData.reason?.trim()) {
      showToast('error', 'Erro', 'Solicitante, veículo, datas e motivo são obrigatórios'); return;
    }
    saveGeneric('reservations', {
      vehicle_id: Number(formData.vehicle_id),
      requester_name: formData.requester_name.trim(),
      department: formData.department?.trim() || null,
      requester_email: formData.requester_email?.trim() || null,
      requester_phone: formData.requester_phone?.trim() || null,
      start_date_time: formData.start_date_time,
      end_date_time: formData.end_date_time,
      reason: formData.reason.trim(),
      status: formData.status || 'pendente'
    }, formData.id, 'Reserva');
  };

  const updateReservationStatus = async (id, status) => {
    try {
      await updateRow('reservations', id, { status, status_updated_at: new Date().toISOString() });
      showToast('success', 'Status atualizado', `Reserva agora está ${status}`);
      await loadAll();
    } catch (e) { showToast('error', 'Erro', e.message, 0); }
  };

  const getVehicleName = (id) => { const v = vehicles.find(v => v.id == id); return v ? `${v.plate} · ${v.model}` : 'N/A'; };
  const getDriverName = (id) => { if (id == null) return '(sem motorista)'; const d = drivers.find(d => d.id == id); return d ? d.name : 'N/A'; };
  const getCompanyName = (id) => { const c = companies.find(c => c.id == id); return c ? c.name : '—'; };
  const getCostCenterName = (id) => { const c = costCenters.find(c => c.id == id); return c ? `${c.code} · ${c.name}` : '—'; };

  const pieColors = ['#a78bfa', '#22d3ee', '#f59e0b', '#d946ef', '#34d399', '#fb7185', '#60a5fa', '#facc15'];

  if (loadingData && connectionStatus === 'checking') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center p-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center shadow-sm shadow-violet-500/20">
            <Car size={20} className="text-white" strokeWidth={2} />
          </div>
          <div className="text-left">
            <div className="text-base font-semibold text-white tracking-tight">Fleet Control</div>
            <div className="text-[10px] text-slate-500">Gestão integrada</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 size={12} className="animate-spin" />
          Conectando ao Supabase
        </div>
      </div>
    );
  }

  if (connectionStatus === 'error') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-lg w-full rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6">
          <div className="flex items-start gap-3 mb-4">
            <WifiOff size={24} className="text-rose-400 flex-shrink-0" />
            <div>
              <h2 className="text-lg font-semibold text-white">Falha na conexão</h2>
              <p className="text-sm text-slate-400 mt-1">Não foi possível conectar ao Supabase.</p>
            </div>
          </div>
          <div className="rounded-lg bg-slate-950/50 border border-slate-800 p-3 mb-4">
            <p className="text-xs text-rose-300 font-mono break-words">{connectionError}</p>
          </div>
          <div className="text-xs text-slate-300 space-y-2 mb-4">
            <p><strong className="text-white">Verifique:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Se o arquivo .env existe e tem as variáveis corretas</li>
              <li>Se você rodou o SQL no Supabase</li>
              <li>Se as tabelas foram criadas</li>
              <li>Se você está com internet</li>
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={loadAll} className="py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
              <RefreshCw size={14} /> Tentar novamente
            </button>
            <button onClick={() => window.location.reload()} className="py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 text-sm font-medium flex items-center justify-center gap-2 hover:bg-slate-800">
              <RefreshCw size={14} /> Recarregar app
            </button>
          </div>
        </div>
      </div>
    );
  }

  const mainNav = [
    { id: 'dashboard', label: 'Visão geral', icon: LayoutDashboard },
    { id: 'vehicles', label: 'Veículos', icon: Car },
    { id: 'reservations', label: 'Reservas', icon: CalendarCheck },
    { id: 'fuelings', label: 'Abastecimentos', icon: Fuel },
    { id: 'maintenances', label: 'Manutenções', icon: Wrench },
    { id: 'expenses', label: 'Despesas', icon: Receipt },
    { id: 'drivers', label: 'Motoristas', icon: Users },
    { id: 'trips', label: 'Viagens', icon: MapPin },
    { id: 'costs', label: 'Custos', icon: Coins },
    { id: 'allocation', label: 'Rateio', icon: Calculator },
  ];

  const settingsNav = [
    { id: 'companies', label: 'Empresas', icon: Building2 },
    { id: 'costCenters', label: 'Centros de custo', icon: Wallet },
  ];

  const visibleNav = mainNav.filter(item => canSeePage(item.id, role, allowedPages));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden">
      <div className="grain"></div>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl"></div>
        <div className="absolute top-96 -right-40 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative">
        <aside className={`fixed top-0 left-0 h-[100dvh] z-40 w-64 bg-slate-950/95 backdrop-blur-xl border-r border-slate-800/50 transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <div className="h-full flex flex-col">
            <div className="p-6 border-b border-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center shadow-sm shadow-violet-500/20">
                  <Car size={20} className="text-white" strokeWidth={2} />
                </div>
                <div>
                  <h1 className="text-base font-semibold text-white">Fleet Control</h1>
                  <p className="text-[10px] text-slate-500">Gestão integrada</p>
                </div>
              </div>
            </div>

            <nav className="flex-1 p-4 overflow-y-auto">
              <div className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold px-3 mb-2">Principal</div>
              <div className="space-y-1">
                {visibleNav.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 pl-3 pr-3 py-2.5 rounded-lg text-sm transition-colors duration-150 border-l-2 ${isActive ? 'border-violet-400 text-white bg-slate-800/40' : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/30'}`}>
                      <Icon size={16} strokeWidth={2} /><span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
                {isAdmin && (
                  <button onClick={() => { setActiveTab('users'); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 pl-3 pr-3 py-2.5 rounded-lg text-sm transition-colors duration-150 border-l-2 ${activeTab === 'users' ? 'border-violet-400 text-white bg-slate-800/40' : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/30'}`}>
                    <Users size={16} strokeWidth={2} /><span className="font-medium">Usuários</span>
                  </button>
                )}
              </div>
            </nav>

            <div className="p-4 border-t border-slate-800/50">
              <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                <Wifi size={11} className="text-emerald-400" />
                <span className="text-[11px] font-medium text-emerald-300">Conectado ao Supabase</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 px-3">
                <div className="min-w-0">
                  <div className="text-[11px] text-slate-300 truncate">{currentUser?.name || currentUser?.email}</div>
                  <div className="text-[10px] text-slate-600 capitalize">{role}</div>
                </div>
                <button onClick={signOut}
                  className="text-[11px] px-2 py-1 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors">
                  Sair
                </button>
              </div>
            </div>
          </div>
        </aside>

        {sidebarOpen && <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-30 lg:hidden" onClick={() => setSidebarOpen(false)}></div>}

        <div className="min-w-0 lg:ml-64">
          <header className="lg:hidden sticky top-0 z-20 border-b border-slate-800/50 backdrop-blur-xl bg-slate-950/80 p-4 flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="w-9 h-9 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-300 transition-colors">
              <Menu size={18} strokeWidth={2} />
            </button>
            <span className="text-sm font-semibold flex-1">Fleet Control</span>
            <button onClick={loadAll} disabled={loadingData} className="w-9 h-9 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-300 transition-colors disabled:opacity-50" title="Atualizar dados" aria-label="Atualizar dados">
              <RefreshCw size={16} strokeWidth={2} className={loadingData ? 'animate-spin' : ''} />
            </button>
            {isAdmin && (
            <button onClick={() => setActiveTab('settings')} className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${activeTab === 'settings' ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30' : 'hover:bg-slate-800 text-slate-300'}`} title="Configurações" aria-label="Configurações">
              <Settings size={16} strokeWidth={2} />
            </button>
            )}
            <button onClick={toggleTheme} className="w-9 h-9 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-300 transition-colors" title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'} aria-label="Alternar tema">
              {theme === 'dark' ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
            </button>
          </header>

          <header className="hidden lg:flex justify-end items-center gap-1 sticky top-0 z-20 px-6 lg:px-10 py-3">
            <button onClick={loadAll} disabled={loadingData} className="w-9 h-9 rounded-lg hover:bg-slate-800/60 flex items-center justify-center text-slate-400 hover:text-white transition-colors disabled:opacity-50" title="Atualizar dados" aria-label="Atualizar dados">
              <RefreshCw size={16} strokeWidth={2} className={loadingData ? 'animate-spin' : ''} />
            </button>
            {isAdmin && (
            <button onClick={() => setActiveTab('settings')} className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${activeTab === 'settings' ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30' : 'hover:bg-slate-800/60 text-slate-400 hover:text-white'}`} title="Configurações" aria-label="Configurações">
              <Settings size={16} strokeWidth={2} />
            </button>
            )}
            <button onClick={toggleTheme} className="w-9 h-9 rounded-lg hover:bg-slate-800/60 flex items-center justify-center text-slate-400 hover:text-white transition-colors" title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'} aria-label="Alternar tema">
              {theme === 'dark' ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
            </button>
          </header>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pb-8 lg:pb-10 pt-2 lg:pt-2">
            {activeTab === 'dashboard' && <DashboardView vehicles={vehicles} trips={trips} fuelings={fuelings} maintenances={maintenances} expenses={expenses} insurances={insurances} reservations={reservations} pieColors={pieColors} />}

            {activeTab === 'vehicles' && (
              <div>
                <PageHeader title="Veículos" count={vehicles.length} onAdd={canWrite ? () => openModal('vehicle') : undefined} />
                <InfleetSyncBar
                  syncedCount={vehicles.filter(v => v.infleet_id).length}
                  totalCount={vehicles.length}
                  lastSync={vehicles.reduce((a, v) => (v.last_synced_at && (!a || v.last_synced_at > a)) ? v.last_synced_at : a, null)}
                  onSync={syncInfleet}
                  syncing={syncingInfleet}
                />
                <div className="flex gap-1 mb-8 p-1 rounded-xl bg-slate-900/50 border border-slate-800 w-fit">
                  <TabBtn active={vehiclesTab === 'list'} onClick={() => setVehiclesTab('list')} icon={Car}>Lista</TabBtn>
                  <TabBtn active={vehiclesTab === 'depreciation'} onClick={() => setVehiclesTab('depreciation')} icon={DollarSign}>Depreciação</TabBtn>
                </div>
                {vehiclesTab === 'list' && (
                  vehicles.length === 0 ? <EmptyState icon={Car} text="Nenhum veículo cadastrado. Clique em 'Adicionar' para começar ou sincronize da Infleet." /> :
                  <DataTable columns={['Placa', 'Modelo', 'Ano', 'Km', 'Valor', 'Status']} canEdit={canWrite} canDelete={canDelete}
                    rows={vehicles.map(v => ({ id: v.id, cells: [
                      <span className="flex items-center gap-2"><span className="font-semibold text-white">{v.plate}</span>{v.infleet_id && <span title="Sincronizado da Infleet" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-sky-500/10 text-sky-300 border border-sky-500/20 font-medium tracking-wide">INFLEET</span>}</span>, v.model, v.year || '—',
                      `${Number(v.current_km || 0).toLocaleString('pt-BR')} km`,
                      v.purchase_value > 0 ? <span className="tabular-nums">R$ {Number(v.purchase_value).toLocaleString('pt-BR')}</span> : '—',
                      <span className="inline-flex px-2 py-0.5 text-[10px] font-medium tracking-wide bg-emerald-500/10 text-emerald-300 rounded-full border border-emerald-500/20">{v.status}</span>
                    ], onEdit: () => openModal('vehicle', v),
                       onRemove: () => removeItem('vehicles', v.id, 'Veículo') }))} />
                )}
                {vehiclesTab === 'depreciation' && <DepreciationView vehicles={vehicles} pieColors={pieColors} />}
              </div>
            )}

            {activeTab === 'reservations' && <ReservationsView vehicles={vehicles} reservations={reservations} openModal={openModal} removeItem={(id) => removeItem('reservations', id, 'Reserva')} updateStatus={updateReservationStatus} getVehicleName={getVehicleName} canWrite={canWrite} canDelete={canDelete} />}

            {activeTab === 'fuelings' && (() => {
              const q = tableSearch.fuelings || '';
              const filtered = fuelings.filter(f => matchesSearch(f, q, [
                x => getVehicleName(x.vehicle_id),
                x => x.date,
                x => x.km,
              ]));
              return (
                <div>
                  <PageHeader title="Abastecimentos" count={fuelings.length} onAdd={canWrite && vehicles.length > 0 ? () => openModal('fueling') : null} />
                  <InfleetSyncBar
                    title="Sincronização Webposto"
                    accent="amber"
                    syncedCount={fuelings.filter(f => f.webposto_id).length}
                    totalCount={fuelings.length}
                    lastSync={fuelings.reduce((a, f) => (f.last_synced_at && (!a || f.last_synced_at > a)) ? f.last_synced_at : a, null)}
                    onSync={syncWebposto}
                    syncing={syncingWebposto}
                  />
                  {fuelings.length === 0 ? <EmptyState icon={Fuel} text={vehicles.length === 0 ? "Cadastre veículos primeiro" : "Sem abastecimentos — cadastre manual ou sincronize do Webposto."} /> : (
                    <>
                      <SearchInput value={q} onChange={v => updateSearch('fuelings', v)} placeholder="Buscar por veículo, data..." />
                      <DataTable columns={['Data', 'Veículo', 'Litros', 'Valor', 'Km']} canEdit={canWrite} canDelete={canDelete}
                        rows={filtered.map(f => ({ id: f.id, cells: [
                          <span className="flex items-center gap-2">
                            <span className="tabular-nums">{formatLocalDate(f.date)}</span>
                            {f.webposto_id && <span title="Sincronizado do Webposto" className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium tracking-wide">WEBPOSTO</span>}
                          </span>,
                          <span>{getVehicleName(f.vehicle_id)}</span>,
                          `${f.liters} L`, `R$ ${Number(f.value).toFixed(2)}`, f.km ? Number(f.km).toLocaleString('pt-BR') : '—'
                        ], onEdit: () => openModal('fueling', f),
                           onRemove: () => removeItem('fuelings', f.id, 'Abastecimento') }))} />
                    </>
                  )}
                </div>
              );
            })()}

            {activeTab === 'maintenances' && (() => {
              const q = tableSearch.maintenances || '';
              const filtered = maintenances.filter(m => matchesSearch(m, q, [
                x => getVehicleName(x.vehicle_id),
                x => x.type,
                x => x.date,
              ]));
              return (
                <div>
                  <PageHeader title="Manutenções" count={maintenances.length} onAdd={canWrite && vehicles.length > 0 ? () => openModal('maintenance') : null} />
                  <InfleetSyncBar
                    syncedCount={maintenances.filter(m => m.infleet_id).length}
                    totalCount={maintenances.length}
                    lastSync={maintenances.reduce((a, m) => (m.last_synced_at && (!a || m.last_synced_at > a)) ? m.last_synced_at : a, null)}
                    onSync={syncInfleet}
                    syncing={syncingInfleet}
                  />
                  {maintenances.length === 0 ? <EmptyState icon={Wrench} text={vehicles.length === 0 ? "Cadastre veículos primeiro" : "Sem manutenções — cadastre manual ou sincronize da Infleet."} /> : (
                    <>
                      <SearchInput value={q} onChange={v => updateSearch('maintenances', v)} placeholder="Buscar por veículo, tipo, data..." />
                      <DataTable columns={['Data', 'Veículo', 'Tipo', 'Custo', 'Próxima (km)']} canEdit={canWrite} canDelete={canDelete}
                        rows={filtered.map(m => ({ id: m.id, cells: [
                          <span className="flex items-center gap-2">
                            <span className="tabular-nums">{formatLocalDate(m.date)}</span>
                            {m.infleet_id && <span title="Sincronizado da Infleet" className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-sky-500/10 text-sky-300 border border-sky-500/20 font-medium tracking-wide">INFLEET</span>}
                          </span>,
                          <span>{getVehicleName(m.vehicle_id)}</span>,
                          m.type, `R$ ${Number(m.cost).toFixed(2)}`, m.next_km > 0 ? Number(m.next_km).toLocaleString('pt-BR') : '—'
                        ], onEdit: () => openModal('maintenance', m),
                           onRemove: () => removeItem('maintenances', m.id, 'Manutenção') }))} />
                    </>
                  )}
                </div>
              );
            })()}

            {activeTab === 'expenses' && <ExpensesView vehicles={vehicles} expenses={expenses} insurances={insurances} openModal={openModal} removeItem={removeItem} getVehicleName={getVehicleName} onSyncInfleet={syncInfleet} syncingInfleet={syncingInfleet} canWrite={canWrite} canDelete={canDelete} />}

            {activeTab === 'drivers' && (
              <div>
                <PageHeader title="Motoristas" count={drivers.length} onAdd={canWrite ? () => openModal('driver') : undefined} />
                <InfleetSyncBar
                  syncedCount={drivers.filter(d => d.infleet_id).length}
                  totalCount={drivers.length}
                  lastSync={drivers.reduce((a, d) => (d.last_synced_at && (!a || d.last_synced_at > a)) ? d.last_synced_at : a, null)}
                  onSync={syncInfleet}
                  syncing={syncingInfleet}
                />
                {drivers.length === 0 ? <EmptyState icon={Users} text="Sem motoristas cadastrados. Adicione manualmente ou sincronize da Infleet." /> : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {drivers.map(d => {
                    const tripCount = trips.filter(t => t.driver_id == d.id).length;
                    return (
                      <div key={d.id} className="group relative rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
                              {d.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="font-medium text-white truncate">{d.name}</div>
                                {d.infleet_id && <span title="Sincronizado da Infleet" className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-sky-500/10 text-sky-300 border border-sky-500/20 font-medium tracking-wide">INFLEET</span>}
                              </div>
                              {d.cnh && <div className="text-xs text-slate-400 mt-0.5">CNH {d.cnh}</div>}
                              {d.phone && <div className="text-xs text-slate-500">{d.phone}</div>}
                              <div className="mt-2 space-y-1">
                                {d.company_id && <div className="flex items-center gap-1.5 text-xs"><Building2 size={11} className="text-violet-400" /><span className="text-slate-300 truncate">{getCompanyName(d.company_id)}</span></div>}
                                {d.cost_center_id && <div className="flex items-center gap-1.5 text-xs"><Wallet size={11} className="text-cyan-400" /><span className="text-slate-300 truncate">{getCostCenterName(d.cost_center_id)}</span></div>}
                                <div className="text-xs text-violet-400 font-medium pt-1">{tripCount} viagens</div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex-shrink-0">
                            {canWrite && <button onClick={() => openModal('driver', d)} className="w-7 h-7 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-violet-400"><Pencil size={13} /></button>}
                            {canDelete && <button onClick={() => removeItem('drivers', d.id, 'Motorista')} className="w-7 h-7 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-rose-400"><Trash2 size={13} /></button>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            )}

            {activeTab === 'trips' && (() => {
              const q = tableSearch.trips || '';
              const filtered = trips.filter(t => {
                if (!matchesSearch(t, q, [
                  x => getDriverName(x.driver_id),
                  x => getVehicleName(x.vehicle_id),
                  x => x.date,
                  x => x.origin,
                  x => x.destination,
                ])) return false;
                if (tripFilters.driver === '__none__') { if (t.driver_id != null) return false; }
                else if (tripFilters.driver !== '__all__') { if (String(t.driver_id) !== tripFilters.driver) return false; }
                if (tripFilters.vehicle !== '__all__') { if (String(t.vehicle_id) !== tripFilters.vehicle) return false; }
                return true;
              });
              const driversSorted = [...drivers].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
              const vehiclesSorted = [...vehicles].sort((a, b) => (a.plate || '').localeCompare(b.plate || ''));
              const filtersActive = tripFilters.driver !== '__all__' || tripFilters.vehicle !== '__all__';
              const PAGE_SIZE = 200;
              const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
              const safePage = Math.min(tripPage, totalPages);
              const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
              return (
              <div>
                <PageHeader title="Viagens" count={trips.length} onAdd={canWrite && vehicles.length > 0 && drivers.length > 0 ? () => openModal('trip') : null} />
                <InfleetSyncBar
                  syncedCount={trips.filter(t => t.infleet_trip_key).length}
                  totalCount={trips.length}
                  lastSync={trips.reduce((a, t) => (t.last_synced_at && (!a || t.last_synced_at > a)) ? t.last_synced_at : a, null)}
                  onSync={syncInfleet}
                  syncing={syncingInfleet}
                />
                {trips.length === 0 ? <EmptyState icon={MapPin} text={vehicles.length === 0 || drivers.length === 0 ? "Cadastre veículos e motoristas primeiro" : "Sem viagens — adicione manualmente ou sincronize da Infleet."} /> : (
                <>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <select value={tripFilters.driver} onChange={e => setTripFilters(f => ({ ...f, driver: e.target.value }))}
                    className="px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-violet-500">
                    <option value="__all__">Todos os motoristas</option>
                    <option value="__none__">(sem motorista)</option>
                    {driversSorted.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
                  </select>
                  <select value={tripFilters.vehicle} onChange={e => setTripFilters(f => ({ ...f, vehicle: e.target.value }))}
                    className="px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-violet-500">
                    <option value="__all__">Todos os veículos</option>
                    {vehiclesSorted.map(v => <option key={v.id} value={String(v.id)}>{v.plate} · {v.model}</option>)}
                  </select>
                  {filtersActive && (
                    <button onClick={() => setTripFilters({ driver: '__all__', vehicle: '__all__' })}
                      className="px-3 py-2 rounded-lg border border-slate-800 text-xs text-slate-400 hover:text-white hover:bg-slate-800">
                      Limpar filtros
                    </button>
                  )}
                  <span className="text-xs text-slate-500 ml-auto tabular-nums">{filtered.length} de {trips.length}</span>
                </div>
                <SearchInput value={q} onChange={v => updateSearch('trips', v)} placeholder="Buscar por motorista, veículo, rota, data..." />
                <DataTable columns={['Data', 'Motorista', 'Veículo', 'Rota', 'Km']} canEdit={canWrite} canDelete={canDelete}
                  rows={pageRows.map(t => ({ id: t.id, cells: [
                    <span className="flex items-center gap-2">
                      <span className="tabular-nums">{formatLocalDate(t.date)}</span>
                      {t.infleet_trip_key && <span title="Sincronizado da Infleet" className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-sky-500/10 text-sky-300 border border-sky-500/20 font-medium tracking-wide">INFLEET</span>}
                      {t.cobli_path_key && <span title="Importado da Cobli (historico)" className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-slate-500/10 text-slate-300 border border-slate-500/20 font-medium tracking-wide">COBLI</span>}
                    </span>,
                    t.driver_id == null
                      ? <span className="text-slate-500 italic">(sem motorista)</span>
                      : <span>{getDriverName(t.driver_id)}</span>,
                    getVehicleName(t.vehicle_id),
                    (t.origin || t.destination)
                      ? <span className="text-slate-300">{t.origin || '—'} <span className="text-slate-600">→</span> {t.destination || '—'}</span>
                      : <span className="text-slate-500 italic">{t.started_at ? new Date(t.started_at).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'}) : '—'} – {t.finished_at ? new Date(t.finished_at).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'}) : '—'}</span>,
                    <span className="tabular-nums">{Number(t.km || 0).toFixed(1).replace('.', ',')} km</span>
                  ], onEdit: () => openModal('trip', t),
                     onRemove: () => removeItem('trips', t.id, 'Viagem') }))} />
                {totalPages > 1 && (
                  <div className="flex items-center justify-between text-xs text-slate-500 mt-3 flex-wrap gap-2">
                    <span className="tabular-nums">Página {safePage} de {totalPages} · mostrando {pageRows.length} de {filtered.length}</span>
                    <div className="flex gap-1">
                      <button onClick={() => setTripPage(1)} disabled={safePage === 1}
                        className="px-2.5 py-1 rounded-lg border border-slate-800 disabled:opacity-30 hover:bg-slate-800 transition-colors">«</button>
                      <button onClick={() => setTripPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                        className="px-2.5 py-1 rounded-lg border border-slate-800 disabled:opacity-30 hover:bg-slate-800 transition-colors">‹ Anterior</button>
                      <button onClick={() => setTripPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                        className="px-2.5 py-1 rounded-lg border border-slate-800 disabled:opacity-30 hover:bg-slate-800 transition-colors">Próxima ›</button>
                      <button onClick={() => setTripPage(totalPages)} disabled={safePage === totalPages}
                        className="px-2.5 py-1 rounded-lg border border-slate-800 disabled:opacity-30 hover:bg-slate-800 transition-colors">»</button>
                    </div>
                  </div>
                )}
                </>
                )}
              </div>
              );
            })()}

            {activeTab === 'costs' && (
              <CostsView
                vehicles={vehicles}
                fuelings={fuelings}
                maintenances={maintenances}
                expenses={expenses}
                insurances={insurances}
                trips={trips}
              />
            )}

            {activeTab === 'allocation' && (
              <AllocationView
                vehicles={vehicles}
                drivers={drivers}
                companies={companies}
                trips={trips}
                fuelings={fuelings}
                maintenances={maintenances}
                expenses={expenses}
                insurances={insurances}
              />
            )}

            {activeTab === 'settings' && isAdmin && (
              <div>
                <div className="mb-8">
                  <h2 className="text-2xl lg:text-3xl font-semibold text-white tracking-tight">Configurações</h2>
                  <p className="text-sm text-slate-400 mt-1">Empresas e centros de custo</p>
                </div>
                <div className="flex gap-1 mb-8 p-1 rounded-xl bg-slate-900/50 border border-slate-800 w-fit">
                  {settingsNav.map(item => {
                    const Icon = item.icon;
                    return (
                      <button key={item.id} onClick={() => setSettingsSection(item.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${settingsSection === item.id ? 'bg-violet-500 text-white' : 'text-slate-400 hover:text-white'}`}>
                        <Icon size={14} /><span className="font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                {settingsSection === 'companies' && (
                  <SectionPage title="Empresas" count={companies.length} canAdd={canWrite} onAdd={() => openModal('company')} empty={companies.length === 0} emptyIcon={Building2} emptyText="Sem empresas. Clique em Adicionar para criar a primeira.">
                    <DataTable columns={['Nome', 'CNPJ', 'Motoristas']} canEdit={canWrite} canDelete={canDelete}
                      rows={companies.map(c => ({ id: c.id, cells: [
                        <span className="font-medium text-white">{c.name}</span>, c.cnpj || '—',
                        drivers.filter(d => d.company_id == c.id).length
                      ], onEdit: () => openModal('company', c),
                         onRemove: () => removeItem('companies', c.id, 'Empresa') }))} />
                  </SectionPage>
                )}

                {settingsSection === 'costCenters' && (
                  <SectionPage title="Centros de custo" count={costCenters.length} canAdd={canWrite} onAdd={() => openModal('costCenter')} empty={costCenters.length === 0} emptyIcon={Wallet} emptyText="Sem centros de custo">
                    <DataTable columns={['Código', 'Nome', 'Empresa', 'Motoristas']} canEdit={canWrite} canDelete={canDelete}
                      rows={costCenters.map(c => ({ id: c.id, cells: [
                        <span className="font-mono font-semibold text-white">{c.code}</span>, c.name,
                        getCompanyName(c.company_id),
                        drivers.filter(d => d.cost_center_id == c.id).length
                      ], onEdit: () => openModal('costCenter', c),
                         onRemove: () => removeItem('cost_centers', c.id, 'Centro de custo') }))} />
                  </SectionPage>
                )}
              </div>
            )}

            {activeTab === 'users' && isAdmin && <UsersView showToast={showToast} />}
          </main>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={closeModal}>
          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-7 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">
                {showModal === 'vehicle' && (formData.id ? 'Editar' : 'Novo') + ' veículo'}
                {showModal === 'driver' && (formData.id ? 'Editar' : 'Novo') + ' motorista'}
                {showModal === 'fueling' && (formData.id ? 'Editar' : 'Novo') + ' abastecimento'}
                {showModal === 'maintenance' && (formData.id ? 'Editar' : 'Nova') + ' manutenção'}
                {showModal === 'trip' && (formData.id ? 'Editar' : 'Nova') + ' viagem'}
                {showModal === 'company' && (formData.id ? 'Editar' : 'Nova') + ' empresa'}
                {showModal === 'costCenter' && (formData.id ? 'Editar' : 'Novo') + ' centro de custo'}
                {showModal === 'expense' && (formData.id ? 'Editar' : 'Nova') + ' despesa'}
                {showModal === 'insurance' && (formData.id ? 'Editar' : 'Novo') + ' seguro'}
                {showModal === 'reservation' && (formData.id ? 'Editar' : 'Nova') + ' reserva'}
              </h3>
              <button onClick={closeModal} className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400"><X size={16} /></button>
            </div>

            {showModal === 'company' && (
              <div className="space-y-4">
                <Input label="Nome *" value={formData.name} onChange={v => setFormData({...formData, name: v})} />
                <Input label="CNPJ" value={formData.cnpj} onChange={v => setFormData({...formData, cnpj: v})} />
                <SaveButton onClick={saveCompany} busy={savingItem} />
              </div>
            )}

            {showModal === 'costCenter' && (
              <div className="space-y-4">
                <Input label="Código *" value={formData.code} onChange={v => setFormData({...formData, code: v})} placeholder="CC-001" />
                <Input label="Nome *" value={formData.name} onChange={v => setFormData({...formData, name: v})} />
                <Select label="Empresa" value={formData.company_id} onChange={v => setFormData({...formData, company_id: v})} options={companies.map(c => ({value: c.id, label: c.name}))} />
                <SaveButton onClick={saveCostCenter} busy={savingItem} />
              </div>
            )}

            {showModal === 'vehicle' && (
              <div className="space-y-4">
                {formData.infleet_id && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-[11px] text-sky-200">
                    <Database size={14} className="text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      Veículo sincronizado da <strong>Infleet</strong>. Placa, modelo, ano e Km atual são gerenciados lá e atualizam automaticamente na próxima sincronização. Os demais campos (revisão, aquisição, status) continuam editáveis localmente.
                    </div>
                  </div>
                )}
                <Input label="Placa *" value={formData.plate} onChange={v => setFormData({...formData, plate: v})} readOnly={!!formData.infleet_id} hint={formData.infleet_id && 'via Infleet'} />
                <Input label="Modelo *" value={formData.model} onChange={v => setFormData({...formData, model: v})} readOnly={!!formData.infleet_id} hint={formData.infleet_id && 'via Infleet'} />
                <Input label="Ano" type="number" value={formData.year} onChange={v => setFormData({...formData, year: v})} readOnly={!!formData.infleet_id} hint={formData.infleet_id && 'via Infleet'} />
                <Input label="Km atual" type="number" value={formData.current_km} onChange={v => setFormData({...formData, current_km: v})} readOnly={!!formData.infleet_id} hint={formData.infleet_id && 'via Infleet'} />
                <Input label="Valor de aquisição (R$)" type="number" value={formData.purchase_value} onChange={v => setFormData({...formData, purchase_value: v})} />
                <Input label="Data de aquisição" type="date" value={formData.purchase_date} onChange={v => setFormData({...formData, purchase_date: v})} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Próxima revisão (km)" type="number" value={formData.next_revision_km} onChange={v => setFormData({...formData, next_revision_km: v})} />
                  <Input label="Próxima revisão (data)" type="date" value={formData.next_revision_date} onChange={v => setFormData({...formData, next_revision_date: v})} />
                </div>
                <Select label="Status" value={formData.status} onChange={v => setFormData({...formData, status: v})} options={[{value: 'disponível', label: 'Disponível'}, {value: 'em uso', label: 'Em uso'}, {value: 'manutenção', label: 'Manutenção'}, {value: 'inativo', label: 'Inativo'}]} />
                <SaveButton onClick={saveVehicle} busy={savingItem} />
              </div>
            )}

            {showModal === 'driver' && (
              <div className="space-y-4">
                {formData.infleet_id && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-[11px] text-sky-200">
                    <Database size={14} className="text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      Motorista sincronizado da <strong>Infleet</strong>. Nome e CNH são gerenciados lá e atualizam automaticamente. Telefone, empresa e centro de custo continuam editáveis localmente.
                    </div>
                  </div>
                )}
                <Input label="Nome *" value={formData.name} onChange={v => setFormData({...formData, name: v})} readOnly={!!formData.infleet_id} hint={formData.infleet_id && 'via Infleet'} />
                <Input label="CNH" value={formData.cnh} onChange={v => setFormData({...formData, cnh: v})} readOnly={!!formData.infleet_id} hint={formData.infleet_id && 'via Infleet'} />
                <Input label="Telefone" value={formData.phone} onChange={v => setFormData({...formData, phone: v})} />
                <Select label="Empresa" value={formData.company_id} onChange={v => setFormData({...formData, company_id: v, cost_center_id: ''})} options={companies.map(c => ({value: c.id, label: c.name}))} />
                <Select label="Centro de custo" value={formData.cost_center_id} onChange={v => setFormData({...formData, cost_center_id: v})} options={costCenters.filter(c => !formData.company_id || c.company_id == formData.company_id).map(c => ({value: c.id, label: `${c.code} · ${c.name}`}))} />
                <SaveButton onClick={saveDriver} busy={savingItem} />
              </div>
            )}

            {showModal === 'fueling' && (
              <div className="space-y-4">
                {formData.webposto_id && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200">
                    <Database size={14} className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      Abastecimento sincronizado do <strong>Webposto</strong>. Todos os campos são gerenciados lá. Edição local desabilitada.
                    </div>
                  </div>
                )}
                <Select label="Veículo *" value={formData.vehicle_id} onChange={v => setFormData({...formData, vehicle_id: v})} options={vehicles.map(v => ({value: v.id, label: `${v.plate} · ${v.model}`}))} />
                <Input label="Data" type="date" value={formData.date} onChange={v => setFormData({...formData, date: v})} readOnly={!!formData.webposto_id} hint={formData.webposto_id && 'via Webposto'} />
                <Input label="Litros *" type="number" value={formData.liters} onChange={v => setFormData({...formData, liters: v})} readOnly={!!formData.webposto_id} hint={formData.webposto_id && 'via Webposto'} />
                <Input label="Valor (R$) *" type="number" value={formData.value} onChange={v => setFormData({...formData, value: v})} readOnly={!!formData.webposto_id} hint={formData.webposto_id && 'via Webposto'} />
                <Input label="Km" type="number" value={formData.km} onChange={v => setFormData({...formData, km: v})} readOnly={!!formData.webposto_id} hint={formData.webposto_id && 'via Webposto'} />
                {!formData.webposto_id && <SaveButton onClick={saveFueling} busy={savingItem} />}
              </div>
            )}

            {showModal === 'maintenance' && (
              <div className="space-y-4">
                <Select label="Veículo *" value={formData.vehicle_id} onChange={v => setFormData({...formData, vehicle_id: v})} options={vehicles.map(v => ({value: v.id, label: `${v.plate} · ${v.model}`}))} />
                <Input label="Data" type="date" value={formData.date} onChange={v => setFormData({...formData, date: v})} />
                <Input label="Tipo *" value={formData.type} onChange={v => setFormData({...formData, type: v})} placeholder="Troca de óleo, revisão..." />
                <Input label="Custo (R$)" type="number" value={formData.cost} onChange={v => setFormData({...formData, cost: v})} />
                <Input label="Próxima (km)" type="number" value={formData.next_km} onChange={v => setFormData({...formData, next_km: v})} />
                <SaveButton onClick={saveMaintenance} busy={savingItem} />
              </div>
            )}

            {showModal === 'trip' && (
              <div className="space-y-4">
                <Select label="Motorista *" value={formData.driver_id} onChange={v => setFormData({...formData, driver_id: v})} options={drivers.map(d => ({value: d.id, label: d.name}))} />
                <Select label="Veículo *" value={formData.vehicle_id} onChange={v => setFormData({...formData, vehicle_id: v})} options={vehicles.map(v => ({value: v.id, label: `${v.plate} · ${v.model}`}))} />
                <Input label="Data" type="date" value={formData.date} onChange={v => setFormData({...formData, date: v})} />
                <Input label="Origem *" value={formData.origin} onChange={v => setFormData({...formData, origin: v})} />
                <Input label="Destino *" value={formData.destination} onChange={v => setFormData({...formData, destination: v})} />
                <Input label="Km" type="number" value={formData.km} onChange={v => setFormData({...formData, km: v})} />
                <SaveButton onClick={saveTrip} busy={savingItem} />
              </div>
            )}

            {showModal === 'expense' && (
              <div className="space-y-4">
                {formData.infleet_id && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-[11px] text-sky-200">
                    <Database size={14} className="text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      Despesa sincronizada da <strong>Infleet</strong>. Todos os campos são gerenciados lá. Edição local desabilitada.
                    </div>
                  </div>
                )}
                <Select label="Veículo *" value={formData.vehicle_id} onChange={v => setFormData({...formData, vehicle_id: v})} options={vehicles.map(v => ({value: v.id, label: `${v.plate} · ${v.model}`}))} />
                <Select label="Tipo *" value={formData.type} onChange={v => setFormData({...formData, type: v})} options={['IPVA', 'Licenciamento', 'DPVAT', 'Multas', 'Pedágio', 'Lavagem', 'Outros'].map(t => ({value: t, label: t}))} />
                <Input label="Data efetiva (pagamento)" type="date" value={formData.date} onChange={v => setFormData({...formData, date: v})} readOnly={!!formData.infleet_id} hint={formData.infleet_id ? 'via Infleet' : 'deixe vazio se ainda não foi paga'} />
                <Input label="Vencimento" type="date" value={formData.due_date} onChange={v => setFormData({...formData, due_date: v})} readOnly={!!formData.infleet_id} hint={formData.infleet_id && 'via Infleet'} />
                <Input label="Valor (R$) *" type="number" value={formData.value} onChange={v => setFormData({...formData, value: v})} readOnly={!!formData.infleet_id} hint={formData.infleet_id && 'via Infleet'} />
                <Input label="Descrição" value={formData.description} onChange={v => setFormData({...formData, description: v})} readOnly={!!formData.infleet_id} hint={formData.infleet_id && 'via Infleet'} />
                {!formData.infleet_id && <SaveButton onClick={saveExpense} busy={savingItem} />}
              </div>
            )}

            {showModal === 'insurance' && (
              <div className="space-y-4">
                <Select label="Veículo *" value={formData.vehicle_id} onChange={v => setFormData({...formData, vehicle_id: v})} options={vehicles.map(v => ({value: v.id, label: `${v.plate} · ${v.model}`}))} />
                <Input label="Seguradora *" value={formData.company} onChange={v => setFormData({...formData, company: v})} />
                <Input label="Apólice" value={formData.policy_number} onChange={v => setFormData({...formData, policy_number: v})} />
                <Input label="Início *" type="date" value={formData.start_date} onChange={v => setFormData({...formData, start_date: v})} />
                <Input label="Fim *" type="date" value={formData.end_date} onChange={v => setFormData({...formData, end_date: v})} />
                <Input label="Prêmio (R$)" type="number" value={formData.premium} onChange={v => setFormData({...formData, premium: v})} />
                <Input label="Cobertura (R$)" type="number" value={formData.coverage} onChange={v => setFormData({...formData, coverage: v})} />
                <Input label="Franquia (R$)" type="number" value={formData.deductible} onChange={v => setFormData({...formData, deductible: v})} />
                <SaveButton onClick={saveInsurance} busy={savingItem} />
              </div>
            )}

            {showModal === 'reservation' && (
              <div className="space-y-4">
                <Input label="Solicitante *" value={formData.requester_name} onChange={v => setFormData({...formData, requester_name: v})} />
                <Input label="Departamento" value={formData.department} onChange={v => setFormData({...formData, department: v})} />
                <Input label="E-mail" type="email" value={formData.requester_email} onChange={v => setFormData({...formData, requester_email: v})} />
                <Select label="Veículo *" value={formData.vehicle_id} onChange={v => setFormData({...formData, vehicle_id: v})} options={vehicles.map(v => ({value: v.id, label: `${v.plate} · ${v.model}`}))} />
                <Input label="Retirada *" type="datetime-local" value={formData.start_date_time} onChange={v => setFormData({...formData, start_date_time: v})} />
                <Input label="Devolução *" type="datetime-local" value={formData.end_date_time} onChange={v => setFormData({...formData, end_date_time: v})} />
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">Motivo *</label>
                  <textarea value={formData.reason || ''} onChange={e => setFormData({...formData, reason: e.target.value})} rows={3} className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500" />
                </div>
                <Select label="Status" value={formData.status} onChange={v => setFormData({...formData, status: v})} options={[{value: 'pendente', label: 'Pendente'}, {value: 'confirmada', label: 'Confirmada'}, {value: 'em_andamento', label: 'Em andamento'}, {value: 'concluida', label: 'Concluída'}, {value: 'cancelada', label: 'Cancelada'}, {value: 'rejeitada', label: 'Rejeitada'}]} />
                <SaveButton onClick={saveReservation} busy={savingItem} />
              </div>
            )}
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
      <ConfirmDialog dialog={confirmDialog} onClose={() => setConfirmDialog(null)} />
    </div>
  );
}

function AuthLoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Loader2 size={14} className="animate-spin" />
        Carregando
      </div>
    </div>
  );
}

const TAB_TO_PATH = {
  dashboard: '/',
  vehicles: '/veiculos',
  reservations: '/reservas',
  fuelings: '/abastecimentos',
  maintenances: '/manutencoes',
  expenses: '/despesas',
  drivers: '/motoristas',
  trips: '/viagens',
  costs: '/custos',
  allocation: '/rateio',
  settings: '/configuracoes',
  users: '/usuarios',
};
const PATH_TO_TAB = Object.fromEntries(Object.entries(TAB_TO_PATH).map(([k, v]) => [v, k]));

export default function App() {
  const { session, profile, loading } = useAuth();

  // Link de convite/recuperacao: define a senha, independente de sessao
  if (isPasswordSetupUrl) return <SetPasswordPage />;

  if (loading) return <AuthLoadingScreen />;
  if (!session || !profile) return <LoginPage />;

  return <FleetApp />;
}
