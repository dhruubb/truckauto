"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import FleetMap from "@/components/FleetMap";
import { ContactModal } from "@/components/ContactModal";
import { AssignDriverModal, StatusModal, TruckFormModal } from "@/components/TruckModals";
import { IconChevronLeft, IconChevronRight, IconMap, IconPhone, IconTruck } from "@/components/icons";
import { Avatar, DriverStatusBadge, Empty, Menu, Plate, Progress, ShipmentStatusBadge, TruckStatusBadge, useNow } from "@/components/ui";
import { IconMore } from "@/components/icons";
import { resolveRoute } from "@/lib/geo";
import { findDriver, findShipment, isOnRoad, simNow, truckLocation, useAppState } from "@/lib/store";
import { fmtDate, fmtDayTime, fmtKm, fmtNum, fmtRel } from "@/lib/format";

export default function TruckDetailPage() {
  const params = useParams<{ id: string }>();
  const s = useAppState()!;
  const router = useRouter();
  useNow(2000);
  const [modal, setModal] = useState<"edit" | "assign" | "status" | "contact" | null>(null);
  const t = s.trucks.find((x) => x.id === params?.id);
  if (!t)
    return (
      <div className="page">
        <Empty icon={<IconTruck size={22} />} title="Truck not found">
          <Link className="btn sm" href="/trucks">
            Back to trucks
          </Link>
        </Empty>
      </div>
    );
  const now = simNow(s);
  const d = findDriver(s, t.driverId);
  const sh = findShipment(s, t.shipmentId);
  const r = t.routeId ? resolveRoute(t.routeId, t.reversed) : null;
  const road = isOnRoad(t);
  const trips = s.shipments.filter((x) => x.truckId === t.id).sort((a, b) => (b.dispatchAt ?? b.createdAt) - (a.dispatchAt ?? a.createdAt));

  return (
    <div className="page has-action-bar">
      <button className="back-link" onClick={() => router.back()}>
        <IconChevronLeft size={22} /> Back
      </button>
      <div className="large-title" style={{ paddingTop: 10 }}>
        <div className="stack" style={{ gap: 10 }}>
          <Plate reg={t.reg} size="lg" />
          <div className="row" style={{ flexWrap: "wrap" }}>
            <TruckStatusBadge status={t.status} />
            <span className="muted">
              {t.model} · {t.capacityT} t
            </span>
          </div>
        </div>
        <div className="row">
          <Link href={`/fleet?truck=${t.id}`} className="btn primary only-desk">
            <IconMap size={16} /> Live map
          </Link>
          <Menu trigger={<IconMore size={20} />} label="Truck actions">
            {(close) => (
              <>
                <button onClick={() => (close(), setModal("edit"))}>Edit truck</button>
                <button onClick={() => (close(), setModal("assign"))}>Assign driver</button>
                <button onClick={() => (close(), setModal("status"))}>Change status</button>
              </>
            )}
          </Menu>
        </div>
      </div>

      <div className="split">
        <div className="stack-gap">
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ height: 300 }}>
              <FleetMap trucks={[t]} selectedId={t.id} compact tiles={s.settings.mapStyle} />
            </div>
            <div className="card-body">
              <div className="cell-title">{road && r ? `${r.origin} → ${r.destination}` : truckLocation(t)}</div>
              <div className="cell-sub">{road ? `Now ${truckLocation(t)} · ${t.speed} km/h · ping ${fmtRel(t.lastGpsAt, now)}` : `Last ping ${fmtRel(t.lastGpsAt, now)}`}</div>
              {road && sh && r && (
                <div style={{ marginTop: 14 }}>
                  <div className="row-between cell-sub" style={{ marginBottom: 6 }}>
                    <span>
                      {fmtNum(t.kmDone)} of {fmtKm(t.routeKm)}
                    </span>
                    <span>ETA {fmtDayTime(sh.eta, now)}</span>
                  </div>
                  <Progress value={(t.kmDone / t.routeKm) * 100} tone={sh.status === "Delayed" ? "orange" : undefined} />
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="section-title" style={{ marginTop: 8 }}>
              <h2 style={{ fontSize: 17 }}>Trips</h2>
              <span className="muted">{trips.length}</span>
            </div>
            <div className="group">
              {trips.length === 0 && <div className="cell muted">No trips yet</div>}
              {trips.slice(0, 8).map((x) => (
                <Link key={x.id} href={`/shipments/${x.id}`} className="cell">
                  <span className="grow">
                    <span className="cell-title ellipsis" style={{ display: "block" }}>
                      {x.pickup} → {x.delivery}
                    </span>
                    <span className="cell-sub">
                      {x.id} · {x.dispatchAt ? fmtDate(x.dispatchAt) : "not dispatched"}
                    </span>
                  </span>
                  <ShipmentStatusBadge status={x.status} />
                  <IconChevronRight size={18} className="chev" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="stack-gap">
          <div>
            <div className="section-title" style={{ marginTop: 8 }}>
              <h2 style={{ fontSize: 17 }}>Driver</h2>
              <button onClick={() => setModal("assign")}>{d ? "Change" : "Assign"}</button>
            </div>
            <div className="group">
              {d ? (
                <div className="cell">
                  <Avatar name={d.name} soft />
                  <span className="grow">
                    <span className="cell-title" style={{ display: "block" }}>
                      {d.name}
                    </span>
                    <span className="cell-sub">
                      {d.phone} · ★ {d.rating}
                    </span>
                  </span>
                  <DriverStatusBadge status={d.status} />
                </div>
              ) : (
                <div className="cell muted">No driver assigned</div>
              )}
            </div>
          </div>
          <div>
            <div className="section-title" style={{ marginTop: 8 }}>
              <h2 style={{ fontSize: 17 }}>Vehicle</h2>
            </div>
            <div className="group">
              {[
                ["Type", t.type],
                ["Capacity", `${t.capacityT} tonnes`],
                ["Model year", String(t.year)],
                ["Home depot", t.depot],
                ["Odometer", fmtKm(t.odometer)],
                ["Fuel", `${Math.round(t.fuelPct)}%`],
                ["Next service", `in ${fmtKm(t.nextServiceKm)}`],
              ].map(([k, v]) => (
                <div key={k} className="cell" style={{ minHeight: 48 }}>
                  <span className="muted grow">{k}</span>
                  <span style={{ fontWeight: 500 }} className="num">
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="action-bar">
        <Link href={`/fleet?truck=${t.id}`} className="btn primary">
          <IconMap size={17} /> Track live
        </Link>
        {d && (
          <button className="btn" onClick={() => setModal("contact")}>
            <IconPhone size={17} /> Call driver
          </button>
        )}
      </div>

      {modal === "edit" && <TruckFormModal truck={t} onClose={() => setModal(null)} />}
      {modal === "assign" && <AssignDriverModal truck={t} onClose={() => setModal(null)} />}
      {modal === "status" && <StatusModal truck={t} onClose={() => setModal(null)} />}
      {modal === "contact" && d && <ContactModal name={d.name} phone={d.phone} role="Driver" onClose={() => setModal(null)} />}
    </div>
  );
}
