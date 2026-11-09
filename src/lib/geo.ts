import type { LatLng } from "./types";

export interface City {
  name: string;
  state: string;
  pos: LatLng;
}

const c = (name: string, state: string, lat: number, lng: number): City => ({ name, state, pos: [lat, lng] });

export const CITIES: Record<string, City> = Object.fromEntries(
  [
    c("Mumbai", "Maharashtra", 19.076, 72.8777),
    c("Bhiwandi", "Maharashtra", 19.2967, 73.0631),
    c("Vapi", "Gujarat", 20.3893, 72.9106),
    c("Surat", "Gujarat", 21.1702, 72.8311),
    c("Bharuch", "Gujarat", 21.7051, 72.9959),
    c("Vadodara", "Gujarat", 22.3072, 73.1812),
    c("Ahmedabad", "Gujarat", 23.0225, 72.5714),
    c("Himmatnagar", "Gujarat", 23.5986, 72.9661),
    c("Godhra", "Gujarat", 22.7788, 73.6143),
    c("Udaipur", "Rajasthan", 24.5854, 73.7125),
    c("Bhilwara", "Rajasthan", 25.3407, 74.6313),
    c("Ajmer", "Rajasthan", 26.4499, 74.6399),
    c("Kishangarh", "Rajasthan", 26.5904, 74.8541),
    c("Jaipur", "Rajasthan", 26.9124, 75.7873),
    c("Behror", "Rajasthan", 27.8886, 76.2869),
    c("Kota", "Rajasthan", 25.2138, 75.8648),
    c("Lalsot", "Rajasthan", 26.5566, 76.3372),
    c("Dausa", "Rajasthan", 26.8932, 76.337),
    c("Alwar", "Rajasthan", 27.553, 76.6346),
    c("Gurugram", "Haryana", 28.4595, 77.0266),
    c("Sohna", "Haryana", 28.2486, 77.0653),
    c("Delhi", "Delhi", 28.6139, 77.209),
    c("Panipat", "Haryana", 29.3909, 76.9635),
    c("Karnal", "Haryana", 29.6857, 76.9905),
    c("Ambala", "Haryana", 30.3782, 76.7767),
    c("Rajpura", "Punjab", 30.4844, 76.594),
    c("Ludhiana", "Punjab", 30.901, 75.8573),
    c("Jhabua", "Madhya Pradesh", 22.7676, 74.5909),
    c("Ratlam", "Madhya Pradesh", 23.3315, 75.0367),
    c("Indore", "Madhya Pradesh", 22.7196, 75.8577),
    c("Sendhwa", "Madhya Pradesh", 21.6857, 75.0952),
    c("Shirpur", "Maharashtra", 21.3489, 74.8797),
    c("Dhule", "Maharashtra", 20.9042, 74.7749),
    c("Malegaon", "Maharashtra", 20.5579, 74.5089),
    c("Nashik", "Maharashtra", 19.9975, 73.7898),
    c("Sangamner", "Maharashtra", 19.5678, 74.2115),
    c("Narayangaon", "Maharashtra", 19.1167, 73.9667),
    c("Pune", "Maharashtra", 18.5204, 73.8567),
    c("Lonavala", "Maharashtra", 18.7546, 73.4062),
    c("Satara", "Maharashtra", 17.6805, 74.0183),
    c("Kolhapur", "Maharashtra", 16.705, 74.2433),
    c("Belagavi", "Karnataka", 15.8497, 74.4977),
    c("Hubballi", "Karnataka", 15.3647, 75.124),
    c("Davanagere", "Karnataka", 14.4644, 75.9218),
    c("Chitradurga", "Karnataka", 14.2251, 76.398),
    c("Tumakuru", "Karnataka", 13.3379, 77.1173),
    c("Bengaluru", "Karnataka", 12.9716, 77.5946),
    c("Hosur", "Tamil Nadu", 12.7409, 77.8253),
    c("Krishnagiri", "Tamil Nadu", 12.5266, 78.2141),
    c("Vellore", "Tamil Nadu", 12.9165, 79.1325),
    c("Kanchipuram", "Tamil Nadu", 12.8342, 79.7036),
    c("Chennai", "Tamil Nadu", 13.0827, 80.2707),
    c("Salem", "Tamil Nadu", 11.6643, 78.146),
    c("Coimbatore", "Tamil Nadu", 11.0168, 76.9558),
    c("Palakkad", "Kerala", 10.7867, 76.6548),
    c("Thrissur", "Kerala", 10.5276, 76.2144),
    c("Kochi", "Kerala", 9.9312, 76.2673),
    c("Nellore", "Andhra Pradesh", 14.4426, 79.9865),
    c("Ongole", "Andhra Pradesh", 15.5057, 80.0499),
    c("Vijayawada", "Andhra Pradesh", 16.5062, 80.648),
    c("Eluru", "Andhra Pradesh", 16.7107, 81.0952),
    c("Rajahmundry", "Andhra Pradesh", 17.0005, 81.804),
    c("Anakapalle", "Andhra Pradesh", 17.6913, 83.0039),
    c("Visakhapatnam", "Andhra Pradesh", 17.6868, 83.2185),
    c("Suryapet", "Telangana", 17.1405, 79.6236),
    c("Hyderabad", "Telangana", 17.385, 78.4867),
    c("Zaheerabad", "Telangana", 17.6815, 77.6074),
    c("Solapur", "Maharashtra", 17.6599, 75.9064),
    c("Indapur", "Maharashtra", 18.1167, 75.0333),
    c("Aurangabad", "Maharashtra", 19.8762, 75.3433),
    c("Jalna", "Maharashtra", 19.8347, 75.8816),
    c("Mehkar", "Maharashtra", 20.15, 76.57),
    c("Karanja", "Maharashtra", 20.4833, 77.4833),
    c("Wardha", "Maharashtra", 20.7453, 78.6022),
    c("Nagpur", "Maharashtra", 21.1458, 79.0882),
    c("Agra", "Uttar Pradesh", 27.1767, 78.0081),
    c("Mathura", "Uttar Pradesh", 27.4924, 77.6737),
    c("Etawah", "Uttar Pradesh", 26.7856, 79.0158),
    c("Kannauj", "Uttar Pradesh", 27.0514, 79.9137),
    c("Lucknow", "Uttar Pradesh", 26.8467, 80.9462),
    c("Kanpur", "Uttar Pradesh", 26.4499, 80.3319),
    c("Prayagraj", "Uttar Pradesh", 25.4358, 81.8463),
    c("Varanasi", "Uttar Pradesh", 25.3176, 82.9739),
    c("Sasaram", "Bihar", 24.9497, 84.0315),
    c("Dhanbad", "Jharkhand", 23.7957, 86.4304),
    c("Asansol", "West Bengal", 23.6739, 86.9524),
    c("Durgapur", "West Bengal", 23.5204, 87.3119),
    c("Kolkata", "West Bengal", 22.5726, 88.3639),
    c("Kharagpur", "West Bengal", 22.346, 87.232),
    c("Balasore", "Odisha", 21.4934, 86.9135),
    c("Bhadrak", "Odisha", 21.0574, 86.4963),
    c("Cuttack", "Odisha", 20.4625, 85.883),
    c("Bhubaneswar", "Odisha", 20.2961, 85.8245),
    c("Noida", "Uttar Pradesh", 28.5355, 77.391),
  ].map((x) => [x.name, x]),
);

export type Region = "West" | "North" | "South" | "East";

export interface RouteDef {
  id: string;
  highway: string;
  region: Region;
  stops: string[]; // forward direction
}

export const ROUTES: RouteDef[] = [
  { id: "R01", highway: "NH 48", region: "West", stops: ["Mumbai", "Vapi", "Surat", "Bharuch", "Vadodara", "Ahmedabad", "Himmatnagar", "Udaipur", "Bhilwara", "Ajmer", "Jaipur", "Behror", "Gurugram", "Delhi"] },
  { id: "R02", highway: "NH 48", region: "South", stops: ["Pune", "Satara", "Kolhapur", "Belagavi", "Hubballi", "Davanagere", "Chitradurga", "Tumakuru", "Bengaluru"] },
  { id: "R03", highway: "NH 16 / NH 65", region: "South", stops: ["Chennai", "Nellore", "Ongole", "Vijayawada", "Suryapet", "Hyderabad"] },
  { id: "R04", highway: "NH 48", region: "West", stops: ["Ahmedabad", "Himmatnagar", "Udaipur", "Bhilwara", "Ajmer", "Kishangarh", "Jaipur"] },
  { id: "R05", highway: "NH 19", region: "East", stops: ["Delhi", "Agra", "Etawah", "Kanpur", "Prayagraj", "Varanasi", "Sasaram", "Dhanbad", "Asansol", "Durgapur", "Kolkata"] },
  { id: "R06", highway: "Samruddhi Expwy", region: "West", stops: ["Mumbai", "Nashik", "Aurangabad", "Jalna", "Mehkar", "Karanja", "Wardha", "Nagpur"] },
  { id: "R07", highway: "NH 48", region: "South", stops: ["Bengaluru", "Hosur", "Krishnagiri", "Vellore", "Kanchipuram", "Chennai"] },
  { id: "R08", highway: "NH 65 / NH 48", region: "South", stops: ["Hyderabad", "Zaheerabad", "Solapur", "Indapur", "Pune", "Lonavala", "Mumbai"] },
  { id: "R09", highway: "NH 60 / NH 52", region: "West", stops: ["Pune", "Narayangaon", "Sangamner", "Nashik", "Malegaon", "Dhule", "Shirpur", "Sendhwa", "Indore"] },
  { id: "R10", highway: "Delhi–Mumbai Expwy", region: "North", stops: ["Surat", "Bharuch", "Vadodara", "Godhra", "Jhabua", "Ratlam", "Kota", "Lalsot", "Dausa", "Alwar", "Sohna", "Delhi"] },
  { id: "R11", highway: "NH 44", region: "North", stops: ["Delhi", "Panipat", "Karnal", "Ambala", "Rajpura", "Ludhiana"] },
  { id: "R12", highway: "NH 16", region: "East", stops: ["Kolkata", "Kharagpur", "Balasore", "Bhadrak", "Cuttack", "Bhubaneswar"] },
  { id: "R13", highway: "NH 544", region: "South", stops: ["Kochi", "Thrissur", "Palakkad", "Coimbatore", "Salem", "Krishnagiri", "Hosur", "Bengaluru"] },
  { id: "R14", highway: "NH 16", region: "East", stops: ["Visakhapatnam", "Anakapalle", "Rajahmundry", "Eluru", "Vijayawada"] },
  { id: "R15", highway: "Agra–Lucknow Expwy", region: "North", stops: ["Lucknow", "Kannauj", "Etawah", "Agra", "Mathura", "Noida", "Delhi"] },
];

export const ROUTE_BY_ID: Record<string, RouteDef> = Object.fromEntries(ROUTES.map((r) => [r.id, r]));

/** Road distance is longer than the straight segments between waypoints. */
const ROAD_FACTOR = 1.16;
/** Planned average trip speed incl. rest, tolls and loading (km/h). */
export const PLANNED_KMPH = 30;

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function bearing(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(b[1] - a[1])) * Math.cos(toRad(b[0]));
  const x =
    Math.cos(toRad(a[0])) * Math.sin(toRad(b[0])) -
    Math.sin(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.cos(toRad(b[1] - a[1]));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export interface ResolvedRoute {
  def: RouteDef;
  stops: string[];
  points: LatLng[];
  cum: number[]; // cumulative road km at each point
  totalKm: number;
  origin: string;
  destination: string;
}

const cache = new Map<string, ResolvedRoute>();

export function resolveRoute(routeId: string, reversed: boolean): ResolvedRoute {
  const key = `${routeId}:${reversed ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const def = ROUTE_BY_ID[routeId];
  const stops = reversed ? [...def.stops].reverse() : [...def.stops];
  const points = stops.map((s) => CITIES[s].pos);
  const cum = [0];
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + haversineKm(points[i - 1], points[i]) * ROAD_FACTOR);
  const r: ResolvedRoute = {
    def,
    stops,
    points,
    cum,
    totalKm: cum[cum.length - 1],
    origin: stops[0],
    destination: stops[stops.length - 1],
  };
  cache.set(key, r);
  return r;
}

export interface RoutePoint {
  pos: LatLng;
  heading: number;
  segment: number; // index of the stop we last passed
}

export function pointAlong(route: ResolvedRoute, km: number): RoutePoint {
  const d = Math.max(0, Math.min(km, route.totalKm));
  let i = 1;
  while (i < route.cum.length - 1 && route.cum[i] < d) i++;
  const a = route.points[i - 1];
  const b = route.points[i];
  const segLen = route.cum[i] - route.cum[i - 1] || 1;
  const t = (d - route.cum[i - 1]) / segLen;
  return {
    pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
    heading: bearing(a, b),
    segment: i - 1,
  };
}

/** Points of the route between two distances (for drawing travelled / remaining legs). */
export function slicePath(route: ResolvedRoute, fromKm: number, toKm: number): LatLng[] {
  const out: LatLng[] = [pointAlong(route, fromKm).pos];
  for (let i = 0; i < route.cum.length; i++) {
    if (route.cum[i] > fromKm && route.cum[i] < toKm) out.push(route.points[i]);
  }
  out.push(pointAlong(route, toKm).pos);
  return out;
}

/** Human description of where a truck is: "near Udaipur, Rajasthan" or "between A and B". */
export function describeLocation(route: ResolvedRoute, km: number): { label: string; near: string; next: string } {
  const p = pointAlong(route, km);
  let best = route.stops[0];
  let bestD = Infinity;
  for (const s of route.stops) {
    const d = haversineKm(p.pos, CITIES[s].pos);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  const next = route.stops[Math.min(p.segment + 1, route.stops.length - 1)];
  const city = CITIES[best];
  if (bestD < 8) return { label: `${city.name}, ${city.state}`, near: city.name, next };
  if (bestD < 70) return { label: `near ${city.name}, ${city.state}`, near: city.name, next };
  const prev = route.stops[p.segment];
  return { label: `between ${prev} and ${next}`, near: prev, next };
}

export function nearestCity(pos: LatLng): City {
  let best = CITIES.Mumbai;
  let bestD = Infinity;
  for (const city of Object.values(CITIES)) {
    const d = haversineKm(pos, city.pos);
    if (d < bestD) {
      bestD = d;
      best = city;
    }
  }
  return best;
}

export function regionOfCity(name: string): Region {
  const st = CITIES[name]?.state ?? "";
  if (["Maharashtra", "Gujarat", "Madhya Pradesh"].includes(st)) return "West";
  if (["Rajasthan", "Delhi", "Haryana", "Punjab", "Uttar Pradesh"].includes(st)) return "North";
  if (["West Bengal", "Odisha", "Bihar", "Jharkhand"].includes(st)) return "East";
  return "South";
}

/** Lanes a new shipment can be booked on (both directions of every route). */
export const LANES = ROUTES.flatMap((r) => [
  { key: `${r.id}:0`, routeId: r.id, reversed: false, label: `${r.stops[0]} → ${r.stops[r.stops.length - 1]}` },
  { key: `${r.id}:1`, routeId: r.id, reversed: true, label: `${r.stops[r.stops.length - 1]} → ${r.stops[0]}` },
]);

/** Simplified outline of India (lat, lng), used as an offline basemap when map tiles can't load. */
export const INDIA_OUTLINE: LatLng[] = [
  [23.6, 68.2], [24.3, 68.8], [24.6, 70.0], [25.4, 70.7], [26.0, 70.2], [26.6, 70.1], [27.3, 70.0], [27.9, 70.7], [28.0, 71.9],
  [28.9, 72.9], [29.6, 73.4], [30.1, 73.9], [30.9, 74.5], [31.6, 74.6], [32.1, 74.9], [32.5, 74.6], [32.9, 74.3], [33.4, 74.0],
  [34.0, 73.9], [34.6, 73.8], [35.1, 74.2], [35.6, 74.5], [36.4, 74.6], [37.0, 75.0], [36.9, 76.0], [36.3, 77.2], [35.7, 77.9],
  [35.5, 79.0], [35.3, 80.3], [34.4, 79.9], [33.4, 79.4], [32.6, 79.3], [32.2, 78.6], [31.8, 78.8], [31.0, 79.2], [30.4, 80.0],
  [30.0, 80.4], [28.9, 80.1], [28.6, 80.6], [28.0, 81.5], [27.4, 83.3], [27.1, 84.6], [26.6, 85.6], [26.4, 86.8], [26.4, 88.1],
  [27.2, 88.0], [28.1, 88.7], [27.6, 88.9], [26.9, 89.0], [26.8, 89.8], [26.7, 91.5], [26.8, 92.1], [27.6, 92.0], [27.9, 91.6],
  [28.2, 93.0], [28.7, 94.0], [29.3, 95.4], [29.0, 96.1], [28.2, 97.3], [27.2, 97.0], [26.6, 96.1], [26.0, 95.2], [25.0, 94.6],
  [24.0, 94.2], [23.2, 93.4], [22.0, 93.1], [21.9, 92.6], [22.9, 92.3], [23.7, 91.9], [24.1, 91.8], [24.3, 92.2], [25.0, 92.4],
  [25.2, 92.0], [25.2, 90.0], [25.9, 89.9], [26.2, 89.1], [25.3, 88.5], [24.3, 88.7], [23.2, 88.9], [22.1, 89.0], [21.6, 88.6],
  [21.6, 87.5], [20.7, 86.9], [19.8, 85.6], [19.2, 84.8], [18.2, 83.9], [17.6, 83.3], [16.9, 82.3], [16.3, 81.6], [15.8, 80.9],
  [15.2, 80.1], [14.0, 80.2], [13.1, 80.3], [12.0, 79.9], [11.0, 79.8], [10.3, 79.8], [9.3, 79.2], [8.9, 78.2], [8.08, 77.55],
  [8.6, 76.9], [9.5, 76.3], [10.5, 76.0], [11.5, 75.6], [12.4, 75.0], [13.4, 74.7], [14.5, 74.4], [15.4, 73.8], [16.5, 73.3],
  [17.6, 73.2], [18.9, 72.8], [19.9, 72.7], [20.7, 72.9], [21.6, 72.6], [22.2, 72.5], [21.7, 72.2], [21.0, 71.5], [20.8, 70.6],
  [21.5, 69.7], [22.3, 69.1], [22.8, 69.7], [23.0, 68.6],
];

export const BASEMAP_CITIES = ["Delhi", "Mumbai", "Kolkata", "Chennai", "Bengaluru", "Hyderabad", "Ahmedabad", "Pune", "Jaipur", "Nagpur", "Lucknow", "Indore", "Kochi", "Visakhapatnam", "Bhubaneswar", "Ludhiana", "Surat", "Varanasi"];
