// Pure read helpers shared by the browser store and the server API routes.

import { CITIES, describeLocation, resolveRoute } from "./geo";
import type { AppState, Shipment, ShipmentClient, Truck, TruckStatus } from "./types";

export function findTruck(s: AppState, id: string | null | undefined) {
  return id ? s.trucks.find((t) => t.id === id) : undefined;
}
export function findShipment(s: AppState, id: string | null | undefined) {
  return id ? s.shipments.find((x) => x.id === id) : undefined;
}
export function findDriver(s: AppState, id: string | null | undefined) {
  return id ? s.drivers.find((x) => x.id === id) : undefined;
}
export function findCustomer(s: AppState, id: string | null | undefined) {
  return id ? s.customers.find((x) => x.id === id) : undefined;
}

export function heroOf(s: AppState) {
  const shipment = findShipment(s, s.heroShipmentId);
  const truck = shipment ? findTruck(s, shipment.truckId) : undefined;
  return { shipment, truck };
}

export const ON_ROAD: TruckStatus[] = ["moving", "delayed", "attention"];
export const isOnRoad = (t: Truck) => ON_ROAD.includes(t.status);

export function delayMinutes(s: Shipment): number {
  return Math.round((s.eta - s.plannedEta) / 60_000);
}

export function truckLocation(t: Truck): string {
  if (t.routeId && (isOnRoad(t) || t.status === "arrived")) {
    const r = resolveRoute(t.routeId, t.reversed);
    if (t.status === "arrived") return `${r.destination}, ${CITIES[r.destination].state}`;
    return describeLocation(r, t.kmDone).label;
  }
  return `${t.depot} depot, ${CITIES[t.depot]?.state ?? ""}`;
}

/** Every client on a trip: the primary client first, then any part-load clients. */
export function shipmentClients(s: Shipment): ShipmentClient[] {
  const primaryWeight = Math.round((s.weightT - (s.extraClients ?? []).reduce((n, c) => n + c.weightT, 0)) * 10) / 10;
  return [{ customerId: s.customerId, cargo: s.cargo, weightT: primaryWeight }, ...(s.extraClients ?? [])];
}
