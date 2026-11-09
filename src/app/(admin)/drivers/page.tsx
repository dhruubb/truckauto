"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ContactModal } from "@/components/ContactModal";
import { IconChevronRight, IconDriver, IconPhone, IconSearch, IconStar } from "@/components/icons";
import { Avatar, Drawer, DriverStatusBadge, Empty, FleetSwitch, Plate, ShipmentStatusBadge, cx, useQueryParam } from "@/components/ui";
import { findCustomer, findShipment, findTruck, isOnRoad, simNow, useAppState } from "@/lib/store";
import { fmtDate, fmtDayTime, fmtNum } from "@/lib/format";
import type { Driver, DriverStatus } from "@/lib/types";

const ORDER: DriverStatus[] = ["On trip", "Available", "Resting", "Off duty"];

export default function DriversPage() {
  const s = useAppState()!;
  const now = simNow(s);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | DriverStatus>("all");
  const [openId, setOpenId] = useQueryParam("driver");
  const [contact, setContact] = useState<Driver | null>(null);
  const [shown, setShown] = useState(30);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return s.drivers
      .filter((d) => status === "all" || d.status === status)
      .filter((d) => !term || `${d.name} ${d.phone} ${d.homeCity} ${findTruck(s, d.truckId)?.reg ?? ""}`.toLowerCase().includes(term))
      .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || a.name.localeCompare(b.name));
  }, [s, q, status]);

  const cnt = (st: DriverStatus) => s.drivers.filter((d) => d.status === st).length;
  const open = s.drivers.find((d) => d.id === openId);
  const tripOf = (d: Driver) => {
    const t = findTruck(s, d.truckId);
    return t && isOnRoad(t) ? findShipment(s, t.shipmentId) : undefined;
  };

  return (
    <div className="page">
      <div className="large-title">
        <div>
          <h1>Drivers</h1>
          <p>
            {s.drivers.length} drivers · {cnt("On trip")} driving now
          </p>
        </div>
      </div>
      <FleetSwitch active="drivers" />

      <div className="toolbar">
        <div className="search">
          <IconSearch size={16} />
          <input className="input" placeholder="Name, phone, city or plate" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search drivers" />
        </div>
        <div className="chips">
          {(["all", ...ORDER] as const).map((st) => (
            <button key={st} className={cx("chip", status === st && "on")} onClick={() => setStatus(st)}>
              {st === "all" ? "All" : st}
              <span className="cnt">{st === "all" ? s.drivers.length : cnt(st)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="only-phone">
        <div className="group">
          {rows.slice(0, shown).map((d) => {
            const trip = tripOf(d);
            return (
              <button key={d.id} className="cell inset" onClick={() => setOpenId(d.id)}>
                <Avatar name={d.name} soft />
                <span className="grow">
                  <span className="row-between">
                    <span className="cell-title ellipsis">{d.name}</span>
                    <DriverStatusBadge status={d.status} />
                  </span>
                  <span className="cell-sub ellipsis" style={{ display: "block", marginTop: 2 }}>
                    {trip ? `${trip.pickup} → ${trip.delivery}` : `${d.homeCity} · ${d.experienceYrs} yrs`}
                  </span>
                </span>
                <IconChevronRight size={18} className="chev" />
              </button>
            );
          })}
        </div>
        {rows.length === 0 && <Empty icon={<IconDriver size={22} />} title="No drivers match" />}
        {rows.length > shown && (
          <div className="load-more">
            <button className="btn" onClick={() => setShown((n) => n + 30)}>
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
                <th>Driver</th>
                <th>Phone</th>
                <th>Truck</th>
                <th>Current trip</th>
                <th className="right">Deliveries</th>
                <th className="right">Rating</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const t = findTruck(s, d.truckId);
                const trip = tripOf(d);
                return (
                  <tr key={d.id} className="click" onClick={() => setOpenId(d.id)}>
                    <td>
                      <div className="row" style={{ gap: 10 }}>
                        <Avatar name={d.name} size="sm" soft />
                        <div>
                          <div className="cell-main">{d.name}</div>
                          <div className="cell-sub">
                            {d.homeCity} · {d.experienceYrs} yrs
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="num text-2">{d.phone}</td>
                    <td>{t ? <Plate reg={t.reg} /> : <span className="muted">—</span>}</td>
                    <td>
                      {trip ? (
                        <>
                          <div className="cell-main">
                            {trip.pickup} → {trip.delivery}
                          </div>
                          <div className="cell-sub">ETA {fmtDayTime(trip.eta, now)}</div>
                        </>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="right num">{fmtNum(d.totalDeliveries)}</td>
                    <td className="right num">{d.rating.toFixed(1)}</td>
                    <td>
                      <DriverStatusBadge status={d.status} />
                    </td>
                    <td className="right">
                      <button
                        className="btn sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setContact(d);
                        }}
                      >
                        <IconPhone size={14} /> Contact
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <Drawer
          title={
            <span className="row" style={{ gap: 12 }}>
              <Avatar name={open.name} size="lg" soft />
              <span>
                <span style={{ display: "block", fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>{open.name}</span>
                <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>
                  {open.experienceYrs} years on the road · {open.homeCity}
                </span>
              </span>
            </span>
          }
          onClose={() => setOpenId(null)}
        >
          <div className="stack">
            <div className="row" style={{ gap: 8 }}>
              <DriverStatusBadge status={open.status} />
              <span className="badge">
                <IconStar size={12} fill="currentColor" strokeWidth={0} /> {open.rating.toFixed(1)}
              </span>
            </div>
            <div className="stat-strip">
              <div>
                <div className="sv">{fmtNum(open.totalDeliveries)}</div>
                <div className="sl">deliveries</div>
              </div>
              <div>
                <div className="sv">{open.experienceYrs}</div>
                <div className="sl">years</div>
              </div>
              <div>
                <div className="sv">{open.languages.length}</div>
                <div className="sl">languages</div>
              </div>
            </div>
            <div className="group" style={{ boxShadow: "none", background: "var(--fill-2)" }}>
              <div className="cell">
                <span className="grow muted">Phone</span>
                <span className="cell-value">{open.phone}</span>
              </div>
              <div className="cell">
                <span className="grow muted">Licence</span>
                <span className="cell-value">{open.license}</span>
              </div>
              <div className="cell">
                <span className="grow muted">Languages</span>
                <span className="cell-value">{open.languages.join(", ")}</span>
              </div>
              <div className="cell">
                <span className="grow muted">Truck</span>
                {open.truckId ? (
                  <Link href={`/trucks/${open.truckId}`}>
                    <Plate reg={findTruck(s, open.truckId)!.reg} />
                  </Link>
                ) : (
                  <span className="cell-value">Not assigned</span>
                )}
              </div>
            </div>
            <button className="btn primary lg block" onClick={() => setContact(open)}>
              <IconPhone size={17} /> Contact {open.name.split(" ")[0]}
            </button>
            <div>
              <div className="section-title" style={{ marginTop: 6 }}>
                <h2 style={{ fontSize: 17 }}>Recent trips</h2>
              </div>
              <div className="group" style={{ boxShadow: "none", background: "var(--fill-2)" }}>
                {s.shipments
                  .filter((x) => x.driverId === open.id)
                  .sort((a, b) => (b.dispatchAt ?? b.createdAt) - (a.dispatchAt ?? a.createdAt))
                  .slice(0, 6)
                  .map((x) => (
                    <Link key={x.id} href={`/shipments/${x.id}`} className="cell">
                      <span className="grow">
                        <span className="cell-title ellipsis" style={{ display: "block" }}>
                          {x.pickup} → {x.delivery}
                        </span>
                        <span className="cell-sub ellipsis" style={{ display: "block" }}>
                          {findCustomer(s, x.customerId)?.company} · {x.dispatchAt ? fmtDate(x.dispatchAt) : "not dispatched"}
                        </span>
                      </span>
                      <ShipmentStatusBadge status={x.status} />
                    </Link>
                  ))}
              </div>
            </div>
          </div>
        </Drawer>
      )}
      {contact && <ContactModal name={contact.name} phone={contact.phone} role="Driver" onClose={() => setContact(null)} />}
    </div>
  );
}
