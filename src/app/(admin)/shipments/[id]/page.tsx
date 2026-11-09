"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import FleetMap from "@/components/FleetMap";
import { ShipmentTimeline } from "@/components/ShipmentTimeline";
import { AssignTruckModal } from "@/components/ShipmentModals";
import { ClientsPanel } from "@/components/ClientsPanel";
import { ContactModal } from "@/components/ContactModal";
import { IconCheckCircle, IconChevronLeft, IconChevronRight, IconPackage, IconPhone, IconSatellite, IconZap } from "@/components/icons";
import { Avatar, Empty, Plate, ShipmentStatusBadge, cx, useNow } from "@/components/ui";
import { resolveRoute } from "@/lib/geo";
import { actions, delayMinutes, findCustomer, findDriver, findTruck, isOnRoad, shipmentClients, simNow, truckLocation, useAppState } from "@/lib/store";
import { fmtDayTime, fmtDuration, fmtINR, fmtKm, fmtNum, fmtRel } from "@/lib/format";
import type { ShipmentStatus } from "@/lib/types";

const NEXT_ACTION: Partial<Record<ShipmentStatus, string>> = {
  "Order Confirmed": "Mark picked up",
  "Pickup Completed": "Dispatch truck",
  "In Transit": "Out for delivery",
  Delayed: "Out for delivery",
  "Out for Delivery": "Mark delivered",
};

export default function ShipmentDetailPage() {
  const params = useParams<{ id: string }>();
  const s = useAppState()!;
  const router = useRouter();
  useNow(2000);
  const [modal, setModal] = useState<"assign" | "contact" | null>(null);
  const x = s.shipments.find((v) => v.id === params?.id);
  useEffect(() => {
    if (x && x.id === s.heroShipmentId) actions.markTour("shipment");
  }, [x, s.heroShipmentId]);

  if (!x)
    return (
      <div className="page">
        <Empty icon={<IconPackage size={22} />} title={`Shipment ${params?.id ?? ""} not found`}>
          <Link href="/shipments" className="btn sm">
            Back to shipments
          </Link>
        </Empty>
      </div>
    );

  const now = simNow(s);
  const c = findCustomer(s, x.customerId)!;
  const t = findTruck(s, x.truckId);
  const d = findDriver(s, x.driverId);
  const route = resolveRoute(x.routeId, x.reversed);
  const onTrip = !!t && t.shipmentId === x.id;
  const moving = onTrip && isOnRoad(t!);
  const late = delayMinutes(x);
  const remaining = onTrip && x.status !== "Delivered" ? Math.max(0, t!.routeKm - t!.kmDone) : x.status === "Delivered" ? 0 : route.totalKm;
  const pct = Math.round(((route.totalKm - remaining) / route.totalKm) * 100);
  const events = s.events.filter((e) => e.shipmentId === x.id).sort((a, b) => b.at - a.at);
  const next = NEXT_ACTION[x.status];
  const canAdvance = !!next && (x.status === "Order Confirmed" || (x.status === "Pickup Completed" ? !!t : moving || x.status === "Out for Delivery"));
  const delivered = x.status === "Delivered";

  const advanceBtn = next ? (
    <button className="btn primary" disabled={!canAdvance} onClick={() => actions.advanceShipment(x.id)}>
      <IconCheckCircle size={17} /> {next}
    </button>
  ) : null;

  return (
    <div className={cx("page", next && "has-action-bar")}>
      <button className="back-link" onClick={() => router.back()}>
        <IconChevronLeft size={22} /> Back
      </button>
      <div className="large-title" style={{ paddingTop: 8 }}>
        <div>
          <div className="row" style={{ gap: 10, marginBottom: 6 }}>
            <span className="muted num" style={{ fontSize: 14 }}>
              {x.id}
            </span>
            <ShipmentStatusBadge status={x.status} />
          </div>
          <h1>
            {x.pickup} → {x.delivery}
          </h1>
          <p>
            {c.company}
            {x.extraClients?.length ? ` +${x.extraClients.length} more` : ""} · {route.def.highway} · {fmtKm(route.totalKm)}
          </p>
        </div>
        <div className="only-desk">{advanceBtn}</div>
      </div>

      <div className="split">
        <div className="stack-gap">
          <div className={cx("eta-box", x.status === "Delayed" && "late")} style={{ padding: 20 }}>
            <div className="lbl">{delivered ? "Delivered" : "Expected delivery"}</div>
            <div className="val" style={{ fontSize: 32 }}>
              {fmtDayTime(delivered ? x.deliveredAt ?? x.eta : x.eta, now)}
            </div>
            {x.status === "Delayed" ? (
              <div className="late-note">
                {fmtDuration(late)} behind plan · {x.delayReason}
              </div>
            ) : (
              <div className="lbl">
                Planned {fmtDayTime(x.plannedEta, now)}
                {!delivered && late <= 0 ? " · on schedule" : ""}
              </div>
            )}
            <div className="stat-strip" style={{ marginTop: 16, background: "rgba(255,255,255,.08)" }}>
              <div>
                <div className="sv">{fmtNum(remaining)}</div>
                <div className="sl" style={{ color: "rgba(255,255,255,.6)" }}>
                  km to go
                </div>
              </div>
              <div>
                <div className="sv">{pct}%</div>
                <div className="sl" style={{ color: "rgba(255,255,255,.6)" }}>
                  complete
                </div>
              </div>
              <div>
                <div className="sv">{moving ? t!.speed : "—"}</div>
                <div className="sl" style={{ color: "rgba(255,255,255,.6)" }}>
                  km/h
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ height: 300 }}>
              <FleetMap
                trucks={onTrip && t ? [t] : []}
                selectedId={onTrip ? t!.id : null}
                compact
                focus={{ routeId: x.routeId, reversed: x.reversed, kmDone: onTrip ? t!.kmDone : delivered ? route.totalKm : 0 }}
                tiles={s.settings.mapStyle}
              />
            </div>
            {moving && (
              <div className="card-body stack" style={{ gap: 12 }}>
                <div className="text-2" style={{ fontSize: 14 }}>
                  Now {truckLocation(t!)} · last ping {fmtRel(t!.lastGpsAt, now)}
                </div>
                <div className="detail-actions">
                  <button className="btn warn" onClick={() => actions.simulateDelay(t!.id, 150)}>
                    <IconZap size={16} /> Simulate delay
                  </button>
                  <button className="btn" onClick={() => actions.simulateGpsUpdate(t!.id)}>
                    <IconSatellite size={16} /> GPS ping
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Journey</h3>
            </div>
            <div className="card-body">
              <ShipmentTimeline shipment={x} now={now} currentLocation={moving ? truckLocation(t!) : null} />
            </div>
          </div>
        </div>

        <div className="stack-gap">
          <ClientsPanel shipment={x} />
          <div>
            <div className="section-title" style={{ marginTop: 8 }}>
              <h2 style={{ fontSize: 17 }}>Truck &amp; driver</h2>
              {t && !delivered && !moving && <button onClick={() => setModal("assign")}>Change</button>}
            </div>
            <div className="group">
              {t ? (
                <>
                  <Link href={`/trucks/${t.id}`} className="cell">
                    <Plate reg={t.reg} />
                    <span className="grow cell-sub ellipsis">{t.model}</span>
                    <IconChevronRight size={18} className="chev" />
                  </Link>
                  {d ? (
                    <div className="cell">
                      <Avatar name={d.name} size="sm" soft />
                      <span className="grow">
                        <span className="cell-title" style={{ display: "block" }}>
                          {d.name}
                        </span>
                        <span className="cell-sub">{d.phone}</span>
                      </span>
                      <button className="icon-btn" onClick={() => setModal("contact")} aria-label={`Contact ${d.name}`}>
                        <IconPhone size={17} />
                      </button>
                    </div>
                  ) : (
                    <div className="cell muted">No driver on this truck</div>
                  )}
                </>
              ) : (
                <button className="cell" onClick={() => setModal("assign")}>
                  <span className="grow">
                    <span className="cell-title" style={{ color: "var(--accent)" }}>
                      Assign a truck
                    </span>
                    <span className="cell-sub" style={{ display: "block" }}>
                      Needed before pickup
                    </span>
                  </span>
                  <IconChevronRight size={18} className="chev" />
                </button>
              )}
            </div>
          </div>

          <div>
            <div className="section-title" style={{ marginTop: 8 }}>
              <h2 style={{ fontSize: 17 }}>Details</h2>
            </div>
            <div className="group">
              {[
                ["Clients", String(shipmentClients(x).length)],
                ["Total load", `${x.weightT} tonnes${t ? ` of ${t.capacityT}` : ""}`],
                ["Dispatched", x.dispatchAt ? fmtDayTime(x.dispatchAt, now) : "Not yet"],
                ["Freight", fmtINR(x.freightInr)],
              ].map(([k, v]) => (
                <div key={k} className="cell" style={{ minHeight: 48 }}>
                  <span className="muted" style={{ width: 96, flexShrink: 0 }}>
                    {k}
                  </span>
                  <span className="grow" style={{ textAlign: "right", fontWeight: 500 }}>
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="section-title" style={{ marginTop: 8 }}>
              <h2 style={{ fontSize: 17 }}>Activity</h2>
            </div>
            <div className="group" style={{ maxHeight: 360, overflowY: "auto" }}>
              {events.map((e) => (
                <div key={e.id} className="cell" style={{ alignItems: "flex-start", minHeight: 0 }}>
                  <span className="grow">
                    <span className="cell-title" style={{ display: "block", fontSize: 14.5 }}>
                      {e.label}
                    </span>
                    <span className="cell-sub">{e.location}</span>
                  </span>
                  <span className="cell-sub num" style={{ whiteSpace: "nowrap" }}>
                    {fmtDayTime(e.at, now)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {next && <div className="action-bar">{advanceBtn}</div>}
      {modal === "assign" && <AssignTruckModal shipment={x} onClose={() => setModal(null)} />}
      {modal === "contact" && d && <ContactModal name={d.name} phone={d.phone} role={`Driver · ${x.id}`} onClose={() => setModal(null)} />}
    </div>
  );
}
