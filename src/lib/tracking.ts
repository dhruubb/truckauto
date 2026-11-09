// Customer-safe projection of a shipment. The tracking portal and the public
// API only ever see this shape: no other customers, no fleet data, no driver
// phone numbers or internal notes.

import { CITIES, describeLocation, resolveRoute } from "./geo";
import { delayMinutes, findCustomer, findDriver, findTruck, isOnRoad } from "./selectors";
import { timelineSteps } from "./timeline";
import type { AppState, LatLng, ShipmentStatus } from "./types";

export interface PublicTracking {
  id: string;
  status: ShipmentStatus;
  customerFirstName: string;
  pickup: string;
  pickupState: string;
  delivery: string;
  deliveryState: string;
  cargo: string;
  weightT: number;
  eta: number;
  deliveredAt: number | null;
  dispatchAt: number | null;
  delayed: boolean;
  delayMin: number;
  delayReason: string | null;
  currentLocation: string | null;
  position: LatLng | null;
  routeId: string;
  reversed: boolean;
  kmDone: number;
  totalKm: number;
  remainingKm: number;
  progressPct: number;
  driverName: string | null;
  vehicle: string | null;
  lastUpdate: number | null;
  timeline: { key: string; title: string; at: number | null; done: boolean; current: boolean; note?: string }[];
  supportPhone: string;
  company: string;
}

export function normaliseTrackingId(raw: string): string {
  const v = raw.trim().toUpperCase().replace(/\s+/g, "");
  const m = v.match(/^(?:SST-?)?(\d{4})-?(\d{1,3})$/);
  if (m) return `SST-${m[1]}-${m[2].padStart(3, "0")}`;
  const n = v.match(/^(\d{1,3})$/);
  if (n) return `SST-2026-${n[1].padStart(3, "0")}`;
  return v;
}

export function publicTracking(s: AppState, rawId: string): PublicTracking | null {
  const id = normaliseTrackingId(rawId);
  const x = s.shipments.find((v) => v.id === id);
  if (!x) return null;
  const route = resolveRoute(x.routeId, x.reversed);
  const t = findTruck(s, x.truckId);
  const onTrip = !!t && t.shipmentId === x.id;
  const moving = onTrip && isOnRoad(t!);
  const kmDone = x.status === "Delivered" ? route.totalKm : moving ? t!.kmDone : 0;
  const driver = findDriver(s, x.driverId);
  const customer = findCustomer(s, x.customerId);
  const plate = t ? t.reg.replace(/^([A-Z]{2})(\d{2})([A-Z]+)(\d{4})$/, "$1 $2 •• $4") : null;
  const location = moving ? describeLocation(route, kmDone).label : x.status === "Delivered" ? `${x.delivery}, ${CITIES[x.delivery].state}` : null;
  return {
    id: x.id,
    status: x.status,
    customerFirstName: customer?.contact.split(" ")[0] ?? "there",
    pickup: x.pickup,
    pickupState: CITIES[x.pickup].state,
    delivery: x.delivery,
    deliveryState: CITIES[x.delivery].state,
    cargo: x.cargo,
    weightT: x.weightT,
    eta: x.eta,
    deliveredAt: x.deliveredAt,
    dispatchAt: x.dispatchAt,
    delayed: x.status === "Delayed",
    delayMin: Math.max(0, delayMinutes(x)),
    delayReason: x.status === "Delayed" ? x.delayReason : null,
    currentLocation: location,
    position: moving ? [t!.lat, t!.lng] : null,
    routeId: x.routeId,
    reversed: x.reversed,
    kmDone,
    totalKm: route.totalKm,
    remainingKm: Math.max(0, route.totalKm - kmDone),
    progressPct: Math.round((kmDone / route.totalKm) * 100),
    driverName: driver ? `${driver.name.split(" ")[0]} ${driver.name.split(" ")[1]?.[0] ?? ""}.` : null,
    vehicle: plate,
    lastUpdate: moving ? t!.lastGpsAt : null,
    timeline: timelineSteps(x, location, true),
    supportPhone: s.settings.supportPhone,
    company: s.settings.companyName,
  };
}
