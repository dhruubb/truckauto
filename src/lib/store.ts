"use client";

// Shared demo data store + GPS simulation engine.
// One store is shared by every page (admin and customer portal). It persists to
// localStorage and syncs across browser tabs, so a delay simulated in the admin
// dashboard shows up immediately in an open customer tracking tab.

import { useSyncExternalStore } from "react";
import { CITIES, PLANNED_KMPH, describeLocation, pointAlong, resolveRoute } from "./geo";
import { DELAY_REASONS, buildMessage, trackingLink } from "./messages";
import { SCHEMA_VERSION, createSeed } from "./seed";
import { delayMinutes, findCustomer, findDriver, findShipment, findTruck, isOnRoad, truckLocation } from "./selectors";
import type {
  Alert,
  AlertSeverity,
  AppState,
  Channel,
  CustomerNotification,
  NotificationKind,
  Settings,
  Shipment,
  Truck,
  TruckStatus,
} from "./types";

const STORAGE_KEY = "sst:state";
const LEADER_KEY = "sst:leader";
const TICK_MS = 2000;
const H = 3600_000;
const MIN = 60_000;
const MAX_AGE_MS = 8 * H; // reseed stale demo data so ETAs stay believable

let state: AppState | null = null;
const listeners = new Set<() => void>();
const tabId = Math.random().toString(36).slice(2);

// ---------------------------------------------------------------------------
// toasts (not persisted)
export interface Toast {
  id: number;
  title: string;
  body?: string;
  tone: "info" | "success" | "warning" | "danger" | "whatsapp" | "sms";
}
let toasts: Toast[] = [];
const toastListeners = new Set<() => void>();
let toastSeq = 0;
export function pushToast(t: Omit<Toast, "id">) {
  const id = ++toastSeq;
  toasts = [...toasts, { ...t, id }].slice(-4);
  toastListeners.forEach((l) => l());
  setTimeout(() => dismissToast(id), 5200);
}
export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  toastListeners.forEach((l) => l());
}
export function useToasts(): Toast[] {
  return useSyncExternalStore(
    (cb) => {
      toastListeners.add(cb);
      return () => toastListeners.delete(cb);
    },
    () => toasts,
    () => toasts,
  );
}

// ---------------------------------------------------------------------------
// core store

function emit() {
  listeners.forEach((l) => l());
}

function persist(s: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* storage full or blocked — demo keeps running in memory */
  }
}

function setState(next: AppState, save = true) {
  state = next;
  if (save) persist(next);
  emit();
}

export function getState(): AppState | null {
  return state;
}

/** Apply a change to a copy of the state, then publish + persist it. */
export function mutate(fn: (draft: AppState) => void) {
  if (!state) return;
  const draft = structuredClone(state);
  fn(draft);
  draft.rev = state.rev + 1;
  setState(draft);
}

export function simNow(s: AppState | null = state): number {
  return Date.now() + (s?.sim.offsetMs ?? 0);
}

let initialised = false;
let timer: ReturnType<typeof setInterval> | null = null;
let lastTickAt = 0;

function loadOrSeed(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.schema === SCHEMA_VERSION && Date.now() - parsed.seededAt < MAX_AGE_MS) return parsed;
    }
  } catch {
    /* corrupted storage — reseed */
  }
  return createSeed(Date.now());
}

export function initStore() {
  if (initialised || typeof window === "undefined") return;
  initialised = true;
  setState(loadOrSeed());

  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try {
      const incoming = JSON.parse(e.newValue) as AppState;
      if (!state || incoming.rev > state.rev || incoming.seededAt !== state.seededAt) setState(incoming, false);
    } catch {
      /* ignore */
    }
  });

  lastTickAt = Date.now();
  timer = setInterval(heartbeat, 1000);
}

function isLeader(): boolean {
  try {
    const raw = localStorage.getItem(LEADER_KEY);
    const now = Date.now();
    if (raw) {
      const l = JSON.parse(raw) as { id: string; ts: number };
      if (l.id !== tabId && now - l.ts < 4500) return false;
    }
    localStorage.setItem(LEADER_KEY, JSON.stringify({ id: tabId, ts: now }));
    return true;
  } catch {
    return true;
  }
}

function heartbeat() {
  if (!state) return;
  if (!isLeader()) {
    lastTickAt = Date.now();
    return;
  }
  const now = Date.now();
  if (now - lastTickAt < TICK_MS) return;
  const dt = Math.min(now - lastTickAt, 6000);
  lastTickAt = now;
  if (!state.sim.running) return;
  mutate((d) => tick(d, dt));
}

export function useAppState(): AppState | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => null,
  );
}

// ---------------------------------------------------------------------------
// helpers

export { findTruck, findShipment, findDriver, findCustomer, heroOf, ON_ROAD, isOnRoad, delayMinutes, truckLocation } from "./selectors";

function addEvent(d: AppState, shipmentId: string, label: string, location: string, at = simNow(d)) {
  d.counters.event += 1;
  d.events.push({ id: `EV-${d.counters.event}`, shipmentId, at, label, location });
}

function addAlert(d: AppState, a: { severity: AlertSeverity; kind: string; title: string; detail: string; truckId: string | null; shipmentId: string | null }) {
  d.counters.alert += 1;
  const alert: Alert = { id: `AL-${d.counters.alert}`, createdAt: simNow(d), state: "open", ...a };
  d.alerts.unshift(alert);
  if (d.alerts.length > 250) d.alerts.length = 250;
}

const AUTO_SETTING: Record<NotificationKind, keyof Settings> = {
  "Shipment Dispatched": "autoDispatch",
  "In Transit": "autoInTransit",
  "Delivery Delay": "autoDelay",
  "ETA Updated": "autoDelay",
  "Out for Delivery": "autoOutForDelivery",
  Delivered: "autoDelivered",
};

/** Queue a simulated WhatsApp/SMS. It flips from Pending to Sent/Failed after a moment. */
function queueNotification(
  d: AppState,
  s: Shipment,
  kind: NotificationKind,
  opts: { trigger?: "Automatic" | "Manual"; channel?: Channel; near?: string; next?: string } = {},
): CustomerNotification | null {
  const trigger = opts.trigger ?? "Automatic";
  if (trigger === "Automatic" && !d.settings[AUTO_SETTING[kind]]) return null;
  const customer = findCustomer(d, s.customerId);
  if (!customer) return null;
  let channel: Channel = opts.channel ?? (d.settings.whatsappEnabled ? "WhatsApp" : "SMS");
  if (channel === "WhatsApp" && !d.settings.whatsappEnabled) channel = "SMS";
  if (channel === "SMS" && !d.settings.smsEnabled) {
    if (!d.settings.whatsappEnabled) return null;
    channel = "WhatsApp";
  }
  const now = simNow(d);
  let near = opts.near;
  let next = opts.next;
  if (kind === "In Transit" && (!near || !next)) {
    const t = findTruck(d, s.truckId);
    if (t) {
      const loc = describeLocation(resolveRoute(s.routeId, s.reversed), t.kmDone);
      near = loc.near;
      next = loc.next;
    }
  }
  d.counters.notification += 1;
  const n: CustomerNotification = {
    id: `NT-${d.counters.notification}`,
    shipmentId: s.id,
    customerId: customer.id,
    channel,
    kind,
    trigger,
    status: "Pending",
    createdAt: now,
    message: buildMessage(kind, {
      customerName: customer.contact,
      shipmentId: s.id,
      pickup: s.pickup,
      delivery: s.delivery,
      eta: s.eta,
      now,
      near,
      next,
      reason: s.delayReason,
      trackingLink: trackingLink(s.id),
      company: d.settings.companyName,
    }),
  };
  d.notifications.unshift(n);
  if (d.notifications.length > 400) d.notifications.length = 400;
  s.lastNotifiedEta = s.eta;
  const delivered = Math.random() > 0.03;
  setTimeout(() => {
    mutate((dd) => {
      const target = dd.notifications.find((x) => x.id === n.id);
      if (target && target.status === "Pending") target.status = delivered ? "Sent" : "Failed";
    });
  }, 1400);
  return n;
}

function recomputeEta(d: AppState, s: Shipment, t: Truck, now: number) {
  const remaining = Math.max(0, t.routeKm - t.kmDone);
  s.eta = now + (remaining / PLANNED_KMPH) * H + s.penaltyMin * MIN;
}

function deliver(d: AppState, t: Truck, s: Shipment) {
  const now = simNow(d);
  const route = resolveRoute(s.routeId, s.reversed);
  t.kmDone = t.routeKm;
  const dest = CITIES[route.destination].pos;
  t.lat = dest[0];
  t.lng = dest[1];
  t.speed = 0;
  t.status = "arrived";
  t.stopTicks = 0;
  t.haltedSince = null;
  s.status = "Delivered";
  s.outForDeliveryAt = s.outForDeliveryAt ?? now - 35 * MIN;
  s.deliveredAt = now;
  s.eta = now;
  d.counters.deliveredThisMonth += 1;
  const drv = findDriver(d, t.driverId);
  if (drv) {
    drv.totalDeliveries += 1;
    drv.status = "Resting";
  }
  addEvent(d, s.id, "Delivered · POD captured", `${route.destination}, ${CITIES[route.destination].state}`);
  const customer = findCustomer(d, s.customerId);
  addAlert(d, {
    severity: "info",
    kind: "Reached destination",
    title: `${t.reg} reached ${route.destination}`,
    detail: `${s.id} delivered${customer ? ` to ${customer.company}` : ""}`,
    truckId: t.id,
    shipmentId: s.id,
  });
  d.alerts.filter((a) => a.shipmentId === s.id && a.state !== "resolved" && a.kind !== "Reached destination").forEach((a) => (a.state = "resolved"));
  queueNotification(d, s, "Delivered");
}

function markOutForDelivery(d: AppState, s: Shipment) {
  s.status = "Out for Delivery";
  s.outForDeliveryAt = simNow(d);
  addEvent(d, s.id, "Out for delivery", s.delivery);
  queueNotification(d, s, "Out for Delivery");
}

function markDelayed(d: AppState, t: Truck, s: Shipment, reason: string) {
  const now = simNow(d);
  const route = resolveRoute(s.routeId, s.reversed);
  const loc = describeLocation(route, t.kmDone);
  s.status = "Delayed";
  s.delayReason = reason;
  t.status = "delayed";
  const late = delayMinutes(s);
  addEvent(d, s.id, `Delay reported: ${reason}`, loc.label, now);
  addAlert(d, {
    severity: late > 120 ? "critical" : "warning",
    kind: "Shipment delayed",
    title: `${t.reg} delayed by ${Math.floor(late / 60)}h ${late % 60}m`,
    detail: `${s.pickup} → ${s.delivery} · ${reason} · ${loc.label}`,
    truckId: t.id,
    shipmentId: s.id,
  });
  queueNotification(d, s, "Delivery Delay");
}

// ---------------------------------------------------------------------------
// simulation tick

function tick(d: AppState, dtReal: number) {
  const speedX = d.sim.speed;
  d.sim.offsetMs += dtReal * (speedX - 1);
  d.sim.ticks += 1;
  const now = simNow(d);
  const dtH = (dtReal * speedX) / H;

  for (const t of d.trucks) {
    if (!isOnRoad(t) || !t.shipmentId || !t.routeId) {
      if (Math.random() < 0.08) t.lastGpsAt = now - Math.random() * 4000;
      continue;
    }
    const s = findShipment(d, t.shipmentId);
    if (!s) continue;
    const route = resolveRoute(t.routeId, t.reversed);
    const prevSeg = pointAlong(route, t.kmDone).segment;

    if (t.status === "attention") {
      t.speed = 0;
      if (t.haltedSince == null) t.haltedSince = now;
    } else if (t.stopTicks > 0) {
      t.stopTicks -= 1;
      t.speed = 0;
      if (t.stopTicks === 0) t.haltedSince = null;
    } else {
      if (Math.random() < 0.003) {
        t.stopTicks = 3 + Math.floor(Math.random() * 10);
        t.haltedSince = now;
        t.speed = 0;
      } else {
        const lo = t.status === "delayed" ? 18 : 42;
        const hi = t.status === "delayed" ? 46 : 74;
        const base = t.speed < lo ? (lo + hi) / 2 : t.speed;
        t.speed = Math.round(Math.max(lo, Math.min(hi, base + (Math.random() * 10 - 5))));
        const advance = PLANNED_KMPH * 1.08 * (t.speed / 58) * dtH;
        t.kmDone = Math.min(t.routeKm, t.kmDone + advance);
        t.odometer += advance;
        t.fuelPct = t.fuelPct - advance * 0.03 < 14 ? 96 : t.fuelPct - advance * 0.03;
        t.nextServiceKm = Math.max(0, t.nextServiceKm - advance);
      }
    }
    const p = pointAlong(route, t.kmDone);
    t.lat = p.pos[0];
    t.lng = p.pos[1];
    t.heading = p.heading;
    t.lastGpsAt = now - Math.random() * 2500;
    const trail = (d.gps[t.id] ??= []);
    trail.push({ lat: t.lat, lng: t.lng, speed: t.speed, at: t.lastGpsAt });
    if (trail.length > 24) trail.splice(0, trail.length - 24);

    recomputeEta(d, s, t, now);
    const remaining = t.routeKm - t.kmDone;
    const late = delayMinutes(s);

    if (remaining <= 0.05) {
      deliver(d, t, s);
      continue;
    }
    if (p.segment > prevSeg) {
      const city = route.stops[p.segment];
      addEvent(d, s.id, `Passed ${city}`, `${city}, ${CITIES[city].state}`, now);
      const lastInTransit = d.notifications.find((n) => n.shipmentId === s.id && n.kind === "In Transit");
      if (!lastInTransit || now - lastInTransit.createdAt > 6 * H) {
        queueNotification(d, s, "In Transit", { near: city, next: route.stops[Math.min(p.segment + 1, route.stops.length - 1)] });
      }
    }
    if (remaining < 30 && s.status !== "Out for Delivery") {
      if (s.status === "Delayed") t.status = "moving";
      markOutForDelivery(d, s);
    } else if (s.status === "In Transit" && late > d.settings.delayThresholdMin) {
      markDelayed(d, t, s, s.delayReason ?? DELAY_REASONS[Math.floor(Math.random() * DELAY_REASONS.length)]);
    } else if (s.status === "Delayed" && late < d.settings.delayThresholdMin / 2) {
      s.status = "In Transit";
      s.delayReason = null;
      if (t.status === "delayed") t.status = "moving";
      addAlert(d, { severity: "info", kind: "ETA changed", title: `${s.id} back on schedule`, detail: `${t.reg} recovered lost time · ETA ${new Date(s.eta).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`, truckId: t.id, shipmentId: s.id });
      queueNotification(d, s, "ETA Updated");
    } else if (s.lastNotifiedEta != null && Math.abs(s.eta - s.lastNotifiedEta) > d.settings.etaChangeThresholdMin * MIN) {
      addAlert(d, { severity: "info", kind: "ETA changed", title: `ETA revised for ${s.id}`, detail: `${s.pickup} → ${s.delivery} · ${t.reg}`, truckId: t.id, shipmentId: s.id });
      queueNotification(d, s, "ETA Updated");
      s.lastNotifiedEta = s.eta;
    }

    // stationary alert
    if (t.haltedSince != null && now - t.haltedSince > d.settings.stationaryAlertMin * MIN) {
      const open = d.alerts.some((a) => a.truckId === t.id && a.kind === "Truck stationary" && a.state !== "resolved");
      if (!open) {
        addAlert(d, {
          severity: "critical",
          kind: "Truck stationary",
          title: `${t.reg} stationary for ${Math.round((now - t.haltedSince) / MIN)} min`,
          detail: `${route.def.highway}, ${describeLocation(route, t.kmDone).label}`,
          truckId: t.id,
          shipmentId: s.id,
        });
        if (t.status === "moving") t.status = "attention";
      }
    }
  }
}

// ---------------------------------------------------------------------------
// actions (used by UI + demo controls)

export const actions = {
  setRunning(running: boolean) {
    mutate((d) => {
      d.sim.running = running;
    });
    lastTickAt = Date.now();
  },
  setSpeed(speed: number) {
    mutate((d) => {
      d.sim.speed = speed;
    });
  },
  reset(openTour = false) {
    const fresh = createSeed(Date.now());
    fresh.rev = (state?.rev ?? 0) + 1;
    fresh.tour = { open: openTour, done: {} };
    setState(fresh);
  },
  updateSettings(patch: Partial<Settings>) {
    mutate((d) => {
      d.settings = { ...d.settings, ...patch };
    });
  },
  setTourOpen(open: boolean) {
    mutate((d) => {
      d.tour.open = open;
    });
  },
  markTour(step: string) {
    if (!state || state.tour.done[step]) return;
    mutate((d) => {
      d.tour.done[step] = true;
    });
  },

  simulateDelay(truckId: string, minutes = 150, reason?: string) {
    let ok = false;
    mutate((d) => {
      const t = findTruck(d, truckId);
      const s = t && findShipment(d, t.shipmentId);
      if (!t || !s || !isOnRoad(t) || s.status === "Delivered") return;
      const now = simNow(d);
      s.penaltyMin += minutes;
      t.speed = 0;
      t.stopTicks = 6;
      t.haltedSince = now;
      recomputeEta(d, s, t, now);
      if (s.status === "Out for Delivery") s.status = "In Transit";
      markDelayed(d, t, s, reason ?? `heavy traffic near ${describeLocation(resolveRoute(s.routeId, s.reversed), t.kmDone).near}`);
      d.tour.done.delay = true;
      ok = true;
    });
    if (ok) pushToast({ tone: "warning", title: "Delay simulated", body: "Status and ETA updated. Customer notified on WhatsApp (simulated)." });
    return ok;
  },

  simulateGpsUpdate(truckId: string) {
    let ok = false;
    mutate((d) => {
      const t = findTruck(d, truckId);
      const s = t && findShipment(d, t.shipmentId);
      if (!t || !s || !t.routeId || !isOnRoad(t)) return;
      const now = simNow(d);
      const route = resolveRoute(t.routeId, t.reversed);
      const jump = Math.min(t.routeKm - t.kmDone - 0.2, 18 + Math.random() * 22);
      const prevSeg = pointAlong(route, t.kmDone).segment;
      t.kmDone += Math.max(0, jump);
      t.odometer += Math.max(0, jump);
      if (t.status === "attention") t.status = s.status === "Delayed" ? "delayed" : "moving";
      t.stopTicks = 0;
      t.haltedSince = null;
      t.speed = Math.round(52 + Math.random() * 16);
      const p = pointAlong(route, t.kmDone);
      t.lat = p.pos[0];
      t.lng = p.pos[1];
      t.heading = p.heading;
      t.lastGpsAt = now;
      (d.gps[t.id] ??= []).push({ lat: t.lat, lng: t.lng, speed: t.speed, at: now });
      recomputeEta(d, s, t, now);
      const loc = describeLocation(route, t.kmDone);
      addEvent(d, s.id, p.segment > prevSeg ? `Passed ${route.stops[p.segment]}` : "GPS position update", loc.label, now);
      d.alerts.filter((a) => a.truckId === t.id && a.kind === "Truck stationary" && a.state !== "resolved").forEach((a) => (a.state = "resolved"));
      if (t.routeKm - t.kmDone < 30 && s.status !== "Out for Delivery") markOutForDelivery(d, s);
      else queueNotification(d, s, "In Transit", { near: loc.near, next: loc.next });
      ok = true;
    });
    if (ok) pushToast({ tone: "info", title: "GPS update received", body: "Position, speed and ETA refreshed (simulated ping)." });
    return ok;
  },

  completeDelivery(truckId: string) {
    let ok = false;
    mutate((d) => {
      const t = findTruck(d, truckId);
      const s = t && findShipment(d, t.shipmentId);
      if (!t || !s || !isOnRoad(t)) return;
      if (s.status !== "Out for Delivery") {
        s.outForDeliveryAt = simNow(d) - 40 * MIN;
        addEvent(d, s.id, "Out for delivery", s.delivery, s.outForDeliveryAt);
      }
      deliver(d, t, s);
      ok = true;
    });
    if (ok) pushToast({ tone: "success", title: "Delivery completed", body: "Proof of delivery captured and customer notified." });
    return ok;
  },

  setTruckStatus(truckId: string, status: TruckStatus) {
    const s0 = state;
    const t0 = s0 && findTruck(s0, truckId);
    if (!s0 || !t0) return;
    if (status === "delayed") return void actions.simulateDelay(truckId, 130);
    if (status === "arrived") return void actions.completeDelivery(truckId);
    mutate((d) => {
      const t = findTruck(d, truckId)!;
      const s = findShipment(d, t.shipmentId);
      const now = simNow(d);
      if (status === "moving" && s && isOnRoad(t)) {
        t.status = "moving";
        t.stopTicks = 0;
        t.haltedSince = null;
        t.speed = 55;
        s.penaltyMin = 0;
        recomputeEta(d, s, t, now);
        if (s.status === "Delayed") {
          s.status = "In Transit";
          s.delayReason = null;
        }
        d.alerts.filter((a) => a.truckId === t.id && a.state !== "resolved" && a.kind !== "Reached destination").forEach((a) => (a.state = "resolved"));
        addEvent(d, s.id, "Marked back on schedule by operations", truckLocation(t), now);
      } else if (status === "attention" && isOnRoad(t)) {
        t.status = "attention";
        t.speed = 0;
        t.haltedSince = now;
        addAlert(d, { severity: "critical", kind: "Needs attention", title: `${t.reg} flagged for attention`, detail: `Flagged by operations · ${truckLocation(t)}`, truckId: t.id, shipmentId: t.shipmentId });
      } else if ((status === "idle" || status === "maintenance") && !isOnRoad(t)) {
        if (t.status === "arrived") {
          t.lat = CITIES[t.depot].pos[0];
          t.lng = CITIES[t.depot].pos[1];
          t.shipmentId = null;
          t.routeId = null;
          t.kmDone = 0;
          const drv = findDriver(d, t.driverId);
          if (drv) drv.status = "Available";
        }
        t.status = status;
      }
    });
    pushToast({ tone: "info", title: "Truck status updated" });
  },

  assignDriver(truckId: string, driverId: string | null) {
    mutate((d) => {
      const t = findTruck(d, truckId);
      if (!t) return;
      const prev = findDriver(d, t.driverId);
      if (prev) {
        prev.truckId = null;
        prev.status = "Available";
      }
      if (driverId) {
        const drv = findDriver(d, driverId);
        if (!drv) return;
        const oldTruck = findTruck(d, drv.truckId);
        if (oldTruck) oldTruck.driverId = null;
        drv.truckId = t.id;
        drv.status = isOnRoad(t) ? "On trip" : "Available";
        t.driverId = drv.id;
        const s = findShipment(d, t.shipmentId);
        if (s && s.status !== "Delivered") s.driverId = drv.id;
        d.alerts.filter((a) => a.truckId === t.id && a.kind === "Assignment missing").forEach((a) => (a.state = "resolved"));
      } else {
        t.driverId = null;
      }
    });
    pushToast({ tone: "success", title: driverId ? "Driver assigned" : "Driver unassigned" });
  },

  saveTruck(input: Pick<Truck, "reg" | "model" | "type" | "capacityT" | "depot" | "year"> & { id?: string; driverId?: string | null }) {
    let id = input.id ?? "";
    mutate((d) => {
      if (input.id) {
        const t = findTruck(d, input.id);
        if (!t) return;
        Object.assign(t, { reg: input.reg, model: input.model, type: input.type, capacityT: input.capacityT, depot: input.depot, year: input.year });
        if (!isOnRoad(t) && t.status !== "arrived") {
          t.lat = CITIES[input.depot].pos[0] + 0.02;
          t.lng = CITIES[input.depot].pos[1] + 0.02;
        }
        return;
      }
      const n = d.trucks.length + 1;
      id = `TRK-${n.toString().padStart(3, "0")}`;
      const pos = CITIES[input.depot].pos;
      d.trucks.push({
        id,
        reg: input.reg,
        model: input.model,
        type: input.type,
        capacityT: input.capacityT,
        year: input.year,
        depot: input.depot,
        driverId: null,
        status: "idle",
        shipmentId: null,
        routeId: null,
        reversed: false,
        kmDone: 0,
        routeKm: 0,
        lat: pos[0] + 0.02,
        lng: pos[1] + 0.02,
        heading: 0,
        speed: 0,
        stopTicks: 0,
        haltedSince: null,
        fuelPct: 100,
        odometer: 0,
        lastGpsAt: simNow(d),
        nextServiceKm: 15000,
      });
    });
    if (input.driverId !== undefined && id) {
      const cur = state && findTruck(state, id);
      if (cur && cur.driverId !== input.driverId) actions.assignDriver(id, input.driverId);
    }
    pushToast({ tone: "success", title: input.id ? "Truck updated" : "Truck added to fleet", body: input.reg });
    return id;
  },

  createShipment(input: { customerId: string; routeId: string; reversed: boolean; cargo: string; weightT: number; truckId: string | null }) {
    let id = "";
    mutate((d) => {
      d.counters.shipment += 1;
      id = `SST-2026-${d.counters.shipment.toString().padStart(3, "0")}`;
      const route = resolveRoute(input.routeId, input.reversed);
      const now = simNow(d);
      const t = findTruck(d, input.truckId);
      const planned = now + 3 * H + (route.totalKm / PLANNED_KMPH) * H;
      const s: Shipment = {
        id,
        customerId: input.customerId,
        pickup: route.origin,
        delivery: route.destination,
        routeId: input.routeId,
        reversed: input.reversed,
        truckId: t?.id ?? null,
        driverId: t?.driverId ?? null,
        cargo: input.cargo,
        weightT: input.weightT,
        freightInr: Math.round((route.totalKm * 60 + input.weightT * 900) / 100) * 100,
        createdAt: now,
        assignedAt: t ? now : null,
        pickedUpAt: null,
        dispatchAt: null,
        outForDeliveryAt: null,
        deliveredAt: null,
        plannedEta: planned,
        eta: planned,
        penaltyMin: 0,
        delayReason: null,
        status: "Order Confirmed",
        lastNotifiedEta: null,
      };
      d.shipments.push(s);
      addEvent(d, id, "Shipment created", route.origin, now);
      if (t) {
        t.shipmentId = id;
        t.routeId = input.routeId;
        t.reversed = input.reversed;
        t.routeKm = route.totalKm;
        t.kmDone = 0;
        t.status = "idle";
        const drv = findDriver(d, t.driverId);
        if (drv) drv.status = "Available";
        addEvent(d, id, `Truck ${t.reg} assigned`, t.depot, now);
      } else {
        addAlert(d, { severity: "warning", kind: "Assignment missing", title: `${id} has no truck assigned`, detail: `${route.origin} → ${route.destination} · ${input.cargo}`, truckId: null, shipmentId: id });
      }
    });
    pushToast({ tone: "success", title: "Shipment created", body: id });
    return id;
  },

  assignTruckToShipment(shipmentId: string, truckId: string) {
    mutate((d) => {
      const s = findShipment(d, shipmentId);
      const t = findTruck(d, truckId);
      if (!s || !t || isOnRoad(t)) return;
      const prev = findTruck(d, s.truckId);
      if (prev && prev.id !== t.id) {
        prev.shipmentId = null;
        prev.routeId = null;
      }
      const route = resolveRoute(s.routeId, s.reversed);
      s.truckId = t.id;
      s.driverId = t.driverId;
      s.assignedAt = simNow(d);
      t.shipmentId = s.id;
      t.routeId = s.routeId;
      t.reversed = s.reversed;
      t.routeKm = route.totalKm;
      t.kmDone = 0;
      t.status = "idle";
      addEvent(d, s.id, `Truck ${t.reg} assigned`, t.depot);
      d.alerts.filter((a) => a.shipmentId === s.id && a.kind === "Assignment missing").forEach((a) => (a.state = "resolved"));
    });
    pushToast({ tone: "success", title: "Truck assigned to shipment" });
  },

  /** Move a shipment forward one step in its lifecycle. */
  advanceShipment(shipmentId: string) {
    const s0 = state && findShipment(state, shipmentId);
    if (!s0) return;
    if (s0.status === "In Transit" || s0.status === "Delayed") {
      const t = state && findTruck(state, s0.truckId);
      if (t) {
        mutate((d) => {
          const tt = findTruck(d, t.id)!;
          const ss = findShipment(d, shipmentId)!;
          tt.kmDone = Math.max(tt.kmDone, tt.routeKm - 25);
          const p = pointAlong(resolveRoute(ss.routeId, ss.reversed), tt.kmDone);
          tt.lat = p.pos[0];
          tt.lng = p.pos[1];
          if (tt.status !== "moving") tt.status = "moving";
          ss.penaltyMin = 0;
          recomputeEta(d, ss, tt, simNow(d));
          markOutForDelivery(d, ss);
        });
      }
      return;
    }
    if (s0.status === "Out for Delivery") {
      if (s0.truckId) actions.completeDelivery(s0.truckId);
      return;
    }
    mutate((d) => {
      const s = findShipment(d, shipmentId)!;
      const t = findTruck(d, s.truckId);
      const now = simNow(d);
      if (s.status === "Order Confirmed") {
        s.status = "Pickup Completed";
        s.pickedUpAt = now;
        addEvent(d, s.id, "Goods picked up", s.pickup, now);
        if (t) {
          const p = CITIES[s.pickup].pos;
          t.lat = p[0];
          t.lng = p[1];
        }
      } else if (s.status === "Pickup Completed") {
        if (!t) return;
        const route = resolveRoute(s.routeId, s.reversed);
        s.status = "In Transit";
        s.dispatchAt = now;
        s.plannedEta = now + (route.totalKm / PLANNED_KMPH) * H;
        s.eta = s.plannedEta;
        t.status = "moving";
        t.routeId = s.routeId;
        t.reversed = s.reversed;
        t.routeKm = route.totalKm;
        t.kmDone = 0.5;
        t.speed = 48;
        const p = pointAlong(route, t.kmDone);
        t.lat = p.pos[0];
        t.lng = p.pos[1];
        t.heading = p.heading;
        const drv = findDriver(d, t.driverId);
        if (drv) drv.status = "On trip";
        addEvent(d, s.id, "Shipment dispatched", s.pickup, now);
        queueNotification(d, s, "Shipment Dispatched");
      }
    });
  },

  sendManualNotification(shipmentId: string, kind: NotificationKind, channel: Channel) {
    mutate((d) => {
      const s = findShipment(d, shipmentId);
      if (s) queueNotification(d, s, kind, { trigger: "Manual", channel });
    });
  },

  retryNotification(id: string) {
    const n = state?.notifications.find((x) => x.id === id);
    if (!n) return;
    mutate((d) => {
      const t = d.notifications.find((x) => x.id === id);
      if (t) t.status = "Pending";
    });
    setTimeout(() => {
      mutate((d) => {
        const t = d.notifications.find((x) => x.id === id);
        if (t) t.status = "Sent";
      });
      pushToast({ tone: n.channel === "WhatsApp" ? "whatsapp" : "sms", title: `${n.channel} re-sent`, body: `${n.kind} · ${n.shipmentId} · simulated` });
    }, 1200);
  },

  setAlertState(id: string, st: Alert["state"]) {
    mutate((d) => {
      const a = d.alerts.find((x) => x.id === id);
      if (a) a.state = st;
    });
  },
  resolveAllInfo() {
    mutate((d) => {
      d.alerts.forEach((a) => {
        if (a.severity === "info" && a.state !== "resolved") a.state = "resolved";
      });
    });
  },
};

export function stopEngineForTests() {
  if (timer) clearInterval(timer);
}
