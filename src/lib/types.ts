// Core domain model for the Shree Sai Trucks demo.
// Mirrors prisma/schema.prisma so the in-browser demo store can be swapped
// for a real PostgreSQL-backed API without changing UI code.

export type LatLng = [number, number];

export type TruckStatus =
  | "moving" // on the road, on schedule
  | "delayed" // on the road, behind schedule
  | "attention" // on the road, needs ops attention (stationary, deviation)
  | "idle" // parked at a depot, no active trip
  | "maintenance" // parked for service
  | "arrived"; // reached destination, unloading

export type ShipmentStatus =
  | "Order Confirmed"
  | "Pickup Completed"
  | "In Transit"
  | "Delayed"
  | "Out for Delivery"
  | "Delivered";

export type DriverStatus = "On trip" | "Available" | "Resting" | "Off duty";

export interface Truck {
  id: string; // e.g. TRK-001
  reg: string; // MH04AB1234
  model: string;
  type: string;
  capacityT: number;
  year: number;
  depot: string; // home city
  driverId: string | null;
  status: TruckStatus;
  shipmentId: string | null;
  routeId: string | null;
  reversed: boolean;
  kmDone: number;
  routeKm: number;
  lat: number;
  lng: number;
  heading: number;
  speed: number; // km/h
  stopTicks: number; // simulated halt remaining
  haltedSince: number | null;
  fuelPct: number;
  odometer: number;
  lastGpsAt: number;
  nextServiceKm: number;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  license: string;
  experienceYrs: number;
  rating: number;
  totalDeliveries: number;
  status: DriverStatus;
  truckId: string | null;
  homeCity: string;
  languages: string[];
  joinedYear: number;
}

export interface Customer {
  id: string;
  contact: string;
  company: string;
  phone: string;
  email: string;
  city: string;
  industry: string;
  since: number;
}

export interface Shipment {
  id: string; // SST-2026-001
  customerId: string;
  pickup: string;
  delivery: string;
  routeId: string;
  reversed: boolean;
  truckId: string | null;
  driverId: string | null;
  cargo: string;
  weightT: number;
  freightInr: number;
  createdAt: number;
  assignedAt: number | null;
  pickedUpAt: number | null;
  dispatchAt: number | null;
  outForDeliveryAt: number | null;
  deliveredAt: number | null;
  plannedEta: number;
  eta: number;
  penaltyMin: number; // time lost to simulated incidents
  delayReason: string | null;
  status: ShipmentStatus;
  lastNotifiedEta: number | null;
}

export type Channel = "WhatsApp" | "SMS";
export type NotificationKind =
  | "Shipment Dispatched"
  | "In Transit"
  | "Delivery Delay"
  | "ETA Updated"
  | "Out for Delivery"
  | "Delivered";
export type NotificationStatus = "Sent" | "Pending" | "Failed";

export interface CustomerNotification {
  id: string;
  shipmentId: string;
  customerId: string;
  channel: Channel;
  kind: NotificationKind;
  message: string;
  status: NotificationStatus;
  trigger: "Automatic" | "Manual";
  createdAt: number;
}

export type AlertSeverity = "critical" | "warning" | "info";
export type AlertState = "open" | "acknowledged" | "resolved";

export interface Alert {
  id: string;
  severity: AlertSeverity;
  kind: string;
  title: string;
  detail: string;
  truckId: string | null;
  shipmentId: string | null;
  createdAt: number;
  state: AlertState;
}

export interface DeliveryEvent {
  id: string;
  shipmentId: string;
  at: number;
  label: string;
  location: string;
}

export interface GpsPing {
  lat: number;
  lng: number;
  speed: number;
  at: number;
}

export interface Settings {
  companyName: string;
  supportPhone: string;
  gstin: string;
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  autoDispatch: boolean;
  autoInTransit: boolean;
  autoDelay: boolean;
  autoOutForDelivery: boolean;
  autoDelivered: boolean;
  delayThresholdMin: number;
  etaChangeThresholdMin: number;
  stationaryAlertMin: number;
  mapStyle: "light" | "streets";
}

export interface SimState {
  running: boolean;
  speed: number; // time multiplier
  offsetMs: number; // simulated clock offset vs real clock
  ticks: number;
}

export interface TourState {
  open: boolean;
  done: Record<string, boolean>;
}

export interface Counters {
  deliveredThisMonth: number;
  notification: number;
  alert: number;
  event: number;
  shipment: number;
}

export interface AppState {
  schema: number;
  rev: number;
  seededAt: number;
  trucks: Truck[];
  drivers: Driver[];
  customers: Customer[];
  shipments: Shipment[];
  notifications: CustomerNotification[];
  alerts: Alert[];
  events: DeliveryEvent[];
  gps: Record<string, GpsPing[]>;
  settings: Settings;
  sim: SimState;
  tour: TourState;
  counters: Counters;
  heroShipmentId: string;
}
