"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import FleetMap from "@/components/FleetMap";
import { useState } from "react";
import { IconChevronRight, IconPlus } from "@/components/icons";
import { NewShipmentModal } from "@/components/ShipmentModals";
import { Plate, cx, useNow } from "@/components/ui";
import { fleetCounts, worstDelays } from "@/lib/metrics";
import { findTruck, simNow, useAppState } from "@/lib/store";
import { fmtDayTime, fmtDuration, fmtTime } from "@/lib/format";

export default function OverviewPage() {
  const s = useAppState()!;
  const router = useRouter();
  const now = simNow(s);
  useNow(5000);
  const c = fleetCounts(s);
  const [creating, setCreating] = useState(false);
  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateLabel = new Date(now).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const delays = worstDelays(s).slice(0, 5);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const arriving = s.shipments
    .filter((x) => (x.status === "In Transit" || x.status === "Out for Delivery") && x.eta <= endOfDay.getTime())
    .sort((a, b) => a.eta - b.eta)
    .slice(0, 5);

  const status = [
    { label: "Moving", n: c.by.moving, color: "#34c77b" },
    { label: "Delayed", n: c.by.delayed, color: "#ff9f1a" },
    { label: "Attention", n: c.by.attention, color: "#ff5c5c" },
    { label: "Arrived", n: c.by.arrived, color: "#8fa3e8" },
    { label: "Parked", n: c.idle, color: "rgba(255,255,255,.35)" },
  ];

  const stones = [
    { cap: "Fleet", value: c.total, unit: "trucks", foot: "+2 this quarter", tone: "", href: "/trucks" },
    { cap: "Delayed", value: c.delayedShipments, unit: "shipments", foot: "2 fewer than yesterday", tone: "good", href: "/shipments?status=Delayed" },
    { cap: "Parked", value: c.idle, unit: "trucks at depots", foot: "−12.5% vs last week", tone: "good", href: "/trucks" },
    { cap: "Utilisation", value: `${c.utilization}%`, unit: "of the fleet earning", foot: "+3 pts this month", tone: "good", href: "/analytics" },
  ];

  return (
    <div className="page">
      <div className="large-title">
        <div>
          <p style={{ marginTop: 0, marginBottom: 2 }}>{dateLabel}</p>
          <h1>{greeting}</h1>
        </div>
        <button className="btn primary" onClick={() => setCreating(true)}>
          <IconPlus size={17} /> New shipment
        </button>
      </div>

      <section className="hero">
        <div className="split-even" style={{ alignItems: "stretch" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div className="hero-kicker">Fleet right now</div>
            <div className="hero-big num">
              {c.onRoad} <span>of {c.total}</span>
            </div>
            <div className="hero-sub">trucks are on the road across India</div>
            <div className="fleet-bar" role="img" aria-label="Fleet status">
              {status.map((x) => (
                <i key={x.label} style={{ flexGrow: x.n, background: x.color }} />
              ))}
            </div>
            <div className="hero-legend">
              {status.map((x) => (
                <span key={x.label}>
                  <i style={{ background: x.color }} />
                  {x.label} <b className="num">{x.n}</b>
                </span>
              ))}
            </div>
            <Link href="/fleet" className="btn lg only-desk" style={{ marginTop: "auto", alignSelf: "flex-start", background: "#fff", color: "var(--navy)" }}>
              Open live map
            </Link>
          </div>
          <div className="hero-map">
            <FleetMap trucks={s.trucks} compact tiles={s.settings.mapStyle} onSelect={(id) => router.push(`/fleet?truck=${id}`)} />
          </div>
        </div>
        <Link href="/fleet" className="btn lg block only-phone" style={{ marginTop: 14, background: "#fff", color: "var(--navy)" }}>
          Open live map
        </Link>
      </section>

      <div className="milestones" style={{ marginTop: 16 }}>
        {stones.map((st) => (
          <Link key={st.cap} href={st.href} className="stone">
            <div className="stone-cap">{st.cap}</div>
            <div className="stone-value">{st.value}</div>
            <div className="stone-unit">{st.unit}</div>
            <div className={cx("stone-foot", st.tone)}>{st.foot}</div>
          </Link>
        ))}
      </div>

      <div className="split-even">
        <section>
          <div className="section-title">
            <h2>Running late</h2>
            <Link href="/shipments?status=Delayed">See all</Link>
          </div>
          <div className="group">
            {delays.length === 0 && <div className="cell muted">Every truck is on schedule.</div>}
            {delays.map(({ shipment: x, late }) => {
              const t = findTruck(s, x.truckId);
              return (
                <Link key={x.id} href={`/shipments/${x.id}`} className="cell">
                  <span className="grow">
                    <span className="row" style={{ gap: 8 }}>
                      {t && <Plate reg={t.reg} />}
                      <span className={cx("badge", late > 120 ? "red" : "orange")}>+{fmtDuration(late)}</span>
                    </span>
                    <span className="cell-title ellipsis" style={{ display: "block", marginTop: 6 }}>
                      {x.pickup} → {x.delivery}
                    </span>
                    <span className="cell-sub">New ETA {fmtDayTime(x.eta, now)}</span>
                  </span>
                  <IconChevronRight size={18} className="chev" />
                </Link>
              );
            })}
          </div>
        </section>

        <section>
          <div className="section-title">
            <h2>Arriving today</h2>
            <Link href="/shipments">All shipments</Link>
          </div>
          <div className="group">
            {arriving.length === 0 && <div className="cell muted">No deliveries due before midnight.</div>}
            {arriving.map((x) => (
              <Link key={x.id} href={`/shipments/${x.id}`} className="cell">
                <span style={{ width: 54, flexShrink: 0 }}>
                  <span className="num" style={{ display: "block", fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em" }}>
                    {fmtTime(x.eta).replace(/ (AM|PM)/, "")}
                  </span>
                  <span className="cell-sub">{fmtTime(x.eta).slice(-2)}</span>
                </span>
                <span className="grow">
                  <span className="cell-title ellipsis" style={{ display: "block" }}>
                    {x.delivery}
                  </span>
                  <span className="cell-sub ellipsis" style={{ display: "block" }}>
                    {x.id} · from {x.pickup}
                  </span>
                </span>
                <span className={cx("badge", x.status === "Out for Delivery" ? "green" : "blue")}>{x.status === "Out for Delivery" ? "Out for delivery" : "In transit"}</span>
                <IconChevronRight size={18} className="chev" />
              </Link>
            ))}
          </div>
        </section>
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
