"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { IconChevronDown, IconChevronLeft, IconChevronRight, IconDriver, IconEye, IconMap, IconMore, IconPencil, IconPlus, IconSearch, IconTruck } from "@/components/icons";
import { AssignDriverModal, StatusModal, TruckFormModal } from "@/components/TruckModals";
import { Empty, FleetSwitch, Menu, Plate, TruckStatusBadge, cx, useQueryParam } from "@/components/ui";
import { resolveRoute } from "@/lib/geo";
import { findDriver, findShipment, isOnRoad, simNow, truckLocation, useAppState } from "@/lib/store";
import { fmtDayTime } from "@/lib/format";
import type { Truck } from "@/lib/types";

type StatusFilter = "all" | "onroad" | "delayed" | "parked" | "arrived";
type SortKey = "reg" | "status" | "eta" | "driver" | "capacity";
const PAGE = 20;

export default function TrucksPage() {
  const s = useAppState()!;
  const router = useRouter();
  const now = simNow(s);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "status", dir: 1 });
  const [page, setPage] = useState(0);
  const [shown, setShown] = useState(25);
  const [modal, setModal] = useState<{ kind: "add" } | { kind: "edit" | "assign" | "status"; id: string } | null>(null);
  const [assignParam, setAssignParam] = useQueryParam("assign");

  useEffect(() => {
    if (assignParam) {
      setModal({ kind: "assign", id: assignParam });
      setAssignParam(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignParam]);
  useEffect(() => {
    setPage(0);
    setShown(25);
  }, [q, status]);

  const rows = useMemo(() => {
    const rank = { attention: 0, delayed: 1, moving: 2, arrived: 3, idle: 4, maintenance: 5 };
    const term = q.trim().toLowerCase().replace(/\s+/g, "");
    const list = s.trucks.filter((t) => {
      if (status === "onroad" && !isOnRoad(t)) return false;
      if (status === "delayed" && t.status !== "delayed" && t.status !== "attention") return false;
      if (status === "parked" && t.status !== "idle" && t.status !== "maintenance") return false;
      if (status === "arrived" && t.status !== "arrived") return false;
      if (!term) return true;
      const d = findDriver(s, t.driverId);
      const sh = findShipment(s, t.shipmentId);
      return `${t.reg}${t.model}${d?.name ?? ""}${t.depot}${sh?.cargo ?? ""}${sh?.delivery ?? ""}`.toLowerCase().replace(/\s+/g, "").includes(term);
    });
    const val = (t: Truck): string | number => {
      switch (sort.key) {
        case "reg":
          return t.reg;
        case "status":
          return rank[t.status];
        case "eta":
          return isOnRoad(t) ? findShipment(s, t.shipmentId)?.eta ?? Infinity : Infinity;
        case "driver":
          return findDriver(s, t.driverId)?.name ?? "~";
        case "capacity":
          return t.capacityT;
      }
    };
    return list.sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (x < y ? -1 : x > y ? 1 : a.reg.localeCompare(b.reg)) * sort.dir;
    });
  }, [s, q, status, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const view = rows.slice(page * PAGE, page * PAGE + PAGE);
  const th = (key: SortKey, label: string) => (
    <th className="sortable" onClick={() => setSort((p) => ({ key, dir: p.key === key ? ((-p.dir) as 1 | -1) : 1 }))}>
      {label} {sort.key === key && <IconChevronDown size={12} style={{ transform: sort.dir === -1 ? "rotate(180deg)" : undefined, verticalAlign: -1 }} />}
    </th>
  );
  const modalTruck = modal && modal.kind !== "add" ? s.trucks.find((t) => t.id === modal.id) : undefined;
  const counts: Record<StatusFilter, number> = {
    all: s.trucks.length,
    onroad: s.trucks.filter(isOnRoad).length,
    delayed: s.trucks.filter((t) => t.status === "delayed" || t.status === "attention").length,
    parked: s.trucks.filter((t) => t.status === "idle" || t.status === "maintenance").length,
    arrived: s.trucks.filter((t) => t.status === "arrived").length,
  };
  const FILTERS: { key: StatusFilter; label: string; color?: string }[] = [
    { key: "all", label: "All" },
    { key: "onroad", label: "On a trip", color: "var(--green)" },
    { key: "delayed", label: "Delayed", color: "var(--orange)" },
    { key: "parked", label: "Parked", color: "var(--grey)" },
    { key: "arrived", label: "Arrived", color: "var(--slate)" },
  ];

  const actionsMenu = (t: Truck) => (
    <Menu trigger={<IconMore size={18} />}>
      {(close) => (
        <>
          <button onClick={() => (close(), router.push(`/trucks/${t.id}`))}>
            <IconEye size={16} /> View details
          </button>
          <button onClick={() => (close(), router.push(`/fleet?truck=${t.id}`))}>
            <IconMap size={16} /> Show on map
          </button>
          <hr />
          <button onClick={() => (close(), setModal({ kind: "edit", id: t.id }))}>
            <IconPencil size={16} /> Edit truck
          </button>
          <button onClick={() => (close(), setModal({ kind: "assign", id: t.id }))}>
            <IconDriver size={16} /> Assign driver
          </button>
          <button onClick={() => (close(), setModal({ kind: "status", id: t.id }))}>
            <IconTruck size={16} /> Change status
          </button>
        </>
      )}
    </Menu>
  );

  return (
    <div className="page">
      <div className="large-title">
        <div>
          <h1>Trucks</h1>
          <p>
            {s.trucks.length} vehicles · {counts.onroad} on trips
          </p>
        </div>
        <button className="btn primary" onClick={() => setModal({ kind: "add" })}>
          <IconPlus size={17} />
          Add truck
        </button>
      </div>
      <FleetSwitch active="trucks" />

      <div className="toolbar">
        <div className="search">
          <IconSearch size={16} />
          <input className="input" placeholder="Plate, model, driver or city" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search trucks" />
        </div>
        <div className="chips">
          {FILTERS.map((f) => (
            <button key={f.key} className={cx("chip", status === f.key && "on")} onClick={() => setStatus(f.key)}>
              {f.color && <i style={{ background: f.color }} />}
              {f.label}
              <span className="cnt">{counts[f.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* phone: grouped list */}
      <div className="only-phone">
        <div className="group">
          {rows.slice(0, shown).map((t) => {
            const d = findDriver(s, t.driverId);
            const r = t.routeId ? resolveRoute(t.routeId, t.reversed) : null;
            const road = isOnRoad(t);
            return (
              <Link key={t.id} href={`/trucks/${t.id}`} className="cell">
                <span className="grow">
                  <span className="row-between">
                    <Plate reg={t.reg} />
                    <TruckStatusBadge status={t.status} />
                  </span>
                  <span className="cell-title ellipsis" style={{ display: "block", marginTop: 7 }}>
                    {r && (road || t.status === "arrived") ? `${r.origin} → ${r.destination}` : `${t.depot} depot`}
                  </span>
                  <span className="cell-sub ellipsis" style={{ display: "block" }}>
                    {d ? d.name : "No driver"} · {t.model}
                  </span>
                </span>
                <IconChevronRight size={18} className="chev" />
              </Link>
            );
          })}
        </div>
        {rows.length === 0 && <Empty icon={<IconTruck size={22} />} title="No trucks match" />}
        {rows.length > shown && (
          <div className="load-more">
            <button className="btn" onClick={() => setShown((n) => n + 25)}>
              Show {Math.min(25, rows.length - shown)} more
            </button>
          </div>
        )}
      </div>

      {/* desktop: table */}
      <div className="table-card only-desk">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                {th("reg", "Registration")}
                <th>Vehicle</th>
                {th("capacity", "Capacity")}
                {th("driver", "Driver")}
                <th>Current location</th>
                <th>Destination</th>
                {th("status", "Status")}
                {th("eta", "Expected arrival")}
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {view.map((t) => {
                const d = findDriver(s, t.driverId);
                const sh = findShipment(s, t.shipmentId);
                const r = t.routeId ? resolveRoute(t.routeId, t.reversed) : null;
                const road = isOnRoad(t);
                return (
                  <tr key={t.id} className="click" onClick={() => router.push(`/trucks/${t.id}`)}>
                    <td>
                      <Plate reg={t.reg} />
                    </td>
                    <td>
                      <div className="cell-main">{t.model}</div>
                      <div className="cell-sub">{t.type}</div>
                    </td>
                    <td className="num">{t.capacityT} t</td>
                    <td>
                      {d ? (
                        <>
                          <div className="cell-main">{d.name}</div>
                          <div className="cell-sub">{d.phone}</div>
                        </>
                      ) : (
                        <button
                          className="btn sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setModal({ kind: "assign", id: t.id });
                          }}
                        >
                          Assign driver
                        </button>
                      )}
                    </td>
                    <td className="text-2" style={{ maxWidth: 220 }}>
                      <div className="ellipsis">{truckLocation(t)}</div>
                    </td>
                    <td>{r && (road || t.status === "arrived") ? r.destination : <span className="muted">—</span>}</td>
                    <td>
                      <TruckStatusBadge status={t.status} />
                    </td>
                    <td className="num">{road && sh ? fmtDayTime(sh.eta, now) : <span className="muted">—</span>}</td>
                    <td className="right">{actionsMenu(t)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {view.length === 0 && <Empty icon={<IconTruck size={22} />} title="No trucks match" />}
        </div>
        <div className="pager">
          <span>
            {rows.length ? page * PAGE + 1 : 0}–{Math.min(rows.length, (page + 1) * PAGE)} of {rows.length}
          </span>
          <div className="row">
            <button className="icon-btn" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
              <IconChevronLeft size={16} />
            </button>
            <button className="icon-btn" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
              <IconChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {modal?.kind === "add" && <TruckFormModal onClose={() => setModal(null)} />}
      {modal?.kind === "edit" && modalTruck && <TruckFormModal truck={modalTruck} onClose={() => setModal(null)} />}
      {modal?.kind === "assign" && modalTruck && <AssignDriverModal truck={modalTruck} onClose={() => setModal(null)} />}
      {modal?.kind === "status" && modalTruck && <StatusModal truck={modalTruck} onClose={() => setModal(null)} />}
    </div>
  );
}
