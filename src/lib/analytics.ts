// Mock analytics history. Deterministic so charts look the same on every run,
// and filterable by period and region.

import { ROUTES, regionOfCity, resolveRoute, type Region } from "./geo";
import { mulberry32 } from "./seed";
import type { AppState } from "./types";

export type Period = 3 | 6 | 12;
export type RegionFilter = "All" | Region;

const REGION_SHARE: Record<Region, number> = { West: 0.38, North: 0.24, South: 0.26, East: 0.12 };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface MonthRow {
  label: string;
  deliveries: number;
  revenue: number;
  onTime: number;
  avgHours: number;
  utilization: number;
  delayed: number;
}

export function monthlyHistory(now: number, region: RegionFilter): MonthRow[] {
  const rnd = mulberry32(777);
  const end = new Date(now);
  const rows: MonthRow[] = [];
  for (let i = 23; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth() - 1 - i, 1);
    const season = 1 + 0.07 * Math.sin(((d.getMonth() + 2) / 12) * Math.PI * 2); // festive-season peak
    const growth = 1 + (23 - i) * 0.011;
    const total = Math.round(760 * season * growth + rnd() * 40);
    const share = region === "All" ? 1 : REGION_SHARE[region] * (0.94 + rnd() * 0.12);
    const deliveries = Math.round(total * share);
    const onTime = Math.round((88.5 + (23 - i) * 0.17 + rnd() * 2.2 - (region === "East" ? 2.4 : region === "North" ? 1.1 : 0)) * 10) / 10;
    rows.push({
      label: `${MONTHS[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`,
      deliveries,
      revenue: Math.round(deliveries * (71000 + rnd() * 6000)),
      onTime: Math.min(97.5, onTime),
      avgHours: Math.round((41.5 - (23 - i) * 0.14 + rnd() * 1.6) * 10) / 10,
      utilization: Math.round(77 + (23 - i) * 0.35 + rnd() * 3),
      delayed: Math.round(deliveries * (1 - Math.min(97.5, onTime) / 100)),
    });
  }
  return rows;
}

export function citiesBreakdown(period: Period, region: RegionFilter) {
  const rnd = mulberry32(31);
  const weights: Record<string, number> = {
    Delhi: 1.0, Mumbai: 0.96, Bengaluru: 0.82, Chennai: 0.7, Hyderabad: 0.68, Pune: 0.62, Ahmedabad: 0.58, Kolkata: 0.55, Jaipur: 0.41, Nagpur: 0.38, Indore: 0.33, Surat: 0.31, Ludhiana: 0.24, Bhubaneswar: 0.2, Lucknow: 0.19, Kochi: 0.16, Vijayawada: 0.15, Cuttack: 0.13, Durgapur: 0.11, Dhanbad: 0.1, Asansol: 0.08, Kharagpur: 0.07, Balasore: 0.05,
  };
  return Object.entries(weights)
    .filter(([city]) => region === "All" || regionOfCity(city) === region)
    .map(([city, w]) => ({ city, value: Math.round(w * 92 * period * (0.92 + rnd() * 0.16)) }))
    .sort((a, b) => b.value - a.value);
}

export function delayReasons(period: Period, region: RegionFilter) {
  const scale = period * (region === "All" ? 1 : REGION_SHARE[region as Region]);
  return [
    { reason: "Traffic congestion", value: Math.round(31 * scale) },
    { reason: "Loading / unloading wait", value: Math.round(22 * scale) },
    { reason: "Checkpost & documentation", value: Math.round(14 * scale) },
    { reason: "Weather", value: Math.round((region === "East" || region === "All" ? 11 : 6) * scale) },
    { reason: "Vehicle breakdown", value: Math.round(8 * scale) },
    { reason: "Driver rest overrun", value: Math.round(5 * scale) },
  ];
}

export function laneDelays(region: RegionFilter) {
  const rnd = mulberry32(99);
  return ROUTES.filter((r) => region === "All" || r.region === region)
    .map((r) => {
      const rr = resolveRoute(r.id, false);
      return { lane: `${rr.origin} – ${rr.destination}`, hours: Math.round((0.4 + rnd() * 2.6 + rr.totalKm / 1400) * 10) / 10 };
    })
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 7);
}

export function truckPerformance(s: AppState, period: Period, region: RegionFilter) {
  const rnd = mulberry32(4242);
  return s.trucks
    .filter((t) => t.routeId)
    .filter((t) => region === "All" || resolveRoute(t.routeId!, t.reversed).def.region === region)
    .map((t) => {
      const trips = Math.round((period * 2.6 + rnd() * period * 1.4) * 10) / 10;
      const km = Math.round(trips * (t.routeKm || 900) * (0.9 + rnd() * 0.2));
      const onTime = Math.round((86 + rnd() * 13) * 10) / 10;
      return { truck: t, trips: Math.round(trips), km, onTime, revenue: Math.round(km * 62), utilization: Math.round(72 + rnd() * 24) };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
}
