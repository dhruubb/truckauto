// Deterministic demo data: 100 trucks, 110 drivers, 24 customers, ~150 shipments.
// Positions and timestamps are generated relative to `now`, so the fleet looks live
// whenever the demo is opened. All names, phone numbers and companies are fictional.

import { CITIES, PLANNED_KMPH, ROUTES, describeLocation, pointAlong, resolveRoute } from "./geo";
import { DELAY_REASONS, buildMessage, cargoPhrase } from "./messages";
import type {
  Alert,
  AppState,
  Customer,
  CustomerNotification,
  DeliveryEvent,
  Driver,
  GpsPing,
  Settings,
  Shipment,
  ShipmentClient,
  Truck,
  TruckStatus,
} from "./types";

export const SCHEMA_VERSION = 4;
const H = 3600_000;
const MIN = 60_000;

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["Ramesh", "Suresh", "Mahesh", "Rajesh", "Sunil", "Anil", "Vijay", "Sanjay", "Manoj", "Santosh", "Gurpreet", "Harjeet", "Balwinder", "Mohan", "Kishore", "Prakash", "Dinesh", "Ganesh", "Arjun", "Rakesh", "Mukesh", "Raju", "Imran", "Salim", "Abdul", "Joseph", "Murugan", "Senthil", "Karthik", "Venkatesh", "Srinivas", "Naresh", "Bhupinder", "Jaswant", "Ravi", "Shankar", "Ashok", "Pawan", "Deepak", "Ajay", "Lakhan", "Bharat", "Kuldeep", "Satish", "Yusuf", "Babu", "Tarsem", "Hemant"];
const LAST = ["Yadav", "Patil", "Singh", "Kumar", "Sharma", "Jadhav", "Pawar", "Gill", "Sandhu", "Reddy", "Naidu", "Pillai", "Shaikh", "Khan", "Thakur", "Chauhan", "Rathore", "Gowda", "Nair", "Mondal", "Das", "Pal", "Verma", "Gupta", "Shinde", "More", "Bhosale", "Rao", "Meena", "Bhati"];

const MODELS: { model: string; type: string; cap: number }[] = [
  { model: "Tata Signa 4825.TK", type: "Multi-axle trailer", cap: 35 },
  { model: "Tata Prima 5530.S", type: "Tractor-trailer 40 ft", cap: 32 },
  { model: "Ashok Leyland 4220", type: "32 ft MXL container", cap: 25 },
  { model: "Ashok Leyland Captain 3518", type: "Open body 12-wheel", cap: 21 },
  { model: "BharatBenz 2823R", type: "32 ft SXL container", cap: 16 },
  { model: "BharatBenz 3528C", type: "Open body 14-wheel", cap: 25 },
  { model: "Eicher Pro 6028", type: "24 ft reefer", cap: 18 },
  { model: "Mahindra Blazo X 35", type: "Multi-axle trailer", cap: 28 },
  { model: "Eicher Pro 3019", type: "20 ft container", cap: 9 },
];

const DEPOT_RTO: Record<string, string[]> = {
  Mumbai: ["MH04", "MH43", "MH46"],
  Pune: ["MH12", "MH14"],
  Nagpur: ["MH40"],
  Ahmedabad: ["GJ01", "GJ27"],
  Surat: ["GJ05"],
  Delhi: ["DL01", "HR55"],
  Jaipur: ["RJ14"],
  Bengaluru: ["KA01", "KA51"],
  Chennai: ["TN09", "TN22"],
  Hyderabad: ["TG08", "TS09"],
  Kolkata: ["WB23", "WB25"],
  Lucknow: ["UP32"],
  Kochi: ["KL07"],
  Visakhapatnam: ["AP31"],
  Indore: ["MP09"],
  Ludhiana: ["PB10"],
};
const DEPOTS = Object.keys(DEPOT_RTO);

const CUSTOMERS: [string, string, string, string][] = [
  ["Rahul Mehta", "Mehta Textiles", "Mumbai", "Textiles"],
  ["Priya Nair", "Kaveri Agro Foods", "Bengaluru", "Food & FMCG"],
  ["Amit Patel", "Patel Polymers", "Ahmedabad", "Plastics"],
  ["Sneha Reddy", "Deccan Pharma Distributors", "Hyderabad", "Pharma"],
  ["Karthik Subramanian", "Sundaram Auto Components", "Chennai", "Automotive"],
  ["Arindam Ghosh", "Gangotri Steel Traders", "Kolkata", "Steel"],
  ["Harpreet Arora", "Arora Cycle Parts", "Ludhiana", "Engineering"],
  ["Vikram Rathore", "Pinkcity Marble House", "Jaipur", "Building materials"],
  ["Neha Agarwal", "Malwa Soya Processors", "Indore", "Agri processing"],
  ["Suresh Iyer", "Bay Shore Tiles", "Chennai", "Building materials"],
  ["Anjali Deshmukh", "Sahyadri Electricals", "Pune", "Electricals"],
  ["Rohit Malhotra", "Northline Retail Distribution", "Delhi", "Retail"],
  ["Fatima Shaikh", "Konkan Cashew Exports", "Mumbai", "Food & FMCG"],
  ["Manish Jain", "Jain Paper Converters", "Ahmedabad", "Paper"],
  ["Deepa Menon", "Malabar Spice Traders", "Kochi", "Food & FMCG"],
  ["Rakesh Tiwari", "Awadh Agro Mills", "Lucknow", "Agri processing"],
  ["Sanjana Rao", "Vizag Marine Foods", "Visakhapatnam", "Food & FMCG"],
  ["Gaurav Bansal", "Bansal Home Furnishings", "Delhi", "Retail"],
  ["Lakshmi Venkat", "Nandi Dairy Products", "Bengaluru", "Dairy"],
  ["Imran Qureshi", "Surat Synthetic Weavers", "Surat", "Textiles"],
  ["Pooja Kulkarni", "Vidarbha Cotton Ginners", "Nagpur", "Textiles"],
  ["Abhishek Sinha", "Eastern Cement Agencies", "Bhubaneswar", "Building materials"],
  ["Meera Choudhary", "Choudhary Ceramics", "Jaipur", "Building materials"],
  ["Tarun Kapoor", "Kapoor Machine Tools", "Ludhiana", "Engineering"],
];

const CARGO: [string, number, number][] = [
  ["Cotton fabric rolls", 12, 22],
  ["Pharmaceutical cartons", 6, 14],
  ["Auto components", 10, 20],
  ["FMCG cartons", 8, 18],
  ["Steel coils", 20, 32],
  ["Cement bags", 18, 30],
  ["Basmati rice bags", 15, 25],
  ["Consumer electronics", 6, 12],
  ["Ceramic tiles", 16, 26],
  ["Packaged dairy (chilled)", 8, 16],
  ["Polymer granules", 14, 24],
  ["Machinery parts", 9, 20],
  ["Paper reels", 14, 24],
  ["Onion sacks", 15, 24],
  ["Furniture flat-packs", 7, 14],
  ["Cashew kernels (export)", 8, 15],
];

export const DEFAULT_SETTINGS: Settings = {
  companyName: "Shree Sai Trucks",
  supportPhone: "+91 22 4000 7272",
  gstin: "27AAJCS4821K1Z5",
  whatsappEnabled: true,
  smsEnabled: true,
  autoDispatch: true,
  autoInTransit: true,
  autoDelay: true,
  autoOutForDelivery: true,
  autoDelivered: true,
  delayThresholdMin: 60,
  etaChangeThresholdMin: 60,
  stationaryAlertMin: 60,
  mapStyle: "light",
};

// How many on-road trucks run on each route (sums to 76).
const ROUTE_LOAD: Record<string, number> = { R01: 12, R02: 8, R03: 6, R04: 5, R05: 8, R06: 6, R07: 5, R08: 6, R09: 4, R10: 5, R11: 3, R12: 3, R13: 2, R14: 2, R15: 1 };

export function shipmentId(n: number): string {
  return `SST-2026-${n.toString().padStart(3, "0")}`;
}

function depotFor(city: string): string {
  if (DEPOT_RTO[city]) return city;
  let best = "Mumbai";
  let bestD = Infinity;
  const p = CITIES[city].pos;
  for (const d of DEPOTS) {
    const q = CITIES[d].pos;
    const dist = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
    if (dist < bestD) {
      bestD = dist;
      best = d;
    }
  }
  return best;
}

export function createSeed(now: number): AppState {
  const rnd = mulberry32(20261109);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
  const between = (a: number, b: number) => a + rnd() * (b - a);
  const int = (a: number, b: number) => Math.floor(between(a, b + 1));
  const phone = () => `+91 ${pick(["98", "97", "99", "96", "94", "93", "88", "87", "70", "73"])}${int(100, 999)} ${int(10000, 99999)}`;
  const letters = () => String.fromCharCode(65 + int(0, 25)) + String.fromCharCode(65 + int(0, 25));
  const usedRegs = new Set<string>();
  const makeReg = (depot: string) => {
    let reg = "";
    do reg = `${pick(DEPOT_RTO[depot])}${letters()}${int(1000, 9999)}`;
    while (usedRegs.has(reg));
    usedRegs.add(reg);
    return reg;
  };

  // ---------- customers ----------
  const customers: Customer[] = CUSTOMERS.map(([contact, company, city, industry], i) => ({
    id: `CUS-${(i + 1).toString().padStart(3, "0")}`,
    contact,
    company,
    city,
    industry,
    phone: phone(),
    email: `${contact.split(" ")[0].toLowerCase()}@${company.toLowerCase().replace(/[^a-z]+/g, "")}.example`,
    since: int(2017, 2025),
    demo: true,
  }));

  // ---------- drivers ----------
  const usedNames = new Set<string>();
  const drivers: Driver[] = Array.from({ length: 110 }, (_, i) => {
    let name = "";
    do name = `${pick(FIRST)} ${pick(LAST)}`;
    while (usedNames.has(name));
    usedNames.add(name);
    const home = pick(DEPOTS);
    return {
      id: `DRV-${(i + 1).toString().padStart(3, "0")}`,
      name,
      phone: phone(),
      license: `${DEPOT_RTO[home][0].slice(0, 2)}${int(10, 99)} ${int(2004, 2021)}${int(1000000, 9999999)}`,
      experienceYrs: int(3, 24),
      rating: Math.round(between(4.1, 4.95) * 10) / 10,
      totalDeliveries: int(140, 1300),
      status: "Available" as const,
      truckId: null,
      homeCity: home,
      languages: ["Hindi", pick(["Marathi", "Gujarati", "Punjabi", "Tamil", "Telugu", "Kannada", "Bengali", "English", "Malayalam"])],
      joinedYear: int(2012, 2025),
    };
  });
  drivers[0].name = "Suresh Patil";
  drivers[0].homeCity = "Mumbai";
  drivers[0].experienceYrs = 14;
  drivers[0].rating = 4.8;

  // ---------- trucks ----------
  const trucks: Truck[] = [];
  const shipments: Shipment[] = [];
  const events: DeliveryEvent[] = [];
  const alerts: Alert[] = [];
  const notifications: CustomerNotification[] = [];
  const gps: Record<string, GpsPing[]> = {};
  let evN = 0;
  let alN = 0;
  let ntN = 0;
  const addEvent = (shipmentId: string, at: number, label: string, location: string) =>
    events.push({ id: `EV-${++evN}`, shipmentId, at, label, location });
  const addAlert = (a: Omit<Alert, "id">) => alerts.push({ id: `AL-${++alN}`, ...a });

  const truckBase = (i: number, depot: string): Truck => {
    const m = pick(MODELS);
    return {
      id: `TRK-${(i + 1).toString().padStart(3, "0")}`,
      reg: makeReg(depot),
      model: m.model,
      type: m.type,
      capacityT: m.cap,
      year: int(2018, 2025),
      depot,
      driverId: null,
      status: "idle",
      shipmentId: null,
      routeId: null,
      reversed: false,
      kmDone: 0,
      routeKm: 0,
      lat: CITIES[depot].pos[0],
      lng: CITIES[depot].pos[1],
      heading: 0,
      speed: 0,
      stopTicks: 0,
      haltedSince: null,
      fuelPct: int(35, 96),
      odometer: int(48000, 640000),
      lastGpsAt: now - int(2, 40) * 1000,
      nextServiceKm: int(800, 14000),
    };
  };

  // Shipment numbering: hero is 001; others drawn from a shuffled pool.
  const idPool = Array.from({ length: 170 }, (_, i) => i + 2);
  for (let i = idPool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [idPool[i], idPool[j]] = [idPool[j], idPool[i]];
  }
  let poolIdx = 0;
  const nextShipmentId = () => shipmentId(idPool[poolIdx++]);

  // On-road assignments
  const onRoad: { routeId: string; reversed: boolean }[] = [];
  for (const r of ROUTES) for (let k = 0; k < ROUTE_LOAD[r.id]; k++) onRoad.push({ routeId: r.id, reversed: rnd() < 0.38 });
  // hero first: R01 forward
  const heroIdx = onRoad.findIndex((x) => x.routeId === "R01");
  onRoad.splice(heroIdx, 1);
  onRoad.unshift({ routeId: "R01", reversed: false });

  const DELAYED_IDX = new Set([5, 12, 19, 27, 33, 44, 52, 63]);
  const ATTENTION_IDX = new Set([9, 38, 58]);

  let driverCursor = 0;
  const custFor = (city: string) => {
    const local = customers.filter((c) => c.city === city);
    return local.length && rnd() < 0.7 ? pick(local) : pick(customers.slice(1));
  };

  onRoad.forEach((a, i) => {
    const route = resolveRoute(a.routeId, a.reversed);
    const depot = depotFor(route.origin);
    const t = truckBase(i, depot);
    const driver = drivers[driverCursor++];
    t.driverId = driver.id;
    driver.truckId = t.id;
    driver.status = "On trip";
    const hero = i === 0;
    const frac = hero ? 0.37 : between(0.07, 0.95);
    t.routeId = a.routeId;
    t.reversed = a.reversed;
    t.routeKm = route.totalKm;
    t.kmDone = route.totalKm * frac;
    const p = pointAlong(route, t.kmDone);
    t.lat = p.pos[0];
    t.lng = p.pos[1];
    t.heading = p.heading;
    t.speed = Math.round(between(46, 68));
    t.lastGpsAt = now - int(1, 25) * 1000;
    if (hero) {
      t.reg = "MH04KT7821";
      t.model = "Tata Signa 4825.TK";
      t.type = "Multi-axle trailer";
      t.capacityT = 35;
      t.speed = 58;
    }

    let status: TruckStatus = "moving";
    let lostMin = -int(0, 25); // slightly ahead of plan by default
    if (DELAYED_IDX.has(i)) {
      status = "delayed";
      lostMin = int(95, 290);
      t.speed = Math.round(between(18, 38));
    } else if (ATTENTION_IDX.has(i)) {
      status = "attention";
      lostMin = int(15, 35);
      t.speed = 0;
      t.stopTicks = 99999;
      t.haltedSince = now - int(64, 82) * MIN;
    }
    t.status = status;

    const remaining = route.totalKm - t.kmDone;
    const dispatchAt = now - (t.kmDone / PLANNED_KMPH) * H - lostMin * MIN;
    const plannedEta = dispatchAt + (route.totalKm / PLANNED_KMPH) * H;
    const eta = now + (remaining / PLANNED_KMPH) * H;
    const id = hero ? shipmentId(1) : nextShipmentId();
    const customer = hero ? customers[0] : custFor(route.origin);
    const [cargo, wMin, wMax] = hero ? CARGO[0] : pick(CARGO);
    let primaryW = hero ? 18.5 : Math.round(Math.min(between(wMin, wMax), t.capacityT) * 10) / 10;
    // Part loads: some trucks carry goods for several clients on the same trip.
    const extraClients: ShipmentClient[] = [];
    if (hero) {
      extraClients.push({ customerId: customers[12].id, cargo: "Cashew kernels (export)", weightT: 6 }, { customerId: customers[11].id, cargo: "FMCG cartons", weightT: 5 });
    } else if (i % 4 === 2) {
      const n = rnd() < 0.5 ? 1 : 2;
      for (let k = 0; k < n; k++) {
        const other = pick(customers.slice(1).filter((c) => c.id !== customer.id && !extraClients.some((e) => e.customerId === c.id)));
        const [oc] = pick(CARGO);
        extraClients.push({ customerId: other.id, cargo: oc, weightT: Math.round(between(2, 5) * 10) / 10 });
      }
      const extraW = extraClients.reduce((n2, e) => n2 + e.weightT, 0);
      primaryW = Math.max(3, Math.min(primaryW, t.capacityT - extraW));
    }
    const weightT = Math.round((primaryW + extraClients.reduce((n2, e) => n2 + e.weightT, 0)) * 10) / 10;
    let sStatus: Shipment["status"] = status === "delayed" ? "Delayed" : "In Transit";
    let outAt: number | null = null;
    if (remaining < 30 && status === "moving") {
      sStatus = "Out for Delivery";
      outAt = now - int(10, 40) * MIN;
    }
    const createdAt = dispatchAt - int(10, 30) * H;
    const s: Shipment = {
      id,
      customerId: customer.id,
      pickup: route.origin,
      delivery: route.destination,
      routeId: a.routeId,
      reversed: a.reversed,
      truckId: t.id,
      driverId: driver.id,
      cargo,
      weightT,
      freightInr: Math.round((route.totalKm * between(52, 68) + weightT * 900) / 100) * 100,
      createdAt,
      assignedAt: createdAt + int(1, 5) * H,
      pickedUpAt: dispatchAt - int(1, 4) * H,
      dispatchAt,
      outForDeliveryAt: outAt,
      deliveredAt: null,
      plannedEta,
      eta,
      penaltyMin: 0,
      delayReason: status === "delayed" ? pick(DELAY_REASONS) : null,
      status: sStatus,
      lastNotifiedEta: eta,
      extraClients,
    };
    t.shipmentId = id;
    shipments.push(s);
    trucks.push(t);

    // timeline events
    addEvent(id, s.createdAt, "Shipment created", route.origin);
    addEvent(id, s.assignedAt!, `Truck ${t.reg} assigned`, depot);
    addEvent(id, s.pickedUpAt!, "Goods picked up", route.origin);
    addEvent(id, dispatchAt, "Shipment dispatched", route.origin);
    for (let k = 1; k < route.stops.length - 1; k++) {
      if (route.cum[k] < t.kmDone) {
        const at = dispatchAt + (route.cum[k] / PLANNED_KMPH) * H + (k > 1 ? lostMin * MIN * (k / route.stops.length) : 0);
        addEvent(id, Math.min(at, now - 5 * MIN), `Passed ${route.stops[k]}`, `${route.stops[k]}, ${CITIES[route.stops[k]].state}`);
      }
    }
    const loc = describeLocation(route, t.kmDone);
    if (status === "delayed") {
      addEvent(id, now - int(20, 90) * MIN, `Delay reported: ${s.delayReason}`, loc.label);
      addAlert({
        severity: lostMin > 120 ? "critical" : "warning",
        kind: "Shipment delayed",
        title: `${t.reg} delayed by ${Math.floor(lostMin / 60)}h ${lostMin % 60}m`,
        detail: `${route.origin} → ${route.destination} · ${s.delayReason} · ${loc.label}`,
        truckId: t.id,
        shipmentId: id,
        createdAt: now - int(15, 80) * MIN,
        state: "open",
      });
    }
    if (status === "attention") {
      const mins = Math.round((now - t.haltedSince!) / MIN);
      addAlert({
        severity: "critical",
        kind: "Truck stationary",
        title: `${t.reg} stationary for ${mins} min`,
        detail: `Not moved since ${new Date(t.haltedSince!).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })} · ${route.def.highway}, ${loc.label}`,
        truckId: t.id,
        shipmentId: id,
        createdAt: t.haltedSince! + 60 * MIN,
        state: "open",
      });
    }
    if (outAt) addEvent(id, outAt, "Out for delivery", route.destination);

    // GPS trail (last ~10 pings)
    gps[t.id] = Array.from({ length: 10 }, (_, k) => {
      const km = Math.max(0, t.kmDone - (9 - k) * 1.2);
      const pp = pointAlong(route, km).pos;
      return { lat: pp[0], lng: pp[1], speed: t.speed, at: t.lastGpsAt - (9 - k) * 60_000 };
    });

    // customer notifications
    const recipients = [
      { c: customer, cargo: cargoPhrase(cargo, primaryW) },
      ...extraClients.map((e) => ({ c: customers.find((x) => x.id === e.customerId)!, cargo: cargoPhrase(e.cargo, e.weightT) })),
    ];
    const push = (kind: CustomerNotification["kind"], at: number, etaAt: number, extra: Partial<Parameters<typeof buildMessage>[1]> = {}, status: CustomerNotification["status"] = "Sent") => {
      for (const r of recipients)
        notifications.push({
          id: `NT-${++ntN}`,
          shipmentId: id,
          customerId: r.c.id,
          channel: "WhatsApp",
          kind,
          message: buildMessage(kind, { customerName: r.c.contact, shipmentId: id, pickup: route.origin, delivery: route.destination, cargo: r.cargo, vehicle: t.reg, company: DEFAULT_SETTINGS.companyName, eta: etaAt, now: at, ...extra }),
          status,
          trigger: "Automatic",
          createdAt: at,
        });
    };
    push("Shipment Dispatched", dispatchAt + 2 * MIN, plannedEta);
    if (frac > 0.3 && !hero) {
      const midKm = t.kmDone * 0.7;
      const l2 = describeLocation(route, midKm);
      push("In Transit", dispatchAt + (midKm / PLANNED_KMPH) * H, plannedEta, { near: l2.near, next: l2.next });
    }
    if (status === "delayed") push("Delivery Delay", now - int(10, 70) * MIN, eta, { reason: s.delayReason }, rnd() < 0.15 ? "Failed" : "Sent");
    if (outAt) push("Out for Delivery", outAt + MIN, eta);
  });

  // Idle / maintenance trucks (14) and arrived trucks (10)
  const idleDepots = ["Mumbai", "Mumbai", "Pune", "Delhi", "Delhi", "Ahmedabad", "Bengaluru", "Chennai", "Hyderabad", "Kolkata", "Nagpur", "Jaipur", "Surat", "Indore"];
  idleDepots.forEach((depot, k) => {
    const i = trucks.length;
    const t = truckBase(i, depot);
    // Bhiwandi / Chakan style yard offsets so parked trucks don't sit on the city centre
    t.lat += between(-0.05, 0.05);
    t.lng += between(-0.05, 0.05);
    t.status = k === 4 || k === 11 ? "maintenance" : "idle";
    if (k !== 6 && k !== 12) {
      const d = drivers[driverCursor++];
      t.driverId = d.id;
      d.truckId = t.id;
      d.status = "Available";
    }
    trucks.push(t);
  });

  // Upcoming shipments on idle trucks
  const upcoming: { truckIdx: number | null; status: Shipment["status"] }[] = [
    { truckIdx: 76, status: "Pickup Completed" },
    { truckIdx: 77, status: "Order Confirmed" },
    { truckIdx: 78, status: "Pickup Completed" },
    { truckIdx: 79, status: "Order Confirmed" },
    { truckIdx: 81, status: "Order Confirmed" },
    { truckIdx: 83, status: "Pickup Completed" },
    { truckIdx: null, status: "Order Confirmed" },
  ];
  upcoming.forEach((u) => {
    const truck = u.truckIdx != null ? trucks[u.truckIdx] : null;
    const candidateRoutes = ROUTES.flatMap((r) => [
      { r, rev: false },
      { r, rev: true },
    ]).filter(({ r, rev }) => (rev ? r.stops[r.stops.length - 1] : r.stops[0]) === (truck?.depot ?? "Pune"));
    const { r, rev } = candidateRoutes.length ? pick(candidateRoutes) : { r: ROUTES[1], rev: false };
    const route = resolveRoute(r.id, rev);
    const customer = custFor(route.origin);
    const [cargo, wMin, wMax] = pick(CARGO);
    const createdAt = now - int(2, 20) * H;
    const id = nextShipmentId();
    const plannedDispatch = now + int(2, 14) * H;
    const s: Shipment = {
      id,
      customerId: customer.id,
      pickup: route.origin,
      delivery: route.destination,
      routeId: r.id,
      reversed: rev,
      truckId: truck?.id ?? null,
      driverId: truck?.driverId ?? null,
      cargo,
      weightT: Math.round(between(wMin, wMax) * 10) / 10,
      freightInr: Math.round((route.totalKm * between(52, 68)) / 100) * 100,
      createdAt,
      assignedAt: truck ? createdAt + int(1, 2) * H : null,
      pickedUpAt: u.status === "Pickup Completed" ? now - int(1, 3) * H : null,
      dispatchAt: null,
      outForDeliveryAt: null,
      deliveredAt: null,
      plannedEta: plannedDispatch + (route.totalKm / PLANNED_KMPH) * H,
      eta: plannedDispatch + (route.totalKm / PLANNED_KMPH) * H,
      penaltyMin: 0,
      delayReason: null,
      status: u.status,
      lastNotifiedEta: null,
      extraClients: [],
    };
    if (truck) {
      truck.shipmentId = id;
      truck.routeId = r.id;
      truck.reversed = rev;
      truck.routeKm = route.totalKm;
    }
    shipments.push(s);
    addEvent(id, createdAt, "Shipment created", route.origin);
    if (truck) addEvent(id, s.assignedAt!, `Truck ${truck.reg} assigned`, truck.depot);
    if (s.pickedUpAt) addEvent(id, s.pickedUpAt, "Goods picked up", route.origin);
    if (!truck) {
      addAlert({
        severity: "warning",
        kind: "Assignment missing",
        title: `${id} has no truck assigned`,
        detail: `${route.origin} → ${route.destination} · ${cargo} · pickup planned ${new Date(plannedDispatch).toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit" })}`,
        truckId: null,
        shipmentId: id,
        createdAt: createdAt + 30 * MIN,
        state: "open",
      });
    }
  });
  trucks
    .filter((t) => !t.driverId)
    .forEach((t) =>
      addAlert({
        severity: "warning",
        kind: "Assignment missing",
        title: `${t.reg} has no driver assigned`,
        detail: `Parked at ${t.depot} depot · assign a driver before the next dispatch`,
        truckId: t.id,
        shipmentId: null,
        createdAt: now - int(3, 9) * H,
        state: "open",
      }),
    );

  // Arrived trucks (10): reached destination in the last few hours
  for (let k = 0; k < 10; k++) {
    const r = pick(ROUTES);
    const rev = rnd() < 0.5;
    const route = resolveRoute(r.id, rev);
    const depot = depotFor(route.origin);
    const t = truckBase(trucks.length, depot);
    const d = drivers[driverCursor++];
    t.driverId = d.id;
    d.truckId = t.id;
    d.status = "Resting";
    const deliveredAt = now - int(15, 300) * MIN;
    const dest = CITIES[route.destination].pos;
    t.lat = dest[0] + between(-0.03, 0.03);
    t.lng = dest[1] + between(-0.03, 0.03);
    t.status = "arrived";
    t.routeId = r.id;
    t.reversed = rev;
    t.routeKm = route.totalKm;
    t.kmDone = route.totalKm;
    const id = nextShipmentId();
    const customer = custFor(route.origin);
    const [cargo, wMin, wMax] = pick(CARGO);
    const dispatchAt = deliveredAt - (route.totalKm / PLANNED_KMPH) * H - int(-40, 50) * MIN;
    const plannedEta = dispatchAt + (route.totalKm / PLANNED_KMPH) * H;
    t.shipmentId = id;
    const s: Shipment = {
      id,
      customerId: customer.id,
      pickup: route.origin,
      delivery: route.destination,
      routeId: r.id,
      reversed: rev,
      truckId: t.id,
      driverId: d.id,
      cargo,
      weightT: Math.round(between(wMin, wMax) * 10) / 10,
      freightInr: Math.round((route.totalKm * between(52, 68)) / 100) * 100,
      createdAt: dispatchAt - 20 * H,
      assignedAt: dispatchAt - 16 * H,
      pickedUpAt: dispatchAt - 2 * H,
      dispatchAt,
      outForDeliveryAt: deliveredAt - int(30, 70) * MIN,
      deliveredAt,
      plannedEta,
      eta: deliveredAt,
      penaltyMin: 0,
      delayReason: null,
      status: "Delivered",
      lastNotifiedEta: deliveredAt,
      extraClients: [],
    };
    shipments.push(s);
    trucks.push(t);
    addEvent(id, s.createdAt, "Shipment created", route.origin);
    addEvent(id, s.assignedAt!, `Truck ${t.reg} assigned`, depot);
    addEvent(id, s.pickedUpAt!, "Goods picked up", route.origin);
    addEvent(id, dispatchAt, "Shipment dispatched", route.origin);
    addEvent(id, s.outForDeliveryAt!, "Out for delivery", route.destination);
    addEvent(id, deliveredAt, "Delivered · POD captured", route.destination);
    addAlert({
      severity: "info",
      kind: "Reached destination",
      title: `${t.reg} reached ${route.destination}`,
      detail: `${id} delivered to ${customer.company}`,
      truckId: t.id,
      shipmentId: id,
      createdAt: deliveredAt,
      state: k < 6 ? "resolved" : "open",
    });
    const msgBase = { customerName: customer.contact, shipmentId: id, pickup: route.origin, delivery: route.destination, cargo: cargoPhrase(cargo, s.weightT), vehicle: t.reg, company: DEFAULT_SETTINGS.companyName };
    notifications.push({
      id: `NT-${++ntN}`,
      shipmentId: id,
      customerId: customer.id,
      channel: "WhatsApp",
      kind: "Out for Delivery",
      message: buildMessage("Out for Delivery", { ...msgBase, eta: deliveredAt, now: s.outForDeliveryAt! }),
      status: "Sent",
      trigger: "Automatic",
      createdAt: s.outForDeliveryAt! + MIN,
    });
    notifications.push({
      id: `NT-${++ntN}`,
      shipmentId: id,
      customerId: customer.id,
      channel: rnd() < 0.7 ? "WhatsApp" : "SMS",
      kind: "Delivered",
      message: buildMessage("Delivered", { ...msgBase, eta: deliveredAt, now: deliveredAt }),
      status: k === 3 ? "Pending" : "Sent",
      trigger: "Automatic",
      createdAt: deliveredAt + MIN,
    });
  }

  // Historic delivered shipments (last 30 days) — makes customers, drivers & reports populated
  for (let k = 0; k < 64; k++) {
    const r = pick(ROUTES);
    const rev = rnd() < 0.45;
    const route = resolveRoute(r.id, rev);
    const t = pick(trucks);
    const customer = custFor(route.origin);
    const [cargo, wMin, wMax] = pick(CARGO);
    const deliveredAt = now - between(0.4, 30) * 24 * H;
    const late = rnd() < 0.09 ? int(70, 260) : -int(0, 40);
    const dispatchAt = deliveredAt - (route.totalKm / PLANNED_KMPH) * H - late * MIN;
    const plannedEta = deliveredAt - late * MIN;
    const id = nextShipmentId();
    shipments.push({
      id,
      customerId: customer.id,
      pickup: route.origin,
      delivery: route.destination,
      routeId: r.id,
      reversed: rev,
      truckId: t.id,
      driverId: t.driverId,
      cargo,
      weightT: Math.round(between(wMin, wMax) * 10) / 10,
      freightInr: Math.round((route.totalKm * between(52, 68)) / 100) * 100,
      createdAt: dispatchAt - 22 * H,
      assignedAt: dispatchAt - 18 * H,
      pickedUpAt: dispatchAt - 2 * H,
      dispatchAt,
      outForDeliveryAt: deliveredAt - 50 * MIN,
      deliveredAt,
      plannedEta,
      eta: deliveredAt,
      penaltyMin: 0,
      delayReason: late > 60 ? pick(DELAY_REASONS) : null,
      status: "Delivered",
      lastNotifiedEta: deliveredAt,
      extraClients: [],
    });
    addEvent(id, dispatchAt - 22 * H, "Shipment created", route.origin);
    addEvent(id, dispatchAt, "Shipment dispatched", route.origin);
    addEvent(id, deliveredAt, "Delivered · POD captured", route.destination);
  }

  // A few older resolved / acknowledged alerts for history
  const sampleTrucks = trucks.slice(0, 76);
  for (let k = 0; k < 6; k++) {
    const t = pick(sampleTrucks);
    const s = shipments.find((x) => x.id === t.shipmentId)!;
    addAlert({
      severity: "info",
      kind: "ETA changed",
      title: `ETA revised for ${s.id}`,
      detail: `${s.pickup} → ${s.delivery} · new ETA ${new Date(s.eta).toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit" })}`,
      truckId: t.id,
      shipmentId: s.id,
      createdAt: now - int(1, 20) * H,
      state: k < 4 ? "resolved" : "acknowledged",
    });
  }
  // One failed SMS for realism
  const failedTarget = notifications.find((n) => n.channel === "SMS" && n.kind === "Shipment Dispatched");
  if (failedTarget) failedTarget.status = "Failed";

  notifications.sort((a, b) => b.createdAt - a.createdAt);
  alerts.sort((a, b) => b.createdAt - a.createdAt);
  events.sort((a, b) => a.at - b.at);
  shipments.sort((a, b) => (a.id < b.id ? -1 : 1));

  // Historic driver/truck stats line up with assignments
  for (const d of drivers) if (!d.truckId && d.status === "Available") d.status = rnd() < 0.5 ? "Off duty" : "Available";

  return {
    schema: SCHEMA_VERSION,
    rev: 1,
    seededAt: now,
    trucks,
    drivers,
    customers,
    shipments,
    notifications,
    alerts,
    events,
    gps,
    settings: { ...DEFAULT_SETTINGS },
    sim: { running: true, speed: 1, offsetMs: 0, ticks: 0 },
    tour: { open: false, done: {} },
    counters: {
      deliveredThisMonth: 268,
      notification: ntN,
      alert: alN,
      event: evN,
      shipment: 172,
    },
    heroShipmentId: shipmentId(1),
  };
}
