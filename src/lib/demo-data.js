// Dataset fake do modo demo. Volume pequeno mas suficiente pra dashboards,
// filtros, ordenacao, rateio e custos ficarem visualmente interessantes.
// Datas relativas a hoje para os alertas de vencimento fazerem sentido.

const today = new Date();
const iso = (d) => d.toISOString();
const dateStr = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return d; };
const daysAhead = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return d; };

export const DEMO_PROFILE = {
  id: 'demo-user',
  email: 'convidado@demo.fleet-control',
  name: 'Convidado (demo)',
  role: 'admin',
  allowed_pages: ['*'],
  active: true,
  created_at: iso(daysAgo(120)),
};

export const DEMO_COMPANIES = [
  { id: 1, name: 'Transportadora Aurora', cnpj: '12.345.678/0001-90', created_at: iso(daysAgo(365)), updated_at: iso(daysAgo(30)) },
  { id: 2, name: 'Logistica Boreal', cnpj: '98.765.432/0001-10', created_at: iso(daysAgo(300)), updated_at: iso(daysAgo(15)) },
  { id: 3, name: 'Frota Central', cnpj: '55.444.333/0001-22', created_at: iso(daysAgo(200)), updated_at: iso(daysAgo(45)) },
];

export const DEMO_COST_CENTERS = [
  { id: 1, code: 'CC-100', name: 'Operacao', company_id: 1, created_at: iso(daysAgo(360)), updated_at: iso(daysAgo(30)) },
  { id: 2, code: 'CC-200', name: 'Administrativo', company_id: 1, created_at: iso(daysAgo(360)), updated_at: iso(daysAgo(60)) },
  { id: 3, code: 'CC-300', name: 'Comercial', company_id: 2, created_at: iso(daysAgo(280)), updated_at: iso(daysAgo(20)) },
  { id: 4, code: 'CC-400', name: 'Distribuicao', company_id: 2, created_at: iso(daysAgo(280)), updated_at: iso(daysAgo(40)) },
  { id: 5, code: 'CC-500', name: 'Suporte Frota', company_id: 3, created_at: iso(daysAgo(180)), updated_at: iso(daysAgo(50)) },
];

export const DEMO_VEHICLES = [
  { id: 1, plate: 'DEM0A11', model: 'Fiat Strada Endurance', year: 2023, current_km: 42130, purchase_value: 92000, purchase_date: dateStr(daysAgo(600)), next_revision_km: 45000, next_revision_date: dateStr(daysAhead(20)), status: 'disponivel', infleet_id: null, last_synced_at: null, created_at: iso(daysAgo(600)), updated_at: iso(daysAgo(2)) },
  { id: 2, plate: 'DEM0B22', model: 'VW Saveiro Cross', year: 2022, current_km: 68450, purchase_value: 88500, purchase_date: dateStr(daysAgo(750)), next_revision_km: 70000, next_revision_date: dateStr(daysAhead(6)), status: 'disponivel', infleet_id: null, last_synced_at: null, created_at: iso(daysAgo(750)), updated_at: iso(daysAgo(1)) },
  { id: 3, plate: 'DEM0C33', model: 'Renault Duster Iconic', year: 2024, current_km: 18720, purchase_value: 135000, purchase_date: dateStr(daysAgo(180)), next_revision_km: 20000, next_revision_date: dateStr(daysAhead(45)), status: 'em uso', infleet_id: null, last_synced_at: null, created_at: iso(daysAgo(180)), updated_at: iso(daysAgo(3)) },
  { id: 4, plate: 'DEM0D44', model: 'Ford Ranger XL', year: 2021, current_km: 118200, purchase_value: 165000, purchase_date: dateStr(daysAgo(1100)), next_revision_km: 120000, next_revision_date: dateStr(daysAhead(-3)), status: 'manutencao', infleet_id: null, last_synced_at: null, created_at: iso(daysAgo(1100)), updated_at: iso(daysAgo(5)) },
  { id: 5, plate: 'DEM0E55', model: 'Toyota Hilux SR', year: 2023, current_km: 54300, purchase_value: 245000, purchase_date: dateStr(daysAgo(420)), next_revision_km: 60000, next_revision_date: dateStr(daysAhead(90)), status: 'disponivel', infleet_id: null, last_synced_at: null, created_at: iso(daysAgo(420)), updated_at: iso(daysAgo(4)) },
  { id: 6, plate: 'DEM0F66', model: 'Nissan Frontier LE', year: 2022, current_km: 79800, purchase_value: 195000, purchase_date: dateStr(daysAgo(680)), next_revision_km: 80000, next_revision_date: dateStr(daysAhead(14)), status: 'disponivel', infleet_id: null, last_synced_at: null, created_at: iso(daysAgo(680)), updated_at: iso(daysAgo(2)) },
  { id: 7, plate: 'DEM0G77', model: 'Chevrolet Onix Plus', year: 2024, current_km: 8400, purchase_value: 92500, purchase_date: dateStr(daysAgo(90)), next_revision_km: 10000, next_revision_date: dateStr(daysAhead(180)), status: 'disponivel', infleet_id: null, last_synced_at: null, created_at: iso(daysAgo(90)), updated_at: iso(daysAgo(1)) },
  { id: 8, plate: 'DEM0H88', model: 'Mercedes Sprinter 415', year: 2020, current_km: 172400, purchase_value: 280000, purchase_date: dateStr(daysAgo(1500)), next_revision_km: 175000, next_revision_date: dateStr(daysAhead(-10)), status: 'em uso', infleet_id: null, last_synced_at: null, created_at: iso(daysAgo(1500)), updated_at: iso(daysAgo(6)) },
];

const DRIVER_NAMES = [
  'Anderson Costa', 'Bruna Oliveira', 'Carlos Mendes', 'Daniela Rocha',
  'Eduardo Nunes', 'Fernanda Lima', 'Guilherme Alves', 'Helena Souza',
  'Igor Ribeiro', 'Julia Martins', 'Kevin Santos', 'Larissa Ferreira',
  'Marcos Pereira', 'Natalia Cardoso',
];

export const DEMO_DRIVERS = DRIVER_NAMES.map((name, i) => ({
  id: i + 1,
  name,
  cnh: String(10000000000 + i * 173517).slice(0, 11),
  phone: `(31) 9${String(80000000 + i * 12345).slice(0, 8)}`,
  company_id: (i % 3) + 1,
  cost_center_id: (i % 5) + 1,
  infleet_id: null,
  last_synced_at: null,
  created_at: iso(daysAgo(365 - i * 12)),
  updated_at: iso(daysAgo(10 + i)),
}));

// Gera trips espalhadas nos ultimos 120 dias.
const TRIP_ROUTES = [
  { origin: 'Belo Horizonte - Centro', destination: 'Contagem - Cinco', km: 24.5 },
  { origin: 'Nova Lima - Sede', destination: 'BH - Savassi', km: 18.2 },
  { origin: 'Betim - Distrito Industrial', destination: 'BH - Barreiro', km: 32.8 },
  { origin: 'Ipatinga - Centro', destination: 'Timoteo - Bethania', km: 12.4 },
  { origin: 'Sabara - Sede', destination: 'BH - Cidade Nova', km: 21.3 },
  { origin: 'Vespasiano - Centro', destination: 'BH - Lagoinha', km: 27.6 },
  { origin: 'Sete Lagoas - Centro', destination: 'BH - Pampulha', km: 68.9 },
  { origin: 'Uberlandia - Centro', destination: 'Uberaba - Sede', km: 105.4 },
  { origin: 'Juiz de Fora - Sao Mateus', destination: 'BH - Buritis', km: 265.7 },
  { origin: 'Divinopolis - Sede', destination: 'BH - Anchieta', km: 118.2 },
];

export const DEMO_TRIPS = Array.from({ length: 60 }, (_, i) => {
  const day = daysAgo(Math.floor(Math.random() * 120));
  const startedAt = new Date(day);
  startedAt.setHours(6 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60), 0, 0);
  const durationMin = 20 + Math.floor(Math.random() * 240);
  const finishedAt = new Date(startedAt.getTime() + durationMin * 60000);
  const route = TRIP_ROUTES[i % TRIP_ROUTES.length];
  const kmVariation = 0.85 + Math.random() * 0.3;
  return {
    id: i + 1,
    vehicle_id: ((i * 7) % DEMO_VEHICLES.length) + 1,
    driver_id: i % 8 === 0 ? null : ((i * 5) % DEMO_DRIVERS.length) + 1,
    date: dateStr(startedAt),
    origin: route.origin,
    destination: route.destination,
    km: Math.round(route.km * kmVariation * 10) / 10,
    infleet_trip_key: null,
    cobli_path_key: null,
    last_synced_at: null,
    started_at: iso(startedAt),
    finished_at: iso(finishedAt),
    created_at: iso(startedAt),
    updated_at: iso(startedAt),
  };
});

export const DEMO_FUELINGS = Array.from({ length: 35 }, (_, i) => {
  const day = daysAgo(Math.floor(Math.random() * 90));
  const liters = 30 + Math.floor(Math.random() * 40);
  const pricePerLiter = 5.4 + Math.random() * 0.6;
  const vehicleId = ((i * 3) % DEMO_VEHICLES.length) + 1;
  const vehicle = DEMO_VEHICLES[vehicleId - 1];
  return {
    id: i + 1,
    vehicle_id: vehicleId,
    date: dateStr(day),
    liters,
    value: Math.round(liters * pricePerLiter * 100) / 100,
    km: vehicle.current_km - Math.floor(Math.random() * 5000),
    webposto_id: `WPD-${1000 + i}`,
    last_synced_at: iso(daysAgo(1)),
    created_at: iso(day),
    updated_at: iso(day),
  };
});

const MAINT_TYPES = ['Troca de oleo', 'Alinhamento e balanceamento', 'Troca de pneus', 'Manutencao preventiva', 'Troca de pastilhas', 'Revisao periodica'];

export const DEMO_MAINTENANCES = Array.from({ length: 18 }, (_, i) => {
  const day = daysAgo(Math.floor(Math.random() * 180));
  return {
    id: i + 1,
    vehicle_id: ((i * 2) % DEMO_VEHICLES.length) + 1,
    date: dateStr(day),
    type: MAINT_TYPES[i % MAINT_TYPES.length],
    cost: Math.round((350 + Math.random() * 2200) * 100) / 100,
    next_km: 5000 + Math.floor(Math.random() * 10000),
    infleet_id: `INF-DEMO-M${i}`,
    last_synced_at: iso(daysAgo(1)),
    created_at: iso(day),
    updated_at: iso(day),
  };
});

const EXP_TYPES = ['IPVA', 'Licenciamento', 'Multa', 'Pedagio', 'Estacionamento'];

export const DEMO_EXPENSES = Array.from({ length: 14 }, (_, i) => {
  const day = daysAgo(Math.floor(Math.random() * 150));
  const dueDate = daysAhead(-30 + Math.floor(Math.random() * 90));
  return {
    id: i + 1,
    vehicle_id: ((i * 3) % DEMO_VEHICLES.length) + 1,
    type: EXP_TYPES[i % EXP_TYPES.length],
    date: dateStr(day),
    due_date: dateStr(dueDate),
    value: Math.round((80 + Math.random() * 1800) * 100) / 100,
    description: null,
    infleet_id: null,
    last_synced_at: null,
    created_at: iso(day),
    updated_at: iso(day),
  };
});

const INSURERS = ['Porto Seguro', 'Bradesco Seguros', 'Allianz', 'Sompo', 'Azul Seguros', 'Liberty', 'Tokio Marine', 'HDI'];

export const DEMO_INSURANCES = DEMO_VEHICLES.map((v, i) => {
  const start = daysAgo(200 - i * 20);
  const end = new Date(start); end.setFullYear(end.getFullYear() + 1);
  return {
    id: i + 1,
    vehicle_id: v.id,
    company: INSURERS[i % INSURERS.length],
    policy_number: `APL-${100000 + i * 137}`,
    start_date: dateStr(start),
    end_date: dateStr(end),
    premium: Math.round((1800 + Math.random() * 2500) * 100) / 100,
    coverage: Math.round(v.purchase_value * (0.85 + Math.random() * 0.1)),
    deductible: Math.round((800 + Math.random() * 1500) * 100) / 100,
    broker: 'Corretora Demo',
    created_at: iso(start),
    updated_at: iso(daysAgo(10)),
  };
});

export const DEMO_RESERVATIONS = [
  { id: 1, vehicle_id: 3, requester_name: 'Anderson Costa', department: 'Comercial', requester_email: 'anderson@demo', requester_phone: '(31) 98700-1122', start_date_time: iso(daysAhead(1)), end_date_time: iso(daysAhead(2)), reason: 'Visita a cliente em Contagem', status: 'confirmada', status_note: null, status_updated_at: iso(daysAgo(1)), created_at: iso(daysAgo(3)), updated_at: iso(daysAgo(1)) },
  { id: 2, vehicle_id: 5, requester_name: 'Fernanda Lima', department: 'Operacao', requester_email: 'fernanda@demo', requester_phone: '(31) 99800-3344', start_date_time: iso(daysAhead(3)), end_date_time: iso(daysAhead(4)), reason: 'Inspecao no galpao de Betim', status: 'pendente', status_note: null, status_updated_at: null, created_at: iso(daysAgo(1)), updated_at: iso(daysAgo(1)) },
  { id: 3, vehicle_id: 7, requester_name: 'Guilherme Alves', department: 'Administrativo', requester_email: 'guilherme@demo', requester_phone: '(31) 97500-5566', start_date_time: iso(daysAgo(5)), end_date_time: iso(daysAgo(4)), reason: 'Ida ao cartorio', status: 'concluida', status_note: null, status_updated_at: iso(daysAgo(4)), created_at: iso(daysAgo(7)), updated_at: iso(daysAgo(4)) },
  { id: 4, vehicle_id: 1, requester_name: 'Julia Martins', department: 'Comercial', requester_email: 'julia@demo', requester_phone: '(31) 96400-7788', start_date_time: iso(daysAhead(7)), end_date_time: iso(daysAhead(8)), reason: 'Feira de negocios em Nova Lima', status: 'pendente', status_note: null, status_updated_at: null, created_at: iso(daysAgo(0)), updated_at: iso(daysAgo(0)) },
];

// Mapa nome-da-tabela -> dataset
export const DEMO_TABLES = {
  companies: DEMO_COMPANIES,
  cost_centers: DEMO_COST_CENTERS,
  vehicles: DEMO_VEHICLES,
  drivers: DEMO_DRIVERS,
  fuelings: DEMO_FUELINGS,
  maintenances: DEMO_MAINTENANCES,
  trips: DEMO_TRIPS,
  expenses: DEMO_EXPENSES,
  insurances: DEMO_INSURANCES,
  reservations: DEMO_RESERVATIONS,
  profiles: [DEMO_PROFILE],
};
