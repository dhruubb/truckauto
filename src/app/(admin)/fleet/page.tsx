"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import FleetMap from "@/components/FleetMap";
import { ContactModal } from "@/components/ContactModal";
import { IconCheckCircle, IconPhone, IconRoute, IconSatellite, IconSearch, IconTruck, IconWhatsApp, IconX, IconZap } from "@/components/icons";
import { Avatar, Empty, Plate, Progress, ShipmentStatusBadge, TRUCK_STATUS_META, TruckStatusBadge, cx, useNow, useQueryParam } from "@/components/ui";
import { resolveRoute } from "@/lib/geo";
import { actions, delayMinutes, findCustomer, findDriver, findShipment, heroOf, isOnRoad, simNow, truckLocation, useAppState } from "@/lib/store";
import { fmtDayTime, fmtDuration, fmtKm, fmtNum, fmtPlate, fmtRel } from "@/lib/format";
import type { AppState, Truck, TruckStatus } from "@/lib/types";

type Filter = "all" | "moving" | "delayed" | "attention" | "idle" | "arrived";

const FILTERS: { key: Filter; label: string; color?: string; match: (t: Truck) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  { key: "moving", label: "Moving", color: "var(--green)", match: (t) => t.status === "moving" },
  { key: "delayed", label: "Delayed", color: "var(--orange)", match: (t) => t.status === "delayed" },
  { key: "attention", label: "Attention", color: "var(--red)", match: (t) => t.status === "attention" },
  { key: "idle", label: "Parked", color: "var(--grey)", match: (t) => t.status === "idle" || t.status === "maintenance" },
  { key: "arrived", label: "Arrived", color: "var(--slate)", match: (t) => t.status === "arrived" },
];

const ORDER: Record<TruckStatus, number> = { attention: 0, delayed: 1, moving: 2, arrived: 3, idle: 4, maintenance: 5 };
type Snap = "peek" | "half" | "full";

function useIsDesktop() {
  const [d, setD] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const on = () => setD(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return d;
}

export default function LiveFleetPage() {
  const s = useAppState()!;
  const [selected, setSelected] = useQueryParam("truck");
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [lanes, setLanes] = useState(false);
  const [snap, setSnap] = useState<Snap>("peek");
  const [dragH, setDragH] = useState<number | null>(null);
  const [boxH, setBoxH] = useState(700);
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; h: number; moved: boolean } | null>(null);
  const desktop = useIsDesktop();
  const hero = heroOf(s);

  useEffect(() => {
    if (selected && hero.truck && selected === hero.truck.id) actions.markTour("select");
  }, [selected, hero.truck]);
  useEffect(() => {
    if (selected) setSnap((v) => (v === "peek" ? "half" : v));
  }, [selected]);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxH(el.clientHeight));
    ro.observe(el);
    setBoxH(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  const heights: Record<Snap, number> = { peek: 128, half: Math.round(boxH * 0.52), full: Math.max(300, boxH - 112) };
  const sheetH = dragH ?? heights[snap];

  const filtered = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter)!;
    const term = q.trim().toLowerCase().replace(/\s+/g, "");
    return s.trucks
      .filter(f.match)
      .filter((t) => {
        if (!term) return true;
        const d = findDriver(s, t.driverId);
        const r = t.routeId ? resolveRoute(t.routeId, t.reversed) : null;
        return `${t.reg}${d?.name ?? ""}${r ? r.origin + r.destination : t.depot}${t.shipmentId ?? ""}`.toLowerCase().replace(/\s+/g, "").includes(term);
      })
      .sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.reg.localeCompare(b.reg));
  }, [s, filter, q]);

  const selTruck = selected ? s.trucks.find((t) => t.id === selected) : undefined;
  const mapTrucks = selTruck && !filtered.includes(selTruck) ? [...filtered, selTruck] : filtered;
  const attentionN = s.trucks.filter((t) => t.status === "delayed" || t.status === "attention").length;
  const onRoadN = s.trucks.filter(isOnRoad).length;

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (desktop) return;
    drag.current = { y: e.clientY, h: sheetH, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const dy = e.clientY - drag.current.y;
    if (Math.abs(dy) > 5) drag.current.moved = true;
    if (drag.current.moved) setDragH(Math.min(heights.full, Math.max(96, drag.current.h - dy)));
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) {
      setSnap((v) => (v === "peek" ? "half" : v === "half" ? "full" : "peek"));
      return;
    }
    const h = dragH ?? d.h;
    const best = (Object.keys(heights) as Snap[]).reduce((a, b) => (Math.abs(heights[b] - h) < Math.abs(heights[a] - h) ? b : a));
    setSnap(best);
    setDragH(null);
  };

  const fitPad = desktop ? { top: 40, bottom: 40, left: 410, right: selTruck ? 430 : 40 } : { top: 130, bottom: heights.half + 20, left: 30, right: 30 };

  const listRows = filtered.length ? (
    filtered.map((t) => <TruckRow key={t.id} s={s} t={t} on={t.id === selected} onClick={() => setSelected(t.id === selected ? null : t.id)} />)
  ) : (
    <Empty icon={<IconTruck size={22} />} title="No trucks match">
      Try another filter or search.
    </Empty>
  );

  return (
    <div className={cx("fleet", selTruck && "has-sel")} ref={boxRef} style={{ "--sheet-h": desktop ? "0px" : `${sheetH}px` } as CSSProperties}>
      <div className="fleet-map">
        <FleetMap trucks={mapTrucks} selectedId={selected} onSelect={(id) => setSelected(id)} showLanes={lanes} tiles={s.settings.mapStyle} fitPadding={fitPad} />
      </div>

      <div className="float-top">
        <div className="float-search">
          <div className="search">
            <IconSearch size={17} />
            <input className="input" placeholder="Search plate, driver or city" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search trucks" />
          </div>
          <button className={cx("float-btn", lanes && "on")} onClick={() => setLanes((v) => !v)} aria-label="Show freight lanes" title="Show freight lanes">
            <IconRoute size={19} />
          </button>
        </div>
        <div className="chips">
          {FILTERS.map((f) => (
            <button key={f.key} className={cx("chip", filter === f.key && "on")} onClick={() => setFilter(f.key)}>
              {f.color && <i style={{ background: f.color }} />}
              {f.label}
              <span className="cnt">{s.trucks.filter(f.match).length}</span>
            </button>
          ))}
        </div>
        <div className="desk-list">{listRows}</div>
      </div>

      <div className="map-sim-wrap">
        <button className={cx("map-sim", !s.sim.running && "paused")} onClick={() => actions.setRunning(!s.sim.running)}>
          <span className="dot" />
          {s.sim.running ? "Simulated GPS · live" : "Paused · tap to resume"}
        </button>
      </div>

      <section className={cx("sheet", dragH != null && "dragging", !selTruck && "list-mode")} style={{ height: sheetH }} aria-label={selTruck ? "Truck details" : "Trucks"}>
        <div className="sheet-handle" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          {selTruck ? (
            <SheetHeader t={selTruck} onClose={() => setSelected(null)} />
          ) : (
            <>
              <div className="sheet-title">{onRoadN} trucks on the road</div>
              <div className="sheet-sub">
                {attentionN} need attention · {s.sim.running ? "updating live" : "simulation paused"}
              </div>
            </>
          )}
        </div>
        <div className="sheet-body">{selTruck ? <TruckDetail s={s} t={selTruck} /> : listRows}</div>
        {selTruck && (
          <div className="sheet-foot">
            <Link href={`/trucks/${selTruck.id}`} className="btn primary">
              Full details
            </Link>
            {selTruck.shipmentId && (
              <Link href={`/shipments/${selTruck.shipmentId}`} className="btn">
                Shipment
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function TruckRow({ s, t, on, onClick }: { s: AppState; t: Truck; on: boolean; onClick: () => void }) {
  const d = findDriver(s, t.driverId);
  const sh = findShipment(s, t.shipmentId);
  const r = t.routeId ? resolveRoute(t.routeId, t.reversed) : null;
  const road = isOnRoad(t);
  return (
    <button className={cx("truck-row", on && "on")} onClick={onClick}>
      <span className={cx("sdot", `s-${t.status}`)} />
      <span className="grow">
        <span className="row-between">
          <Plate reg={t.reg} />
          <span className="muted num" style={{ fontSize: 13 }}>
            {road ? `${t.speed} km/h` : TRUCK_STATUS_META[t.status].label}
          </span>
        </span>
        <span className="cell-title ellipsis" style={{ display: "block", marginTop: 6 }}>
          {r && (road || t.status === "arrived") ? `${r.origin} → ${r.destination}` : `${t.depot} depot`}
        </span>
        <span className="cell-sub ellipsis" style={{ display: "block" }}>
          {d ? d.name : "No driver"}
          {sh && road ? ` · ETA ${fmtDayTime(sh.eta, simNow(s))}` : ""}
        </span>
      </span>
    </button>
  );
}

function SheetHeader({ t, onClose }: { t: Truck; onClose: () => void }) {
  return (
    <div className="row-between" style={{ alignItems: "flex-start" }}>
      <div className="stack" style={{ gap: 8 }}>
        <Plate reg={t.reg} size="lg" />
        <div className="row" style={{ flexWrap: "wrap" }}>
          <TruckStatusBadge status={t.status} />
          <span className="muted" style={{ fontSize: 13.5 }}>
            {t.model}
          </span>
        </div>
      </div>
      <button
        className="icon-btn"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close"
      >
        <IconX size={18} />
      </button>
    </div>
  );
}

function TruckDetail({ s, t }: { s: AppState; t: Truck }) {
  const now = simNow(s);
  useNow(1000);
  const [contact, setContact] = useState(false);
  const d = findDriver(s, t.driverId);
  const sh = findShipment(s, t.shipmentId);
  const cust = sh ? findCustomer(s, sh.customerId) : undefined;
  const r = t.routeId ? resolveRoute(t.routeId, t.reversed) : null;
  const road = isOnRoad(t);
  const remaining = r ? Math.max(0, t.routeKm - t.kmDone) : 0;
  const pct = r && t.routeKm ? (t.kmDone / t.routeKm) * 100 : 0;
  const late = sh ? delayMinutes(sh) : 0;
  const showTrip = !!sh && !!r && (road || t.status === "arrived");

  return (
    <>
      {showTrip && sh && r ? (
        <div className="detail-sec stack" style={{ gap: 12 }}>
          <div className={cx("eta-box", sh.status === "Delayed" && "late")}>
            <div className="lbl">{sh.status === "Delivered" ? "Delivered" : "Arriving"}</div>
            <div className="val">{fmtDayTime(sh.status === "Delivered" ? sh.deliveredAt ?? sh.eta : sh.eta, now)}</div>
            {sh.status === "Delayed" ? (
              <div className="late-note">
                {fmtDuration(late)} late · {sh.delayReason}
              </div>
            ) : sh.status !== "Delivered" ? (
              <div className="lbl">in {fmtDuration((sh.eta - now) / 60000)}</div>
            ) : null}
          </div>
          <div className="stat-strip">
            <div>
              <div className="sv">{t.speed}</div>
              <div className="sl">km/h</div>
            </div>
            <div>
              <div className="sv">{fmtNum(remaining)}</div>
              <div className="sl">km to go</div>
            </div>
            <div>
              <div className="sv">{Math.round(pct)}%</div>
              <div className="sl">complete</div>
            </div>
          </div>
          <div className="route-line" style={{ marginTop: 4 }}>
            <span className="rl-dot" />
            <div>
              <b>{r.origin}</b>
              <div className="muted" style={{ fontSize: 13 }}>
                Left {sh.dispatchAt ? fmtDayTime(sh.dispatchAt, now) : "—"}
              </div>
            </div>
            <span className="rl-bar" />
            <div style={{ fontSize: 13.5, color: "var(--accent)", paddingTop: 4, fontWeight: 500 }}>Now {truckLocation(t)}</div>
            <span className="rl-dot end" />
            <div>
              <b>{r.destination}</b>
              <div className="muted" style={{ fontSize: 13 }}>
                {r.def.highway} · {fmtKm(t.routeKm)}
              </div>
            </div>
          </div>
          <Progress value={pct} tone={sh.status === "Delayed" ? "orange" : t.status === "attention" ? "red" : undefined} />
        </div>
      ) : (
        <div className="detail-sec">
          <h4>Location</h4>
          <div style={{ fontWeight: 500, fontSize: 16 }}>{truckLocation(t)}</div>
          <div className="muted" style={{ fontSize: 13.5, marginTop: 2 }}>
            {t.status === "maintenance" ? "In the workshop for scheduled service" : "Parked at the depot yard"}
          </div>
        </div>
      )}

      <div className="detail-sec">
        <h4>Driver</h4>
        {d ? (
          <div className="row" style={{ gap: 12 }}>
            <Avatar name={d.name} soft />
            <div className="grow">
              <div style={{ fontWeight: 500 }}>{d.name}</div>
              <div className="muted" style={{ fontSize: 13.5 }}>
                {d.phone} · ★ {d.rating}
              </div>
            </div>
            <button className="icon-btn" onClick={() => setContact(true)} aria-label={`Call ${d.name}`}>
              <IconPhone size={17} />
            </button>
            <button className="icon-btn" onClick={() => setContact(true)} aria-label={`Message ${d.name}`}>
              <IconWhatsApp size={17} />
            </button>
          </div>
        ) : (
          <div className="row-between">
            <span className="muted">No driver assigned</span>
            <Link href={`/trucks?assign=${t.id}`} className="btn sm">
              Assign
            </Link>
          </div>
        )}
      </div>

      {sh && (
        <div className="detail-sec">
          <div className="row-between" style={{ marginBottom: 12 }}>
            <h4 style={{ margin: 0 }}>Shipment {sh.id}</h4>
            <ShipmentStatusBadge status={sh.status} />
          </div>
          <dl className="kv">
            <div>
              <dt>Customer</dt>
              <dd>{cust?.company}</dd>
            </div>
            <div>
              <dt>Cargo</dt>
              <dd>
                {sh.cargo} · {sh.weightT} t
              </dd>
            </div>
            <div>
              <dt>Last GPS ping</dt>
              <dd>{fmtRel(t.lastGpsAt, now)}</dd>
            </div>
            <div>
              <dt>Fuel</dt>
              <dd>{Math.round(t.fuelPct)}%</dd>
            </div>
          </dl>
        </div>
      )}

      {road && (
        <div className="detail-sec">
          <h4>Try it</h4>
          <div className="detail-actions">
            <button className="btn warn" onClick={() => actions.simulateDelay(t.id, 150)}>
              <IconZap size={16} /> Delay
            </button>
            <button className="btn" onClick={() => actions.simulateGpsUpdate(t.id)}>
              <IconSatellite size={16} /> GPS ping
            </button>
            <button className="btn success" style={{ gridColumn: "span 2" }} onClick={() => actions.completeDelivery(t.id)}>
              <IconCheckCircle size={16} /> Mark delivered
            </button>
          </div>
        </div>
      )}
      {contact && d && <ContactModal name={d.name} phone={d.phone} role={`Driver · ${fmtPlate(t.reg)}`} onClose={() => setContact(false)} />}
    </>
  );
}
