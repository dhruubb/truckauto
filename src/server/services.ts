import { resolveRoute } from "@/lib/geo";
import { delayMinutes, findCustomer, findDriver, findTruck, isOnRoad, truckLocation } from "@/lib/selectors";
import { publicTracking } from "@/lib/tracking";
import type { ShipmentStatus, TruckStatus } from "@/lib/types";
import { getSnapshot } from "./repository";

export const fleetService = {
  listTrucks(filter?: { status?: TruckStatus | "onroad" }) {
    const s = getSnapshot();
    return s.trucks
      .filter((t) => !filter?.status || (filter.status === "onroad" ? isOnRoad(t) : t.status === filter.status))
      .map((t) => {
        const r = t.routeId ? resolveRoute(t.routeId, t.reversed) : null;
        const d = findDriver(s, t.driverId);
        return {
          id: t.id,
          registration: t.reg,
          model: t.model,
          type: t.type,
          capacityTonnes: t.capacityT,
          status: t.status,
          position: { lat: t.lat, lng: t.lng, speedKmph: t.speed, heading: t.heading, at: new Date(t.lastGpsAt).toISOString() },
          location: truckLocation(t),
          origin: r && isOnRoad(t) ? r.origin : null,
          destination: r && isOnRoad(t) ? r.destination : null,
          driver: d ? { id: d.id, name: d.name } : null,
          shipmentId: t.shipmentId,
          simulated: true,
        };
      });
  },
  summary() {
    const s = getSnapshot();
    return {
      total: s.trucks.length,
      onRoad: s.trucks.filter(isOnRoad).length,
      idle: s.trucks.filter((t) => t.status === "idle" || t.status === "maintenance").length,
      delayedShipments: s.shipments.filter((x) => x.status === "Delayed").length,
      generatedAt: new Date().toISOString(),
      simulated: true,
    };
  },
};

export const shipmentService = {
  list(filter?: { status?: ShipmentStatus }) {
    const s = getSnapshot();
    return s.shipments
      .filter((x) => !filter?.status || x.status === filter.status)
      .map((x) => ({
        id: x.id,
        status: x.status,
        customer: findCustomer(s, x.customerId)?.company ?? null,
        pickup: x.pickup,
        delivery: x.delivery,
        truck: findTruck(s, x.truckId)?.reg ?? null,
        cargo: x.cargo,
        weightTonnes: x.weightT,
        dispatchedAt: x.dispatchAt ? new Date(x.dispatchAt).toISOString() : null,
        eta: new Date(x.eta).toISOString(),
        delayMinutes: Math.max(0, delayMinutes(x)),
      }));
  },
  get(id: string) {
    return shipmentService.list().find((x) => x.id === id) ?? null;
  },
};

export const trackingService = {
  /** Customer-safe view. Never exposes other shipments or driver contact details. */
  get(id: string) {
    const p = publicTracking(getSnapshot(), id);
    if (!p) return null;
    return { ...p, eta: new Date(p.eta).toISOString(), simulated: true };
  },
};
