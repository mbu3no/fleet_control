// Pure logic for the Rateio (cost allocation) feature.
// Operates on the in-memory data arrays loaded by App.jsx.

export function computePeriod(preset, customFrom, customTo) {
  const today = new Date();
  const fmt = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  switch (preset) {
    case 'this_month': {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return [fmt(from), fmt(to)];
    }
    case 'last_month': {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const to = new Date(today.getFullYear(), today.getMonth(), 0);
      return [fmt(from), fmt(to)];
    }
    case 'last_30': {
      const from = new Date(today);
      from.setDate(from.getDate() - 30);
      return [fmt(from), fmt(today)];
    }
    case 'this_year':
      return [fmt(new Date(today.getFullYear(), 0, 1)), fmt(new Date(today.getFullYear(), 11, 31))];
    case 'last_year':
      return [fmt(new Date(today.getFullYear() - 1, 0, 1)), fmt(new Date(today.getFullYear() - 1, 11, 31))];
    case 'all':
      return ['1970-01-01', '2999-12-31'];
    case 'custom':
      return [customFrom || '1970-01-01', customTo || '2999-12-31'];
    default:
      return ['1970-01-01', '2999-12-31'];
  }
}

export function computeAllocation({ period, vehicles, drivers, companies, trips, fuelings, maintenances, expenses, insurances }) {
  const [fromStr, toStr] = period;
  const inRange = (d) => {
    if (!d) return false;
    const dStr = String(d).slice(0, 10);
    return dStr >= fromStr && dStr <= toStr;
  };

  const periodTrips = trips.filter(t => inRange(t.date));
  const totalKm = periodTrips.reduce((s, t) => s + (Number(t.km) || 0), 0);

  const fuelCost = fuelings.filter(f => inRange(f.date)).reduce((s, f) => s + (Number(f.value) || 0), 0);
  const maintCost = maintenances.filter(m => inRange(m.date)).reduce((s, m) => s + (Number(m.cost) || 0), 0);
  const expenseCost = expenses.filter(e => inRange(e.date)).reduce((s, e) => s + (Number(e.value) || 0), 0);

  const fromMs = new Date(fromStr + 'T00:00:00').getTime();
  const toMs = new Date(toStr + 'T23:59:59').getTime();
  const insCost = insurances.reduce((s, i) => {
    if (!i.start_date || !i.end_date) return s;
    const start = new Date(i.start_date + 'T00:00:00').getTime();
    const end = new Date(i.end_date + 'T23:59:59').getTime();
    if (end < fromMs || start > toMs) return s;
    const overlapStart = Math.max(start, fromMs);
    const overlapEnd = Math.min(end, toMs);
    const overlap = Math.max(0, overlapEnd - overlapStart);
    const total = Math.max(1, end - start);
    return s + (Number(i.premium) || 0) * (overlap / total);
  }, 0);

  const totalCost = fuelCost + maintCost + expenseCost + insCost;

  const driverMap = new Map(drivers.map(d => [String(d.id), d]));
  const companyMap = new Map(companies.map(c => [String(c.id), c]));
  const vehicleMap = new Map(vehicles.map(v => [String(v.id), v]));

  const companyAgg = new Map();
  for (const t of periodTrips) {
    const km = Number(t.km) || 0;
    if (!km) continue;
    const driver = driverMap.get(String(t.driver_id));
    const companyId = String(driver?.company_id || 'NONE');

    if (!companyAgg.has(companyId)) companyAgg.set(companyId, { km: 0, drivers: new Map() });
    const company = companyAgg.get(companyId);
    company.km += km;

    const driverId = String(t.driver_id);
    if (!company.drivers.has(driverId)) company.drivers.set(driverId, { km: 0, vehicles: new Map() });
    const drv = company.drivers.get(driverId);
    drv.km += km;

    const vehicleId = String(t.vehicle_id);
    drv.vehicles.set(vehicleId, (drv.vehicles.get(vehicleId) || 0) + km);
  }

  const tree = [...companyAgg.entries()].map(([cid, c]) => {
    const company = companyMap.get(cid);
    const companyName = company?.name || (cid === 'NONE' ? 'Sem empresa' : 'Empresa desconhecida');
    const ratio = totalKm > 0 ? c.km / totalKm : 0;
    const cost = ratio * totalCost;
    return {
      id: cid,
      name: companyName,
      km: c.km,
      ratio,
      cost,
      drivers: [...c.drivers.entries()].map(([did, d]) => {
        const driver = driverMap.get(did);
        const dRatio = c.km > 0 ? d.km / c.km : 0;
        const dCost = dRatio * cost;
        return {
          id: did,
          name: driver?.name || 'Motorista desconhecido',
          km: d.km,
          ratio: dRatio,
          cost: dCost,
          vehicles: [...d.vehicles.entries()].map(([vid, vKm]) => {
            const v = vehicleMap.get(vid);
            const vRatio = d.km > 0 ? vKm / d.km : 0;
            return {
              id: vid,
              name: v ? `${v.plate} · ${v.model}` : 'Veículo desconhecido',
              km: vKm,
              ratio: vRatio,
              cost: vRatio * dCost
            };
          })
        };
      })
    };
  });

  return { totalKm, totalCost, tree, breakdown: { fuelCost, maintCost, expenseCost, insCost } };
}

export function sortTree(tree, sortBy) {
  const cmp = (a, b) => {
    switch (sortBy) {
      case 'km_desc': return b.km - a.km;
      case 'km_asc': return a.km - b.km;
      case 'cost_desc': return b.cost - a.cost;
      case 'cost_asc': return a.cost - b.cost;
      case 'name_asc': return a.name.localeCompare(b.name, 'pt-BR');
      case 'name_desc': return b.name.localeCompare(a.name, 'pt-BR');
      default: return b.km - a.km;
    }
  };
  return tree.map(c => ({
    ...c,
    drivers: c.drivers.map(d => ({
      ...d,
      vehicles: [...d.vehicles].sort(cmp)
    })).sort(cmp)
  })).sort(cmp);
}

export function filterTree(tree, { companyId, search }) {
  const term = (search || '').trim().toLowerCase();
  const matches = (s) => !term || String(s || '').toLowerCase().includes(term);
  return tree
    .filter(c => !companyId || companyId === 'all' || c.id === companyId)
    .map(c => {
      const companyHit = matches(c.name);
      const drivers = c.drivers
        .map(d => {
          const driverHit = matches(d.name);
          const vehicles = d.vehicles.filter(v => companyHit || driverHit || matches(v.name));
          return { ...d, vehicles, _hit: companyHit || driverHit || vehicles.length > 0 };
        })
        .filter(d => d._hit);
      const keep = companyHit || drivers.length > 0;
      return keep ? { ...c, drivers } : null;
    })
    .filter(Boolean);
}

export function totalsFromTree(tree, breakdown) {
  const totalKm = tree.reduce((s, c) => s + c.km, 0);
  const totalCost = tree.reduce((s, c) => s + c.cost, 0);
  return { totalKm, totalCost, tree, breakdown };
}

export function exportAllocationCSV(data, period) {
  const escape = (s) => {
    const str = String(s ?? '');
    return /[",;\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [];
  lines.push(['Nivel', 'Empresa', 'Motorista', 'Veiculo', 'Km', 'Pct do nivel pai', 'Custo rateado (R$)'].join(';'));
  for (const c of data.tree) {
    lines.push(['Empresa', escape(c.name), '', '', c.km.toFixed(2), (c.ratio * 100).toFixed(2) + '%', c.cost.toFixed(2)].join(';'));
    for (const d of c.drivers) {
      lines.push(['Motorista', escape(c.name), escape(d.name), '', d.km.toFixed(2), (d.ratio * 100).toFixed(2) + '%', d.cost.toFixed(2)].join(';'));
      for (const v of d.vehicles) {
        lines.push(['Veiculo', escape(c.name), escape(d.name), escape(v.name), v.km.toFixed(2), (v.ratio * 100).toFixed(2) + '%', v.cost.toFixed(2)].join(';'));
      }
    }
  }
  lines.push('');
  lines.push(['Periodo', `${period[0]} a ${period[1]}`].join(';'));
  lines.push(['Km total no periodo', data.totalKm.toFixed(2)].join(';'));
  lines.push(['Custo total no periodo', data.totalCost.toFixed(2)].join(';'));
  lines.push(['Combustivel', data.breakdown.fuelCost.toFixed(2)].join(';'));
  lines.push(['Manutencao', data.breakdown.maintCost.toFixed(2)].join(';'));
  lines.push(['Seguros (pro-rateado)', data.breakdown.insCost.toFixed(2)].join(';'));
  lines.push(['Despesas', data.breakdown.expenseCost.toFixed(2)].join(';'));

  const csv = '﻿' + lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rateio_${period[0]}_a_${period[1]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
