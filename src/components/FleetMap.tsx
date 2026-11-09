"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { BASEMAP_CITIES, CITIES, INDIA_OUTLINE, ROUTES, resolveRoute, slicePath, type ResolvedRoute } from "@/lib/geo";
import { fmtPlate } from "@/lib/format";
import type { Truck, TruckStatus } from "@/lib/types";

type L = typeof Leaflet;

const INDIA: [[number, number], [number, number]] = [
  [8.2, 68.4],
  [31.2, 89.6],
];

const TRUCK_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6.5A1.5 1.5 0 0 1 3.5 5H14v11H2V6.5Z"/><path d="M14 9h4.2a1 1 0 0 1 .8.4l2.7 3.6a1 1 0 0 1 .2.6V16h-7.9"/><circle cx="6.5" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/></svg>';

const STATUS_COLOR: Record<TruckStatus, string> = {
  moving: "#16a34a",
  delayed: "#e8830c",
  attention: "#dc2e2e",
  idle: "#8a94a6",
  maintenance: "#8a94a6",
  arrived: "#5068a8",
};

const TILES = {
  light: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
  },
  streets: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: "abc",
  },
};

export interface FleetMapProps {
  trucks: Truck[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  showLanes?: boolean;
  follow?: boolean;
  tiles?: "light" | "streets";
  compact?: boolean;
  /** customer portal: no internal details in tooltips, no clustering */
  publicMode?: boolean;
  /** Draw this route even if no truck is selected (e.g. shipment detail) */
  focus?: { routeId: string; reversed: boolean; kmDone: number } | null;
  className?: string;
  /** Extra padding (px) when fitting a route, so floating panels do not cover it */
  fitPadding?: { top: number; bottom: number; left: number; right: number };
}

function markerHtml(t: Truck, selected: boolean, publicMode: boolean) {
  const onRoad = t.status === "moving" || t.status === "delayed" || t.status === "attention";
  const heading = onRoad && !publicMode ? `<span class="heading" style="transform:rotate(${Math.round(t.heading)}deg)"></span>` : "";
  return `<div class="truck-marker ${t.status}${selected ? " selected" : ""}">${heading}${TRUCK_SVG}</div>`;
}

function clusterHtml(members: Truck[]) {
  const counts = { moving: 0, delayed: 0, attention: 0, other: 0 };
  for (const m of members) {
    if (m.status === "moving") counts.moving++;
    else if (m.status === "delayed") counts.delayed++;
    else if (m.status === "attention") counts.attention++;
    else counts.other++;
  }
  const n = members.length;
  const a = (counts.moving / n) * 100;
  const b = a + (counts.delayed / n) * 100;
  const c = b + (counts.attention / n) * 100;
  const ring = `conic-gradient(#1e9e5a 0 ${a}%, #e07b00 ${a}% ${b}%, #d93a3a ${b}% ${c}%, #9aa1ac ${c}% 100%)`;
  return `<div class="cluster" style="background:${ring}"><div style="position:absolute;inset:4px;border-radius:50%;background:#0b2545"></div><b>${n}</b></div>`;
}

export default function FleetMap({ trucks, selectedId = null, onSelect, showLanes = false, follow = false, tiles = "light", compact = false, publicMode = false, focus = null, className, fitPadding }: FleetMapProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const LRef = useRef<L | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const tileRef = useRef<Leaflet.TileLayer | null>(null);
  const markerLayer = useRef<Leaflet.LayerGroup | null>(null);
  const clusterLayer = useRef<Leaflet.LayerGroup | null>(null);
  const laneLayer = useRef<Leaflet.LayerGroup | null>(null);
  const focusLayer = useRef<Leaflet.LayerGroup | null>(null);
  const markers = useRef(new Map<string, { m: Leaflet.Marker; key: string }>());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(5);
  const [failed, setFailed] = useState(false);
  const lastFocusKey = useRef<string | null>(null);

  // create map once
  useEffect(() => {
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    import("leaflet")
      .then((mod) => {
        if (cancelled || !rootRef.current) return;
        const L = ((mod as unknown as { default?: L }).default ?? mod) as L;
        LRef.current = L;
        const map = L.map(rootRef.current, {
          zoomControl: !compact && window.innerWidth >= 900,
          attributionControl: true,
          scrollWheelZoom: !compact,
          minZoom: 4,
          maxZoom: 17,
          worldCopyJump: false,
          preferCanvas: false,
        });
        map.fitBounds(INDIA, { padding: (compact ? [8, 8] : [20, 20]) as [number, number] });
        if (!compact && window.innerWidth >= 900) map.zoomControl.setPosition("bottomright");
        laneLayer.current = L.layerGroup().addTo(map);
        focusLayer.current = L.layerGroup().addTo(map);
        clusterLayer.current = L.layerGroup().addTo(map);
        markerLayer.current = L.layerGroup().addTo(map);
        const root = rootRef.current;
        map.on("zoomstart", () => root.classList.add("zooming"));
        map.on("zoomend", () => {
          setZoom(map.getZoom());
          window.setTimeout(() => root.classList.remove("zooming"), 60);
        });
        mapRef.current = map;
        setZoom(map.getZoom());
        ro = new ResizeObserver(() => map.invalidateSize());
        ro.observe(root);
        setReady(true);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      ro?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      markers.current.clear();
    };
  }, [compact]);

  // tiles
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    tileRef.current?.remove();
    if (typeof window !== "undefined" && (window as unknown as { __SST_VECTOR_BASEMAP__?: boolean }).__SST_VECTOR_BASEMAP__) {
      // Offline basemap: India outline + major cities (used where tile servers are blocked).
      const g = L.layerGroup();
      L.polygon(INDIA_OUTLINE, { color: "#b8c3d6", weight: 1.2, fillColor: "#ffffff", fillOpacity: 1, interactive: false }).addTo(g);
      for (const name of BASEMAP_CITIES) {
        const c = CITIES[name];
        L.marker(c.pos, {
          icon: L.divIcon({ className: "", html: `<span class="base-city"><i></i>${name}</span>`, iconSize: [0, 0], iconAnchor: [3, 3] }),
          interactive: false,
          keyboard: false,
        }).addTo(g);
      }
      tileRef.current = g.addTo(map) as unknown as Leaflet.TileLayer;
      return;
    }
    const cfg = TILES[tiles];
    tileRef.current = L.tileLayer(cfg.url, { attribution: cfg.attribution, subdomains: cfg.subdomains, maxZoom: 19, detectRetina: true }).addTo(map);
  }, [ready, tiles]);

  // all lanes
  useEffect(() => {
    const L = LRef.current;
    const layer = laneLayer.current;
    if (!ready || !L || !layer) return;
    layer.clearLayers();
    if (!showLanes) return;
    for (const r of ROUTES) {
      const rr = resolveRoute(r.id, false);
      L.polyline(rr.points, { color: "#7d8fb3", weight: 2, opacity: 0.45, dashArray: "1 6", lineCap: "round", interactive: false }).addTo(layer);
    }
  }, [ready, showLanes]);

  // focus route (selected truck or explicit focus)
  const selected = trucks.find((t) => t.id === selectedId) ?? null;
  const focusSpec = focus ?? (selected && selected.routeId ? { routeId: selected.routeId, reversed: selected.reversed, kmDone: selected.kmDone } : null);
  const focusKm = focusSpec ? Math.round(focusSpec.kmDone * 10) / 10 : 0;
  useEffect(() => {
    const L = LRef.current;
    const layer = focusLayer.current;
    const map = mapRef.current;
    if (!ready || !L || !layer || !map) return;
    layer.clearLayers();
    if (!focusSpec) {
      lastFocusKey.current = null;
      return;
    }
    const route: ResolvedRoute = resolveRoute(focusSpec.routeId, focusSpec.reversed);
    const done = slicePath(route, 0, focusSpec.kmDone);
    const left = slicePath(route, focusSpec.kmDone, route.totalKm);
    L.polyline(route.points, { color: "#ffffff", weight: 8, opacity: 0.9, interactive: false }).addTo(layer);
    L.polyline(done, { color: "#0b2545", weight: 4, opacity: 0.9, interactive: false }).addTo(layer);
    L.polyline(left, { color: "#1f5eff", weight: 4, opacity: 0.9, dashArray: "8 8", interactive: false }).addTo(layer);
    for (let i = 1; i < route.stops.length - 1; i++) {
      L.circleMarker(route.points[i], { radius: 3, color: "#0d1d38", weight: 1.5, fillColor: "#fff", fillOpacity: 1 })
        .bindTooltip(route.stops[i], { direction: "top", className: "tm-tip", offset: [0, -4] })
        .addTo(layer);
    }
    const pin = (pos: [number, number], cls: string, label: string) => {
      L.marker(pos, {
        icon: L.divIcon({ className: "", html: `<div class="city-pin ${cls}"></div>`, iconSize: [14, 14], iconAnchor: [7, 7] }),
        interactive: false,
        keyboard: false,
      }).addTo(layer);
      L.marker(pos, {
        icon: L.divIcon({ className: "", html: `<span class="city-label">${label}</span>`, iconSize: [0, 0], iconAnchor: [0, 0] }),
        interactive: false,
        keyboard: false,
      }).addTo(layer);
    };
    pin(route.points[0], "origin", route.origin);
    pin(route.points[route.points.length - 1], "dest", route.destination);

    const key = `${focusSpec.routeId}:${focusSpec.reversed}:${selectedId ?? ""}`;
    if (lastFocusKey.current !== key) {
      lastFocusKey.current = key;
      const fp = fitPadding;
      map.fitBounds(L.latLngBounds(route.points), fp ? { paddingTopLeft: [fp.left, fp.top] as [number, number], paddingBottomRight: [fp.right, fp.bottom] as [number, number], maxZoom: 9 } : { padding: (compact ? [24, 24] : [70, 70]) as [number, number], maxZoom: 9 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, focusSpec?.routeId, focusSpec?.reversed, focusKm, selectedId, compact]);

  // markers + clustering
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    const mLayer = markerLayer.current;
    const cLayer = clusterLayer.current;
    if (!ready || !L || !map || !mLayer || !cLayer) return;
    const z = map.getZoom();
    const cluster = !publicMode && z < 9 && trucks.length > 12;
    const cell = compact ? 64 : 54;
    const groups = new Map<string, Truck[]>();
    const singles: Truck[] = [];
    for (const t of trucks) {
      if (!cluster || t.id === selectedId) {
        singles.push(t);
        continue;
      }
      const p = map.project([t.lat, t.lng], z);
      const k = `${Math.floor(p.x / cell)}:${Math.floor(p.y / cell)}`;
      const g = groups.get(k);
      if (g) g.push(t);
      else groups.set(k, [t]);
    }
    cLayer.clearLayers();
    for (const g of groups.values()) {
      if (g.length === 1) {
        singles.push(g[0]);
        continue;
      }
      const lat = g.reduce((s, t) => s + t.lat, 0) / g.length;
      const lng = g.reduce((s, t) => s + t.lng, 0) / g.length;
      const cm = L.marker([lat, lng], {
        icon: L.divIcon({ className: "", html: clusterHtml(g), iconSize: [46, 46], iconAnchor: [23, 23] }),
        title: `${g.length} trucks`,
        keyboard: true,
      });
      cm.on("click", () => map.fitBounds(L.latLngBounds(g.map((t) => [t.lat, t.lng] as [number, number])).pad(0.4), { maxZoom: Math.max(z + 2, 9) }));
      const moving = g.filter((t) => t.status === "moving").length;
      const late = g.filter((t) => t.status === "delayed" || t.status === "attention").length;
      cm.bindTooltip(`<b>${g.length} trucks</b><br>${moving} moving · ${late} delayed/attention`, { direction: "top", className: "tm-tip", offset: [0, -20] });
      cm.addTo(cLayer);
    }

    const keep = new Set(singles.map((t) => t.id));
    for (const [id, entry] of markers.current) {
      if (!keep.has(id)) {
        entry.m.remove();
        markers.current.delete(id);
      }
    }
    for (const t of singles) {
      const sel = t.id === selectedId;
      const key = `${t.status}:${sel ? 1 : 0}:${Math.round(t.heading / 10)}`;
      const tip = publicMode
        ? "Your shipment"
        : `<b>${fmtPlate(t.reg)}</b><br>${t.routeId && t.status !== "idle" && t.status !== "maintenance" ? `${resolveRoute(t.routeId, t.reversed).origin} → ${resolveRoute(t.routeId, t.reversed).destination} · ` : ""}${t.speed} km/h`;
      const existing = markers.current.get(t.id);
      if (existing) {
        existing.m.setLatLng([t.lat, t.lng]);
        if (existing.key !== key) {
          existing.m.setIcon(L.divIcon({ className: "tm-wrap", html: markerHtml(t, sel, publicMode), iconSize: [32, 32], iconAnchor: [16, 16] }));
          existing.key = key;
        }
        existing.m.setZIndexOffset(sel ? 1000 : t.status === "attention" ? 500 : 0);
        existing.m.setTooltipContent(tip);
      } else {
        const m = L.marker([t.lat, t.lng], {
          icon: L.divIcon({ className: "tm-wrap", html: markerHtml(t, sel, publicMode), iconSize: [32, 32], iconAnchor: [16, 16] }),
          title: fmtPlate(t.reg),
          zIndexOffset: sel ? 1000 : 0,
          keyboard: !publicMode,
        });
        m.bindTooltip(tip, { direction: "top", className: "tm-tip", offset: [0, -16] });
        m.on("click", () => onSelectRef.current?.(t.id));
        m.addTo(mLayer);
        markers.current.set(t.id, { m, key });
      }
    }
  }, [ready, trucks, selectedId, zoom, publicMode, compact]);

  // follow selected truck
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !follow || !selected) return;
    map.panTo([selected.lat, selected.lng], { animate: true, duration: 1 });
  }, [ready, follow, selected?.lat, selected?.lng, selected]);

  return (
    <div className={`map-root ${className ?? ""}`} ref={rootRef}>
      {failed && <div className="map-fallback">Map could not load. Check your internet connection for map tiles.</div>}
    </div>
  );
}

export { STATUS_COLOR };
