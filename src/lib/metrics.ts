import { isOnRoad, delayMinutes } from "./selectors";
import type { AppState } from "./types";

export function fleetCounts(s: AppState) {
  const by = { moving: 0, delayed: 0, attention: 0, idle: 0, maintenance: 0, arrived: 0 };
  for (const t of s.trucks) by[t.status]++;
  const onRoad = s.trucks.filter(isOnRoad).length;
  const delayedShipments = s.shipments.filter((x) => x.status === "Delayed").length;
  const active = s.shipments.filter((x) => x.status !== "Delivered").length;
  const inMotion = s.shipments.filter((x) => x.status === "In Transit" || x.status === "Delayed" || x.status === "Out for Delivery").length;
  const utilization = Math.round(((onRoad + by.arrived) / s.trucks.length) * 100);
  return {
    total: s.trucks.length,
    onRoad,
    idle: by.idle + by.maintenance,
    arrived: by.arrived,
    by,
    delayedShipments,
    active,
    inMotion,
    utilization,
  };
}

export function onTimePct(s: AppState) {
  const done = s.shipments.filter((x) => x.status === "Delivered");
  if (!done.length) return 100;
  const onTime = done.filter((x) => (x.deliveredAt ?? 0) - x.plannedEta <= 60 * 60_000).length;
  return Math.round((onTime / done.length) * 1000) / 10;
}

export function worstDelays(s: AppState) {
  return s.shipments
    .filter((x) => x.status === "Delayed")
    .map((x) => ({ shipment: x, late: delayMinutes(x) }))
    .sort((a, b) => b.late - a.late);
}
