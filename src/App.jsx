import React, { useState, useEffect } from 'react';
import { Car, Fuel, Wrench, Users, LayoutDashboard, Plus, Trash2, AlertCircle, MapPin, X, Activity, Settings, Building2, Wallet, Menu, Pencil, DollarSign, Shield, Receipt, CheckCircle2, Clock, CalendarCheck, TrendingUp, Loader2, Database, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { supabase, fetchTable, insertRow, updateRow, deleteRow } from './lib/supabase.js';

// =====================================================================
// TOAST (notificação visual)
// =====================================================================
function Toast({ toast, onClose }) {
  useEffect(() => {
    if (toast?.duration !== 0) {
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

// =====================================================================
// APP PRINCIPAL
// =====================================================================
export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
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

  const showToast = (type, title, message, duration) => setToast({ type, title, message, duration });

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
      console.log('✅ Dados carregados:', { companies: cs.length, vehicles: vs.length, drivers: ds.length });
    } catch (e) {
      console.error('❌ Erro ao carregar:', e);
      setConnectionStatus('error');
      setConnectionError(e.message);
      showToast('error', 'Erro ao conectar com Supabase', e.message, 0);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const openModal = (type, data = {}) => { setShowModal(type); setFormData(data); };
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
      console.error('[SAVE] ❌ Erro:', e);
      showToast('error', `Erro ao salvar ${label.toLowerCase()}`, e.message, 0);
    } finally {
      setSavingItem(false);
    }
  };

  const removeItem = async (table, id, label) => {
    if (!confirm(`Confirma a exclusão deste ${label.toLowerCase()}?`)) return;
    try {
      await deleteRow(table, id);
      showToast('success', `${label} excluído!`, '');
      await loadAll();
    } catch (e) {
      showToast('error', 'Erro ao excluir', e.message, 0);
    }
  };

  // ============= SAVES POR ENTIDADE =============
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
    saveGeneric('vehicles', {
      plate: formData.plate.trim(),
      model: formData.model.trim(),
      year: formData.year ? Number(formData.year) : null,
      current_km: Number(formData.current_km) || 0,
      purchase_value: Number(formData.purchase_value) || 0,
      purchase_date: formData.purchase_date || null,
      status: formData.status || 'disponível'
    }, formData.id, 'Veículo');
  };

  const saveDriver = () => {
    if (!formData.name?.trim()) { showToast('error', 'Erro', 'Nome é obrigatório'); return; }
    saveGeneric('drivers', {
      name: formData.name.trim(),
      cnh: formData.cnh?.trim() || null,
      phone: formData.phone?.trim() || null,
      company_id: formData.company_id ? Number(formData.company_id) : null,
      cost_center_id: formData.cost_center_id ? Number(formData.cost_center_id) : null
    }, formData.id, 'Motorista');
  };

  const saveFueling = () => {
    if (!formData.vehicle_id || !formData.liters || !formData.value) { showToast('error', 'Erro', 'Veículo, litros e valor são obrigatórios'); return; }
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
    if (!formData.vehicle_id || !formData.driver_id || !formData.origin?.trim() || !formData.destination?.trim()) { showToast('error', 'Erro', 'Todos os campos principais são obrigatórios'); return; }
    saveGeneric('trips', {
      vehicle_id: Number(formData.vehicle_id),
      driver_id: Number(formData.driver_id),
      date: formData.date || new Date().toISOString().split('T')[0],
      origin: formData.origin.trim(),
      destination: formData.destination.trim(),
      km: Number(formData.km) || 0
    }, formData.id, 'Viagem');
  };

  const saveExpense = () => {
    if (!formData.vehicle_id || !formData.type?.trim() || !formData.value) { showToast('error', 'Erro', 'Veículo, tipo e valor são obrigatórios'); return; }
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
  const getDriverName = (id) => { const d = drivers.find(d => d.id == id); return d ? d.name : 'N/A'; };
  const getCompanyName = (id) => { const c = companies.find(c => c.id == id); return c ? c.name : '—'; };
  const getCostCenterName = (id) => { const c = costCenters.find(c => c.id == id); return c ? `${c.code} · ${c.name}` : '—'; };

  const pieColors = ['#a78bfa', '#22d3ee', '#f59e0b', '#d946ef', '#34d399', '#fb7185', '#60a5fa', '#facc15'];

  if (loadingData && connectionStatus === 'checking') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center p-4">
        <Loader2 size={32} className="text-violet-400 animate-spin mb-3" />
        <p className="text-sm text-slate-400">Conectando ao Supabase...</p>
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
            <button onClick={loadAll} className="py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white text-sm font-medium flex items-center justify-center gap-2">
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
  ];

  const settingsNav = [
    { id: 'companies', label: 'Empresas', icon: Building2 },
    { id: 'costCenters', label: 'Centros de custo', icon: Wallet },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl"></div>
        <div className="absolute top-60 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative flex">
        <aside className={`fixed lg:sticky top-0 left-0 h-screen z-40 w-64 bg-slate-950/95 backdrop-blur-xl border-r border-slate-800/50 transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <div className="h-full flex flex-col">
            <div className="p-6 border-b border-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
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
                {mainNav.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${isActive ? 'bg-gradient-to-r from-violet-500/20 to-cyan-500/10 text-white border border-violet-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
                      <Icon size={16} strokeWidth={2} /><span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold px-3 mb-2 mt-6">Sistema</div>
              <button onClick={() => { setActiveTab('settings'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${activeTab === 'settings' ? 'bg-gradient-to-r from-violet-500/20 to-cyan-500/10 text-white border border-violet-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
                <Settings size={16} strokeWidth={2} /><span className="font-medium">Configurações</span>
              </button>
            </nav>

            <div className="p-4 border-t border-slate-800/50 space-y-2">
              <button onClick={loadAll} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-800 transition-all">
                <RefreshCw size={12} strokeWidth={2} /> Atualizar dados
              </button>

              <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                <Wifi size={11} className="text-emerald-400" />
                <span className="text-[11px] font-medium text-emerald-300">Conectado ao Supabase</span>
              </div>
            </div>
          </div>
        </aside>

        {sidebarOpen && <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-30 lg:hidden" onClick={() => setSidebarOpen(false)}></div>}

        <div className="flex-1 min-w-0">
          <header className="lg:hidden sticky top-0 z-20 border-b border-slate-800/50 backdrop-blur-xl bg-slate-950/80 p-4 flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="w-9 h-9 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-300">
              <Menu size={18} strokeWidth={2} />
            </button>
            <span className="text-sm font-semibold">Fleet Control</span>
          </header>

          <main className="max-w-7xl mx-auto px-6 lg:px-10 py-8 lg:py-10">
            {activeTab === 'dashboard' && <DashboardView vehicles={vehicles} trips={trips} fuelings={fuelings} maintenances={maintenances} expenses={expenses} insurances={insurances} pieColors={pieColors} />}

            {activeTab === 'vehicles' && (
              <div>
                <PageHeader title="Veículos" subtitle={`${vehicles.length} cadastrados`} onAdd={() => openModal('vehicle')} />
                <div className="flex gap-1 mb-8 p-1 rounded-xl bg-slate-900/50 border border-slate-800 w-fit">
                  <TabBtn active={vehiclesTab === 'list'} onClick={() => setVehiclesTab('list')} icon={Car}>Lista</TabBtn>
                  <TabBtn active={vehiclesTab === 'depreciation'} onClick={() => setVehiclesTab('depreciation')} icon={DollarSign}>Depreciação</TabBtn>
                </div>
                {vehiclesTab === 'list' && (
                  vehicles.length === 0 ? <EmptyState icon={Car} text="Nenhum veículo cadastrado. Clique em 'Adicionar' para começar." /> :
                  <DataTable columns={['Placa', 'Modelo', 'Ano', 'Km', 'Valor', 'Status']}
                    rows={vehicles.map(v => ({ id: v.id, cells: [
                      <span className="font-semibold text-white">{v.plate}</span>, v.model, v.year || '—',
                      `${Number(v.current_km || 0).toLocaleString('pt-BR')} km`,
                      v.purchase_value > 0 ? <span className="text-emerald-300">R$ {Number(v.purchase_value).toLocaleString('pt-BR')}</span> : '—',
                      <span className="inline-flex px-2.5 py-1 text-[11px] bg-emerald-500/10 text-emerald-300 rounded-full border border-emerald-500/20">{v.status}</span>
                    ], onEdit: () => openModal('vehicle', v),
                       onRemove: () => removeItem('vehicles', v.id, 'Veículo') }))} />
                )}
                {vehiclesTab === 'depreciation' && <DepreciationView vehicles={vehicles} pieColors={pieColors} />}
              </div>
            )}

            {activeTab === 'reservations' && <ReservationsView vehicles={vehicles} reservations={reservations} openModal={openModal} removeItem={(id) => removeItem('reservations', id, 'Reserva')} updateStatus={updateReservationStatus} getVehicleName={getVehicleName} />}

            {activeTab === 'fuelings' && (
              <SectionPage title="Abastecimentos" subtitle={`${fuelings.length} registros`} canAdd={vehicles.length > 0} onAdd={() => openModal('fueling')} empty={fuelings.length === 0} emptyIcon={Fuel} emptyText={vehicles.length === 0 ? "Cadastre veículos primeiro" : "Sem abastecimentos"}>
                <DataTable columns={['Data', 'Veículo', 'Litros', 'Valor', 'Km']}
                  rows={fuelings.map(f => ({ id: f.id, cells: [
                    new Date(f.date).toLocaleDateString('pt-BR'),
                    <span className="text-white">{getVehicleName(f.vehicle_id)}</span>,
                    `${f.liters} L`, `R$ ${Number(f.value).toFixed(2)}`, f.km ? Number(f.km).toLocaleString('pt-BR') : '—'
                  ], onEdit: () => openModal('fueling', f),
                     onRemove: () => removeItem('fuelings', f.id, 'Abastecimento') }))} />
              </SectionPage>
            )}

            {activeTab === 'maintenances' && (
              <SectionPage title="Manutenções" subtitle={`${maintenances.length} registros`} canAdd={vehicles.length > 0} onAdd={() => openModal('maintenance')} empty={maintenances.length === 0} emptyIcon={Wrench} emptyText={vehicles.length === 0 ? "Cadastre veículos primeiro" : "Sem manutenções"}>
                <DataTable columns={['Data', 'Veículo', 'Tipo', 'Custo', 'Próxima (km)']}
                  rows={maintenances.map(m => ({ id: m.id, cells: [
                    new Date(m.date).toLocaleDateString('pt-BR'),
                    <span className="text-white">{getVehicleName(m.vehicle_id)}</span>,
                    m.type, `R$ ${Number(m.cost).toFixed(2)}`, m.next_km > 0 ? Number(m.next_km).toLocaleString('pt-BR') : '—'
                  ], onEdit: () => openModal('maintenance', m),
                     onRemove: () => removeItem('maintenances', m.id, 'Manutenção') }))} />
              </SectionPage>
            )}

            {activeTab === 'expenses' && <ExpensesView vehicles={vehicles} expenses={expenses} insurances={insurances} openModal={openModal} removeItem={removeItem} getVehicleName={getVehicleName} />}

            {activeTab === 'drivers' && (
              <SectionPage title="Motoristas" subtitle={`${drivers.length} cadastrados`} canAdd={true} onAdd={() => openModal('driver')} empty={drivers.length === 0} emptyIcon={Users} emptyText="Sem motoristas">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {drivers.map(d => {
                    const tripCount = trips.filter(t => t.driver_id == d.id).length;
                    return (
                      <div key={d.id} className="group relative rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-slate-700 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
                              {d.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-white truncate">{d.name}</div>
                              {d.cnh && <div className="text-xs text-slate-400 mt-0.5">CNH {d.cnh}</div>}
                              {d.phone && <div className="text-xs text-slate-500">{d.phone}</div>}
                              <div className="mt-2 space-y-1">
                                {d.company_id && <div className="flex items-center gap-1.5 text-xs"><Building2 size={11} className="text-violet-400" /><span className="text-slate-300 truncate">{getCompanyName(d.company_id)}</span></div>}
                                {d.cost_center_id && <div className="flex items-center gap-1.5 text-xs"><Wallet size={11} className="text-cyan-400" /><span className="text-slate-300 truncate">{getCostCenterName(d.cost_center_id)}</span></div>}
                                <div className="text-xs text-violet-400 font-medium pt-1">{tripCount} viagens</div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button onClick={() => openModal('driver', d)} className="w-7 h-7 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-violet-400"><Pencil size={13} /></button>
                            <button onClick={() => removeItem('drivers', d.id, 'Motorista')} className="w-7 h-7 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-rose-400"><Trash2 size={13} /></button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionPage>
            )}

            {activeTab === 'trips' && (
              <SectionPage title="Viagens" subtitle={`${trips.length} registros`} canAdd={vehicles.length > 0 && drivers.length > 0} onAdd={() => openModal('trip')} empty={trips.length === 0} emptyIcon={MapPin} emptyText={vehicles.length === 0 || drivers.length === 0 ? "Cadastre veículos e motoristas primeiro" : "Sem viagens"}>
                <DataTable columns={['Data', 'Motorista', 'Veículo', 'Rota', 'Km']}
                  rows={trips.map(t => ({ id: t.id, cells: [
                    new Date(t.date).toLocaleDateString('pt-BR'),
                    <span className="text-white">{getDriverName(t.driver_id)}</span>,
                    getVehicleName(t.vehicle_id),
                    <span className="text-slate-300">{t.origin} <span className="text-slate-600">→</span> {t.destination}</span>,
                    `${t.km} km`
                  ], onEdit: () => openModal('trip', t),
                     onRemove: () => removeItem('trips', t.id, 'Viagem') }))} />
              </SectionPage>
            )}

            {activeTab === 'settings' && (
              <div>
                <div className="mb-8">
                  <h2 className="text-2xl lg:text-3xl font-semibold text-white tracking-tight">Configurações</h2>
                  <p className="text-sm text-slate-400 mt-1">Empresas e centros de custo</p>
                </div>
                <div className="flex gap-1 mb-8 p-1 rounded-xl bg-slate-900/50 border border-slate-800 w-fit">
                  {settingsNav.map(item => {
                    const Icon = item.icon;
                    return (
                      <button key={item.id} onClick={() => setSettingsSection(item.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${settingsSection === item.id ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white' : 'text-slate-400'}`}>
                        <Icon size={14} /><span className="font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                {settingsSection === 'companies' && (
                  <SectionPage title="Empresas" subtitle={`${companies.length} cadastradas`} canAdd={true} onAdd={() => openModal('company')} empty={companies.length === 0} emptyIcon={Building2} emptyText="Sem empresas. Clique em Adicionar para criar a primeira.">
                    <DataTable columns={['Nome', 'CNPJ', 'Motoristas']}
                      rows={companies.map(c => ({ id: c.id, cells: [
                        <span className="font-medium text-white">{c.name}</span>, c.cnpj || '—',
                        drivers.filter(d => d.company_id == c.id).length
                      ], onEdit: () => openModal('company', c),
                         onRemove: () => removeItem('companies', c.id, 'Empresa') }))} />
                  </SectionPage>
                )}

                {settingsSection === 'costCenters' && (
                  <SectionPage title="Centros de custo" subtitle={`${costCenters.length} cadastrados`} canAdd={true} onAdd={() => openModal('costCenter')} empty={costCenters.length === 0} emptyIcon={Wallet} emptyText="Sem centros de custo">
                    <DataTable columns={['Código', 'Nome', 'Empresa', 'Motoristas']}
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
          </main>
        </div>
      </div>

      {/* MODAL */}
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
                <Input label="Placa *" value={formData.plate} onChange={v => setFormData({...formData, plate: v})} />
                <Input label="Modelo *" value={formData.model} onChange={v => setFormData({...formData, model: v})} />
                <Input label="Ano" type="number" value={formData.year} onChange={v => setFormData({...formData, year: v})} />
                <Input label="Km atual" type="number" value={formData.current_km} onChange={v => setFormData({...formData, current_km: v})} />
                <Input label="Valor de aquisição (R$)" type="number" value={formData.purchase_value} onChange={v => setFormData({...formData, purchase_value: v})} />
                <Input label="Data de aquisição" type="date" value={formData.purchase_date} onChange={v => setFormData({...formData, purchase_date: v})} />
                <Select label="Status" value={formData.status} onChange={v => setFormData({...formData, status: v})} options={[{value: 'disponível', label: 'Disponível'}, {value: 'em uso', label: 'Em uso'}, {value: 'manutenção', label: 'Manutenção'}, {value: 'inativo', label: 'Inativo'}]} />
                <SaveButton onClick={saveVehicle} busy={savingItem} />
              </div>
            )}

            {showModal === 'driver' && (
              <div className="space-y-4">
                <Input label="Nome *" value={formData.name} onChange={v => setFormData({...formData, name: v})} />
                <Input label="CNH" value={formData.cnh} onChange={v => setFormData({...formData, cnh: v})} />
                <Input label="Telefone" value={formData.phone} onChange={v => setFormData({...formData, phone: v})} />
                <Select label="Empresa" value={formData.company_id} onChange={v => setFormData({...formData, company_id: v, cost_center_id: ''})} options={companies.map(c => ({value: c.id, label: c.name}))} />
                <Select label="Centro de custo" value={formData.cost_center_id} onChange={v => setFormData({...formData, cost_center_id: v})} options={costCenters.filter(c => !formData.company_id || c.company_id == formData.company_id).map(c => ({value: c.id, label: `${c.code} · ${c.name}`}))} />
                <SaveButton onClick={saveDriver} busy={savingItem} />
              </div>
            )}

            {showModal === 'fueling' && (
              <div className="space-y-4">
                <Select label="Veículo *" value={formData.vehicle_id} onChange={v => setFormData({...formData, vehicle_id: v})} options={vehicles.map(v => ({value: v.id, label: `${v.plate} · ${v.model}`}))} />
                <Input label="Data" type="date" value={formData.date} onChange={v => setFormData({...formData, date: v})} />
                <Input label="Litros *" type="number" value={formData.liters} onChange={v => setFormData({...formData, liters: v})} />
                <Input label="Valor (R$) *" type="number" value={formData.value} onChange={v => setFormData({...formData, value: v})} />
                <Input label="Km" type="number" value={formData.km} onChange={v => setFormData({...formData, km: v})} />
                <SaveButton onClick={saveFueling} busy={savingItem} />
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
                <Select label="Veículo *" value={formData.vehicle_id} onChange={v => setFormData({...formData, vehicle_id: v})} options={vehicles.map(v => ({value: v.id, label: `${v.plate} · ${v.model}`}))} />
                <Select label="Tipo *" value={formData.type} onChange={v => setFormData({...formData, type: v})} options={['IPVA', 'Licenciamento', 'DPVAT', 'Multas', 'Pedágio', 'Lavagem', 'Outros'].map(t => ({value: t, label: t}))} />
                <Input label="Data" type="date" value={formData.date} onChange={v => setFormData({...formData, date: v})} />
                <Input label="Vencimento" type="date" value={formData.due_date} onChange={v => setFormData({...formData, due_date: v})} />
                <Input label="Valor (R$) *" type="number" value={formData.value} onChange={v => setFormData({...formData, value: v})} />
                <Input label="Descrição" value={formData.description} onChange={v => setFormData({...formData, description: v})} />
                <SaveButton onClick={saveExpense} busy={savingItem} />
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
    </div>
  );
}

// =====================================================================
// COMPONENTES COMPARTILHADOS
// =====================================================================
function PageHeader({ title, subtitle, onAdd }) {
  return (
    <div className="flex items-center justify-between mb-8 gap-4">
      <div className="min-w-0">
        <h2 className="text-xl lg:text-2xl font-semibold text-white tracking-tight truncate">{title}</h2>
        <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
      </div>
      {onAdd && (
        <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white text-sm font-medium shadow-lg shadow-violet-500/20">
          <Plus size={16} strokeWidth={2.5} /><span className="hidden sm:inline">Adicionar</span>
        </button>
      )}
    </div>
  );
}

function SectionPage({ title, subtitle, canAdd, onAdd, empty, emptyIcon, emptyText, children }) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} onAdd={canAdd ? onAdd : null} />
      {empty ? <EmptyState icon={emptyIcon} text={emptyText} /> : children}
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, children }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${active ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white' : 'text-slate-400'}`}>
      <Icon size={14} /><span className="font-medium">{children}</span>
    </button>
  );
}

function DataTable({ columns, rows }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              {columns.map((col, i) => <th key={i} className="text-left px-6 py-3.5 text-[11px] font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">{col}</th>)}
              <th className="px-6 py-3.5"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="border-b border-slate-800/50 last:border-0 text-sm text-slate-300 hover:bg-slate-800/30 group">
                {row.cells.map((cell, i) => <td key={i} className="px-6 py-4 whitespace-nowrap">{cell}</td>)}
                <td className="px-6 py-4 text-right whitespace-nowrap">
                  <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {row.onEdit && <button onClick={row.onEdit} className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-violet-400"><Pencil size={14} /></button>}
                    {row.onRemove && <button onClick={row.onRemove} className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-400"><Trash2 size={14} /></button>}
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

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-20 text-center">
      <Icon size={36} className="text-slate-700 mx-auto mb-3" strokeWidth={1.5} />
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  );
}

function KPICard({ label, value, icon: Icon, gradient, iconColor }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-50`}></div>
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">{label}</span>
          <Icon size={16} className={iconColor} strokeWidth={2} />
        </div>
        <div className="text-2xl font-semibold text-white tracking-tight">{value}</div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1.5 font-medium">{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500" />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1.5 font-medium">{label}</label>
      <select value={value || ''} onChange={e => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500">
        <option value="">Selecione...</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function SaveButton({ onClick, busy }) {
  return (
    <button onClick={onClick} disabled={busy}
      className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white text-sm font-medium shadow-lg shadow-violet-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
      {busy ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
      {busy ? 'Salvando...' : 'Salvar no Supabase'}
    </button>
  );
}

// =====================================================================
// VIEWS ESPECÍFICAS
// =====================================================================
function DashboardView({ vehicles, trips, fuelings, maintenances, expenses, insurances, pieColors }) {
  const totalKm = trips.reduce((s, t) => s + (Number(t.km) || 0), 0);
  const totalFuel = fuelings.reduce((s, f) => s + (Number(f.value) || 0), 0);
  const totalMaint = maintenances.reduce((s, m) => s + (Number(m.cost) || 0), 0);
  const totalExp = expenses.reduce((s, e) => s + (Number(e.value) || 0), 0);
  const totalIns = insurances.reduce((s, i) => s + (Number(i.premium) || 0), 0);
  const totalCost = totalFuel + totalMaint + totalExp + totalIns;
  const cpk = totalKm > 0 ? totalCost / totalKm : 0;

  const costByVehicle = vehicles.map(v => {
    const vF = fuelings.filter(f => f.vehicle_id == v.id).reduce((s, f) => s + Number(f.value || 0), 0);
    const vM = maintenances.filter(m => m.vehicle_id == v.id).reduce((s, m) => s + Number(m.cost || 0), 0);
    const total = vF + vM;
    const vK = trips.filter(t => t.vehicle_id == v.id).reduce((s, t) => s + Number(t.km || 0), 0);
    return { plate: v.plate, total, km: vK };
  }).filter(v => v.total > 0 || v.km > 0).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl lg:text-3xl font-semibold tracking-tight mb-1">Bem-vindo de volta</h2>
        <p className="text-sm text-slate-400">Visão geral da frota</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard label="Veículos" value={vehicles.length} icon={Car} gradient="from-violet-500/20 to-violet-600/5" iconColor="text-violet-400" />
        <KPICard label="Km rodados" value={totalKm.toLocaleString('pt-BR')} icon={Activity} gradient="from-cyan-500/20 to-cyan-600/5" iconColor="text-cyan-400" />
        <KPICard label="Total" value={`R$ ${totalCost.toLocaleString('pt-BR', {maximumFractionDigits: 0})}`} icon={Wallet} gradient="from-rose-500/20 to-rose-600/5" iconColor="text-rose-400" />
        <KPICard label="Combustível" value={`R$ ${totalFuel.toLocaleString('pt-BR', {maximumFractionDigits: 0})}`} icon={Fuel} gradient="from-amber-500/20 to-amber-600/5" iconColor="text-amber-400" />
        <KPICard label="Manutenção" value={`R$ ${totalMaint.toLocaleString('pt-BR', {maximumFractionDigits: 0})}`} icon={Wrench} gradient="from-fuchsia-500/20 to-fuchsia-600/5" iconColor="text-fuchsia-400" />
        <KPICard label="Custo/km" value={`R$ ${cpk.toFixed(2)}`} icon={TrendingUp} gradient="from-emerald-500/20 to-emerald-600/5" iconColor="text-emerald-400" />
      </div>

      {vehicles.length === 0 ? (
        <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-8 text-center">
          <Database size={36} className="text-violet-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">Banco de dados conectado!</h3>
          <p className="text-sm text-slate-300 mb-4">Comece cadastrando suas empresas, depois veículos e motoristas.</p>
          <p className="text-xs text-slate-500">Use o menu lateral para navegar entre as seções.</p>
        </div>
      ) : costByVehicle.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="text-sm font-semibold text-white mb-1">Custo por veículo</h3>
            <p className="text-xs text-slate-500 mb-5">Ranking</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={costByVehicle.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={11} tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="plate" stroke="#64748b" fontSize={11} width={80} />
                <Tooltip contentStyle={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }} formatter={(v) => `R$ ${v.toLocaleString('pt-BR')}`} />
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
                <Tooltip formatter={(v) => `R$ ${v.toLocaleString('pt-BR')}`} contentStyle={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function DepreciationView({ vehicles, pieColors }) {
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

function ExpensesView({ vehicles, expenses, insurances, openModal, removeItem, getVehicleName }) {
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
        <SectionPage title="Seguros" subtitle={`${insurances.length} cadastrados`} canAdd={vehicles.length > 0} onAdd={() => openModal('insurance')} empty={insurances.length === 0} emptyIcon={Shield} emptyText={vehicles.length === 0 ? "Cadastre veículos primeiro" : "Sem seguros"}>
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
        <SectionPage title="Despesas" subtitle={`${expenses.length} registros`} canAdd={vehicles.length > 0} onAdd={() => openModal('expense')} empty={expenses.length === 0} emptyIcon={Receipt} emptyText={vehicles.length === 0 ? "Cadastre veículos primeiro" : "Sem despesas"}>
          <DataTable columns={['Data', 'Veículo', 'Tipo', 'Descrição', 'Valor']}
            rows={expenses.map(e => ({ id: e.id, cells: [
              new Date(e.date).toLocaleDateString('pt-BR'),
              <span className="text-white">{getVehicleName(e.vehicle_id)}</span>,
              <span className="inline-flex px-2.5 py-1 text-[11px] bg-violet-500/10 text-violet-300 rounded-full border border-violet-500/20">{e.type}</span>,
              e.description || '—',
              <span className="font-semibold text-white">R$ {Number(e.value).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
            ], onEdit: () => openModal('expense', e),
               onRemove: () => removeItem('expenses', e.id, 'Despesa') }))} />
        </SectionPage>
      )}
    </div>
  );
}

function ReservationsView({ vehicles, reservations, openModal, removeItem, updateStatus, getVehicleName }) {
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
      <PageHeader title="Reservas" subtitle={`${reservations.length} solicitações`} onAdd={vehicles.length > 0 ? () => openModal('reservation') : null} />
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
                  <button onClick={() => openModal('reservation', r)} className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400"><Pencil size={14} /></button>
                  <button onClick={() => removeItem(r.id)} className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-400"><Trash2 size={14} /></button>
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
              {r.status === 'pendente' && (
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
