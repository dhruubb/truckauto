"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { IconChevronLeft, IconChevronRight, IconPackage, IconPlus, IconSearch } from "@/components/icons";
import { NewShipmentModal } from "@/components/ShipmentModals";
import { Empty, Plate, Progress, ShipmentStatusBadge, cx, useQueryParam } from "@/components/ui";
import { delayMinutes, findCustomer, findDriver, findTruck, simNow, useAppState } from "@/lib/store";
import { fmtDayTime, fmtDuration } from "@/lib/format";
import type { Shipment, ShipmentStatus } from "@/lib/types";

type Tab = "Active" | "Delayed" | "In Transit" | "Out for Delivery" | "Upcoming" | "Delivered" | "All";
const TABS: Tab[] = ["Active", "Delayed", "In Transit", "Out for Delivery", "Upcoming", "Delivered", "All"];
const PAGE = 20;

const matchTab = (tab: Tab, x: Shipment) =>
  tab === "All"
    ? true
    : tab === "Active"
      ? x.status !== "Delivered"
      : tab === "Upcoming"
        ? x.status === "Order Confirmed" || x.status === "Pickup Completed"
        : x.status === tab;

export default function ShipmentsPage() {
  const s = useAppState()!;
  const router = useRouter();
  const now = simNow(s);
  const [statusParam] = useQueryParam("status");
  const [tab, setTab] = useState<Tab>("Active");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [shown, setShown] = useState(25);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (statusParam && (TABS as string[]).includes(statusParam)) setTab(statusParam as Tab);
  }, [statusParam]);
  useEffect(() => {
    setPage(0);
    setShown(25);
  }, [tab, q]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase().replace(/\s+/g, "");
    const rank: Record<ShipmentStatus, number> = { Delayed: 0, "Out for Delivery": 1, "In Transit": 2, "Pickup Completed": 3, "Order Confirmed": 4, Delivered: 5 };
    return s.shipments
      .filter((x) => matchTab(tab, x))
      .filter((x) => {
        if (!term) return true;
        const c = findCustomer(s, x.customerId);
        const t = findTruck(s, x.truckId);
        return `${x.id}${x.pickup}${x.delivery}${x.cargo}${c?.company ?? ""}${t?.reg ?? ""}`.toLowerCase().replace(/\s+/g, "").includes(term);
      })
      .sort((a, b) => rank[a.status] - rank[b.status] || (a.status === "Delivered" ? (b.deliveredAt ?? 0) - (a.deliveredAt ?? 0) : a.eta - b.eta));
  }, [s, tab, q]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const view = rows.slice(page * PAGE, (page + 1) * PAGE);
  const count = (t: Tab) => s.shipments.filter((x) => matchTab(t, x)).length;
  const progressOf = (x: Shipment) => {
    const t = findTruck(s, x.truckId);
    if (x.status === "Delivered") return 100;
    return t && t.shipmentId === x.id && t.routeKm ? (t.kmDone / t.routeKm) * 100 : 0;
  };

  return (
    <div className="page">
      <div className="large-title">
        <div>
          <h1>Shipments</h1>
          <p>
            {count("Active")} active · {count("Delayed")} running late
          </p>
        </div>
        <button className="btn primary" onClick={() => setCreating(true)}>
          <IconPlus size={17} />
          New shipment
        </button>
      </div>

      <div className="toolbar">
        <div className="search">
          <IconSearch size={16} />
          <input className="input" placeholder="ID, city, cargo, customer or plate" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search shipments" />
        </div>
        <div className="chips">
          {TABS.map((t) => (
            <button key={t} className={cx("chip", tab === t && "on")} onClick={() => setTab(t)}>
              {t === "Delayed" && <i style={{ background: "var(--orange)" }} />}
              {t}
              <span className="cnt">{count(t)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="only-phone">
        <div className="group">
          {rows.slice(0, shown).map((x) => {
            const c = findCustomer(s, x.customerId);
            const late = delayMinutes(x);
            return (
              <Link key={x.id} href={`/shipments/${x.id}`} className="cell">
                <span className="grow">
                  <span className="row-between">
                    <span className="cell-sub num">{x.id}</span>
                    <ShipmentStatusBadge status={x.status} />
                  </span>
                  <span className="cell-title ellipsis" style={{ display: "block", marginTop: 3, fontSize: 16.5, fontWeight: 700 }}>
                    {x.pickup} → {x.delivery}
                  </span>
                  <span className="cell-sub ellipsis" style={{ display: "block" }}>
                    {c?.company}
                    {x.extraClients?.length ? ` +${x.extraClients.length} more client${x.extraClients.length > 1 ? "s" : ""}` : ""}
                  </span>
                  <span style={{ display: "block", margin: "9px 0 6px" }}>
                    <Progress value={progressOf(x)} tone={x.status === "Delayed" ? "orange" : x.status === "Delivered" ? "green" : undefined} />
                  </span>
                  <span className="row-between cell-sub">
                    <span>{x.status === "Delivered" ? `Delivered ${fmtDayTime(x.deliveredAt ?? x.eta, now)}` : `ETA ${fmtDayTime(x.eta, now)}`}</span>
                    {x.status === "Delayed" && <b style={{ color: "var(--orange-ink)", fontWeight: 500 }}>+{fmtDuration(late)}</b>}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
        {rows.length === 0 && (
          <Empty icon={<IconPackage size={22} />} title="Nothing here">
            {tab === "Delayed" ? "Every shipment is on schedule." : "Try another filter."}
          </Empty>
        )}
        {rows.length > shown && (
          <div className="load-more">
            <button className="btn" onClick={() => setShown((n) => n + 25)}>
              Show more
            </button>
          </div>
        )}
      </div>

      <div className="table-card only-desk">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Shipment</th>
                <th>Customer</th>
                <th>Route</th>
                <th>Truck &amp; driver</th>
                <th>Cargo</th>
                <th>Expected delivery</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {view.map((x) => {
                const c = findCustomer(s, x.customerId);
                const t = findTruck(s, x.truckId);
                const d = findDriver(s, x.driverId);
                return (
                  <tr key={x.id} className="click" onClick={() => router.push(`/shipments/${x.id}`)}>
                    <td className="cell-main num">{x.id}</td>
                    <td>
                      <div className="cell-main">{c?.company}</div>
                      <div className="cell-sub">{x.extraClients?.length ? `+${x.extraClients.length} more client${x.extraClients.length > 1 ? "s" : ""}` : c?.contact}</div>
                    </td>
                    <td style={{ minWidth: 170 }}>
                      <div className="cell-main">
                        {x.pickup} → {x.delivery}
                      </div>
                      <div style={{ marginTop: 7, width: 150 }}>
                        <Progress value={progressOf(x)} tone={x.status === "Delayed" ? "orange" : x.status === "Delivered" ? "green" : undefined} />
                      </div>
                    </td>
                    <td>
                      {t ? (
                        <>
                          <Plate reg={t.reg} />
                          <div className="cell-sub" style={{ marginTop: 3 }}>
                            {d?.name ?? "No driver"}
                          </div>
                        </>
                      ) : (
                        <span className="badge orange">Unassigned</span>
                      )}
                    </td>
                    <td>
                      <div className="cell-main">{x.cargo}</div>
                      <div className="cell-sub">{x.weightT} t</div>
                    </td>
                    <td className="num">
                      {x.status === "Delivered" ? (
                        <span className="muted">Delivered {fmtDayTime(x.deliveredAt ?? x.eta, now)}</span>
                      ) : (
                        <>
                          {fmtDayTime(x.eta, now)}
                          {x.status === "Delayed" && <div style={{ color: "var(--orange-ink)", fontSize: 13, fontWeight: 500 }}>+{fmtDuration(delayMinutes(x))} late</div>}
                        </>
                      )}
                    </td>
                    <td>
                      <ShipmentStatusBadge status={x.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {view.length === 0 && <Empty icon={<IconPackage size={22} />} title="Nothing here" />}
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

      {creating && (
        <NewShipmentModal
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            router.push(`/shipments/${id}`);
          }}
        />
      )}
    </div>
  );
}
