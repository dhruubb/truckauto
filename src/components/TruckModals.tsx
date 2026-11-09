"use client";

import { useMemo, useState } from "react";
import { actions, findDriver, isOnRoad, useAppState } from "@/lib/store";
import { CITIES } from "@/lib/geo";
import { fmtPlate } from "@/lib/format";
import type { Truck, TruckStatus } from "@/lib/types";
import { Avatar, DriverStatusBadge, Field, Modal, Plate, TRUCK_STATUS_META, cx } from "./ui";
import { IconSearch } from "./icons";

const MODELS = [
  ["Tata Signa 4825.TK", "Multi-axle trailer", 35],
  ["Tata Prima 5530.S", "Tractor-trailer 40 ft", 32],
  ["Ashok Leyland 4220", "32 ft MXL container", 25],
  ["Ashok Leyland Captain 3518", "Open body 12-wheel", 21],
  ["BharatBenz 2823R", "32 ft SXL container", 16],
  ["BharatBenz 3528C", "Open body 14-wheel", 25],
  ["Eicher Pro 6028", "24 ft reefer", 18],
  ["Mahindra Blazo X 35", "Multi-axle trailer", 28],
  ["Eicher Pro 3019", "20 ft container", 9],
] as const;

const DEPOTS = ["Mumbai", "Pune", "Nagpur", "Ahmedabad", "Surat", "Delhi", "Jaipur", "Bengaluru", "Chennai", "Hyderabad", "Kolkata", "Lucknow", "Kochi", "Visakhapatnam", "Indore", "Ludhiana"];

export function TruckFormModal({ truck, onClose }: { truck?: Truck; onClose: () => void }) {
  const s = useAppState()!;
  const [reg, setReg] = useState(truck?.reg ?? "");
  const [model, setModel] = useState<string>(truck?.model ?? MODELS[0][0]);
  const [type, setType] = useState<string>(truck?.type ?? MODELS[0][1]);
  const [cap, setCap] = useState<number>(truck?.capacityT ?? MODELS[0][2]);
  const [depot, setDepot] = useState(truck?.depot ?? "Mumbai");
  const [year, setYear] = useState(truck?.year ?? 2025);
  const [driverId, setDriverId] = useState<string>(truck?.driverId ?? "");
  const [touched, setTouched] = useState(false);

  const norm = reg.toUpperCase().replace(/[\s-]/g, "");
  const regErr = !/^[A-Z]{2}\d{2}[A-Z]{1,3}\d{4}$/.test(norm)
    ? "Use the Indian format, e.g. MH12AB1234"
    : s.trucks.some((t) => t.reg === norm && t.id !== truck?.id)
      ? "This registration is already in the fleet"
      : "";
  const freeDrivers = s.drivers.filter((d) => !d.truckId || d.id === truck?.driverId);

  const submit = () => {
    setTouched(true);
    if (regErr) return;
    actions.saveTruck({ id: truck?.id, reg: norm, model, type, capacityT: cap, depot, year, driverId: driverId || null });
    onClose();
  };

  return (
    <Modal
      title={truck ? `Edit ${fmtPlate(truck.reg)}` : "Add truck"}
      description={truck ? "Update vehicle details. Trip data is kept." : "New trucks start parked at their home depot."}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={submit}>
            {truck ? "Save changes" : "Add truck"}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Registration number" error={touched ? regErr : undefined} hint="Indian format, e.g. MH12AB1234">
          <input className={cx("input", touched && regErr && "invalid")} value={reg} onChange={(e) => setReg(e.target.value)} placeholder="MH12AB1234" autoFocus />
        </Field>
        <Field label="Preview">
          <div style={{ height: 36, display: "flex", alignItems: "center" }}>{norm ? <Plate reg={norm} /> : <span className="muted">—</span>}</div>
        </Field>
        <Field label="Model" full>
          <select
            className="select"
            value={model}
            onChange={(e) => {
              const m = MODELS.find((x) => x[0] === e.target.value);
              setModel(e.target.value);
              if (m) {
                setType(m[1]);
                setCap(m[2]);
              }
            }}
          >
            {MODELS.map((m) => (
              <option key={m[0]} value={m[0]}>
                {m[0]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Vehicle type">
          <input className="input" value={type} onChange={(e) => setType(e.target.value)} />
        </Field>
        <Field label="Capacity (tonnes)">
          <input className="input" type="number" min={1} max={60} value={cap} onChange={(e) => setCap(Number(e.target.value) || 0)} />
        </Field>
        <Field label="Home depot">
          <select className="select" value={depot} onChange={(e) => setDepot(e.target.value)}>
            {DEPOTS.map((d) => (
              <option key={d} value={d}>
                {d}, {CITIES[d].state}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Model year">
          <input className="input" type="number" min={2005} max={2026} value={year} onChange={(e) => setYear(Number(e.target.value) || 2025)} />
        </Field>
        <Field label="Driver" full>
          <select className="select" value={driverId} onChange={(e) => setDriverId(e.target.value)}>
            <option value="">No driver yet</option>
            {freeDrivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} · {d.homeCity} · {d.experienceYrs} yrs
              </option>
            ))}
          </select>
        </Field>
      </div>
    </Modal>
  );
}

export function AssignDriverModal({ truck, onClose }: { truck: Truck; onClose: () => void }) {
  const s = useAppState()!;
  const [q, setQ] = useState("");
  const [pick, setPick] = useState<string | null>(truck.driverId);
  const current = findDriver(s, truck.driverId);
  const list = useMemo(
    () =>
      s.drivers
        .filter((d) => !d.truckId || d.id === truck.driverId)
        .filter((d) => (d.name + d.homeCity).toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => (a.status === "Available" ? -1 : 1) - (b.status === "Available" ? -1 : 1) || b.rating - a.rating),
    [s.drivers, q, truck.driverId],
  );
  return (
    <Modal
      title={`Assign driver · ${fmtPlate(truck.reg)}`}
      description={current ? `Currently: ${current.name}` : "This truck has no driver."}
      onClose={onClose}
      footer={
        <>
          {truck.driverId && !isOnRoad(truck) && (
            <button
              className="btn danger"
              style={{ marginRight: "auto" }}
              onClick={() => {
                actions.assignDriver(truck.id, null);
                onClose();
              }}
            >
              Unassign
            </button>
          )}
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn primary"
            disabled={!pick || pick === truck.driverId}
            onClick={() => {
              actions.assignDriver(truck.id, pick);
              onClose();
            }}
          >
            Assign driver
          </button>
        </>
      }
    >
      <div className="search-input" style={{ marginBottom: 12 }}>
        <IconSearch size={16} />
        <input className="input" placeholder="Search drivers without a truck" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      </div>
      <div style={{ maxHeight: 340, overflow: "auto", border: "1px solid var(--border)", borderRadius: 10 }}>
        {list.map((d) => (
          <label key={d.id} className="list-row" style={{ cursor: "pointer", borderTop: 0, borderBottom: "1px solid var(--border)", background: pick === d.id ? "var(--blue-50)" : undefined }}>
            <input type="radio" name="driver" checked={pick === d.id} onChange={() => setPick(d.id)} />
            <Avatar name={d.name} size="sm" soft />
            <span className="grow">
              <span style={{ fontWeight: 600, display: "block" }}>{d.name}</span>
              <span className="muted" style={{ fontSize: 12 }}>
                {d.homeCity} · {d.experienceYrs} yrs · ★ {d.rating}
              </span>
            </span>
            <DriverStatusBadge status={d.status} />
          </label>
        ))}
        {list.length === 0 && <div className="muted" style={{ padding: 16 }}>Every driver is assigned. Add a driver or free one up first.</div>}
      </div>
    </Modal>
  );
}

const STATUS_OPTIONS: { value: TruckStatus; help: string; enabled: (t: Truck) => boolean }[] = [
  { value: "moving", help: "Clear delays and mark the trip back on schedule.", enabled: (t) => isOnRoad(t) },
  { value: "delayed", help: "Report a delay. Customer gets a revised ETA.", enabled: (t) => isOnRoad(t) && t.status !== "delayed" },
  { value: "attention", help: "Flag for the ops team. Raises a critical alert.", enabled: (t) => isOnRoad(t) && t.status !== "attention" },
  { value: "arrived", help: "Complete the delivery and notify the customer.", enabled: (t) => isOnRoad(t) },
  { value: "idle", help: "Park at depot. Only for trucks without an active trip.", enabled: (t) => !isOnRoad(t) && t.status !== "idle" },
  { value: "maintenance", help: "Send to workshop. Only for trucks without an active trip.", enabled: (t) => !isOnRoad(t) && t.status !== "maintenance" },
];

export function StatusModal({ truck, onClose }: { truck: Truck; onClose: () => void }) {
  const [pick, setPick] = useState<TruckStatus | null>(null);
  return (
    <Modal
      title={`Change status · ${fmtPlate(truck.reg)}`}
      description={`Current status: ${TRUCK_STATUS_META[truck.status].label}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn primary"
            disabled={!pick}
            onClick={() => {
              if (pick) actions.setTruckStatus(truck.id, pick);
              onClose();
            }}
          >
            Update status
          </button>
        </>
      }
    >
      <div className="stack" style={{ gap: 8 }}>
        {STATUS_OPTIONS.map((o) => {
          const ok = o.enabled(truck);
          return (
            <label
              key={o.value}
              className="list-row"
              style={{ border: "1px solid var(--border)", borderRadius: 10, cursor: ok ? "pointer" : "not-allowed", opacity: ok ? 1 : 0.45, background: pick === o.value ? "var(--blue-50)" : undefined }}
            >
              <input type="radio" name="status" disabled={!ok} checked={pick === o.value} onChange={() => setPick(o.value)} />
              <span className="grow">
                <span style={{ fontWeight: 600, display: "block" }}>{TRUCK_STATUS_META[o.value].label}</span>
                <span className="muted" style={{ fontSize: 12.5 }}>
                  {o.help}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </Modal>
  );
}
