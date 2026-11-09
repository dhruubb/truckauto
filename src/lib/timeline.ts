import type { Shipment } from "./types";

export interface TimelineStep {
  key: string;
  title: string;
  at: number | null;
  done: boolean;
  current: boolean;
  note?: string;
}

export function timelineSteps(s: Shipment, currentLocation: string | null, publicMode = false): TimelineStep[] {
  const inMotion = s.status === "In Transit" || s.status === "Delayed";
  const raw: Omit<TimelineStep, "current">[] = [
    { key: "created", title: publicMode ? "Order confirmed" : "Shipment created", at: s.createdAt, done: true },
    { key: "assigned", title: "Truck assigned", at: s.assignedAt, done: s.assignedAt != null },
    { key: "picked", title: "Goods picked up", at: s.pickedUpAt, done: s.pickedUpAt != null },
    { key: "dispatched", title: "Shipment dispatched", at: s.dispatchAt, done: s.dispatchAt != null },
    {
      key: "transit",
      title: s.status === "Delayed" ? "In transit · delayed" : "In transit",
      at: s.dispatchAt ? s.dispatchAt + 45 * 60_000 : null,
      done: s.status === "Out for Delivery" || s.status === "Delivered",
      note: inMotion && currentLocation ? `Now ${currentLocation}` : undefined,
    },
    { key: "out", title: "Out for delivery", at: s.outForDeliveryAt, done: s.outForDeliveryAt != null && (s.status === "Out for Delivery" || s.status === "Delivered") },
    { key: "delivered", title: "Delivered", at: s.deliveredAt, done: s.status === "Delivered" },
  ];
  const firstOpen = raw.findIndex((r) => !r.done);
  return raw.map((r, i) => ({ ...r, current: i === firstOpen }));
}
