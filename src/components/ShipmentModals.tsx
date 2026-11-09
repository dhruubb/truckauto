"use client";

import { useMemo, useState } from "react";
import { actions, findCustomer, findTruck, isOnRoad, shipmentClients, simNow, useAppState, type NewClientInput } from "@/lib/store";
import { LANES, resolveRoute } from "@/lib/geo";
import { buildMessage, cargoPhrase } from "@/lib/messages";
import { fmtKm, fmtPlate } from "@/lib/format";
import type { AppState, NotificationKind, Shipment } from "@/lib/types";
import { Field, Modal, Plate, cx } from "./ui";
import { IconPlus, IconWhatsApp, IconX } from "./icons";

const CARGO = ["Cotton fabric rolls", "Pharmaceutical cartons", "Auto components", "FMCG cartons", "Steel coils", "Cement bags", "Basmati rice bags", "Consumer electronics", "Ceramic tiles", "Packaged dairy (chilled)", "Polymer granules", "Machinery parts", "Paper reels", "Furniture flat-packs", "Cashew kernels (export)"];
const NEW = "__new__";

interface Row {
  key: number;
  customerId: string;
  contact: string;
  company: string;
  phone: string;
  cargo: string;
  weight: string;
}
let rowSeq = 1;
const blankRow = (customerId = ""): Row => ({ key: rowSeq++, customerId, contact: "", company: "", phone: "", cargo: "", weight: "" });

function rowError(r: Row, others: Row[]): string | null {
  if (!r.customerId) return "Choose a client";
  if (r.customerId === NEW) {
    if (!r.contact.trim()) return "Enter the client's name";
    if (r.phone.replace(/\D/g, "").slice(-10).length !== 10) return "Enter a 10-digit WhatsApp number";
  } else if (others.some((o) => o.key !== r.key && o.customerId === r.customerId)) return "This client is already on the truck";
  if (!r.cargo.trim()) return "Describe the goods";
  if (!(Number(r.weight) > 0)) return "Enter the weight in tonnes";
  return null;
}

function toInput(r: Row, city: string): NewClientInput {
  return r.customerId === NEW
    ? { newClient: { contact: r.contact, company: r.company, phone: r.phone, city }, cargo: r.cargo.trim(), weightT: Number(r.weight) }
    : { customerId: r.customerId, cargo: r.cargo.trim(), weightT: Number(r.weight) };
}

function ClientEditor({ s, row, index, onChange, onRemove, error, exclude = [] }: { s: AppState; row: Row; index: number; onChange: (r: Row) => void; onRemove?: () => void; error: string | null; exclude?: string[] }) {
  const set = (patch: Partial<Row>) => onChange({ ...row, ...patch });
  return (
    <div className="client-card">
      <div className="row-between" style={{ marginBottom: 10 }}>
        <b style={{ fontSize: 14 }}>Client {index + 1}</b>
        {onRemove && (
          <button className="icon-btn ghost" onClick={onRemove} aria-label={`Remove client ${index + 1}`}>
            <IconX size={16} />
          </button>
        )}
      </div>
      <div className="form-grid">
        <Field label="Client" full>
          <select className="select" value={row.customerId} onChange={(e) => set({ customerId: e.target.value })}>
            <option value="">Choose a client</option>
            <option value={NEW}>+ New client (enter WhatsApp number)</option>
            {s.customers
              .filter((c) => !exclude.includes(c.id))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company} · {c.contact}
                </option>
              ))}
          </select>
        </Field>
        {row.customerId === NEW && (
          <>
            <Field label="Contact name">
              <input className="input" value={row.contact} onChange={(e) => set({ contact: e.target.value })} placeholder="Rahul Mehta" autoComplete="off" />
            </Field>
            <Field label="WhatsApp number" hint="Updates go to this number">
              <input className="input" type="tel" inputMode="numeric" value={row.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="98765 43210" autoComplete="off" />
            </Field>
            <Field label="Company (optional)" full>
              <input className="input" value={row.company} onChange={(e) => set({ company: e.target.value })} placeholder="Mehta Textiles" autoComplete="off" />
            </Field>
          </>
        )}
        <Field label="Goods">
          <input className="input" list="cargo-list" value={row.cargo} onChange={(e) => set({ cargo: e.target.value })} placeholder="e.g. Cotton fabric rolls" autoComplete="off" />
        </Field>
        <Field label="Weight (tonnes)">
          <input className="input" type="number" inputMode="decimal" min={0} step="0.5" value={row.weight} onChange={(e) => set({ weight: e.target.value })} placeholder="6" />
        </Field>
      </div>
      {error && <div className="err" style={{ color: "var(--red-text)", fontSize: 13, marginTop: 8 }}>{error}</div>}
    </div>
  );
}

function CargoList() {
  return (
    <datalist id="cargo-list">
      {CARGO.map((c) => (
        <option key={c} value={c} />
      ))}
    </datalist>
  );
}

export function NewShipmentModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const s = useAppState()!;
  const [lane, setLane] = useState(LANES[0].key);
  const [truckId, setTruckId] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([blankRow()]);
  const [touched, setTouched] = useState(false);
  const laneDef = LANES.find((l) => l.key === lane)!;
  const route = resolveRoute(laneDef.routeId, laneDef.reversed);
  const free = useMemo(
    () =>
      s.trucks
        .filter((t) => (t.status === "idle" || t.status === "arrived") && !(t.shipmentId && t.status === "idle"))
        .sort((a, b) => Number(b.depot === route.origin) - Number(a.depot === route.origin) || b.capacityT - a.capacityT),
    [s.trucks, route.origin],
  );
  const truck = findTruck(s, truckId);
  const total = rows.reduce((n, r) => n + (Number(r.weight) || 0), 0);
  const overweight = !!truck && total > truck.capacityT;
  const errors = rows.map((r) => rowError(r, rows));
  const ok = errors.every((e) => !e) && !overweight;

  const submit = () => {
    setTouched(true);
    if (!ok) return;
    const id = actions.createShipment({ routeId: laneDef.routeId, reversed: laneDef.reversed, truckId: truckId || null, clients: rows.map((r) => toInput(r, route.destination)) });
    onCreated(id);
  };

  return (
    <Modal
      title="New shipment"
      description="One truck can carry goods for several clients. Each client gets their own WhatsApp updates."
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={submit}>
            Create &amp; notify {rows.length > 1 ? `${rows.length} clients` : "client"}
          </button>
        </>
      }
    >
      <CargoList />
      <div className="form-grid">
        <Field label="Route" hint={`${route.def.highway} · ${fmtKm(route.totalKm)} · about ${Math.round(route.totalKm / 30)} h`} full>
          <select className="select" value={lane} onChange={(e) => setLane(e.target.value)}>
            {LANES.map((l) => (
              <option key={l.key} value={l.key}>
                {l.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Truck" hint="Trucks at the pickup city are listed first. You can assign one later." full>
          <select className="select" value={truckId} onChange={(e) => setTruckId(e.target.value)}>
            <option value="">Assign later</option>
            {free.map((t) => (
              <option key={t.id} value={t.id}>
                {fmtPlate(t.reg)} · {t.capacityT} t · {t.status === "arrived" ? `at ${resolveRoute(t.routeId!, t.reversed).destination}` : `${t.depot} depot`}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="row-between" style={{ margin: "22px 2px 10px" }}>
        <b style={{ fontSize: 16 }}>Clients on this truck</b>
        <span className={cx("badge", overweight ? "red" : "")}>
          {Math.round(total * 10) / 10} t{truck ? ` of ${truck.capacityT} t` : ""}
        </span>
      </div>
      <div className="stack" style={{ gap: 12 }}>
        {rows.map((r, i) => (
          <ClientEditor
            key={r.key}
            s={s}
            row={r}
            index={i}
            error={touched ? errors[i] : null}
            onChange={(nr) => setRows((rs) => rs.map((x) => (x.key === r.key ? nr : x)))}
            onRemove={rows.length > 1 ? () => setRows((rs) => rs.filter((x) => x.key !== r.key)) : undefined}
          />
        ))}
      </div>
      <button className="btn block" style={{ marginTop: 12 }} onClick={() => setRows((rs) => [...rs, blankRow()])}>
        <IconPlus size={16} /> Add another client
      </button>
      {touched && overweight && (
        <p style={{ color: "var(--red-text)", fontSize: 13.5, marginTop: 10 }}>
          The goods add up to {Math.round(total * 10) / 10} t but {fmtPlate(truck!.reg)} carries {truck!.capacityT} t. Choose a bigger truck or reduce the load.
        </p>
      )}
      <div className="sim-note" style={{ marginTop: 14 }}>
        <IconWhatsApp size={16} /> Each client gets an order confirmation now, then updates on dispatch, delays and delivery.
      </div>
    </Modal>
  );
}

export function AddClientModal({ shipment, onClose }: { shipment: Shipment; onClose: () => void }) {
  const s = useAppState()!;
  const [row, setRow] = useState<Row>(blankRow());
  const [touched, setTouched] = useState(false);
  const truck = findTruck(s, shipment.truckId);
  const room = truck ? Math.round((truck.capacityT - shipment.weightT) * 10) / 10 : null;
  const existing = shipmentClients(shipment).map((c) => c.customerId);
  let err = rowError(row, [row]);
  if (!err && room != null && Number(row.weight) > room) err = `Only ${room} t of space left on ${fmtPlate(truck!.reg)}`;
  return (
    <Modal
      title="Add a client to this truck"
      description={`${shipment.pickup} → ${shipment.delivery}${room != null ? ` · ${room} t of space left` : ""}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn primary"
            onClick={() => {
              setTouched(true);
              if (err) return;
              actions.addClient(shipment.id, toInput(row, shipment.delivery));
              onClose();
            }}
          >
            Add &amp; notify on WhatsApp
          </button>
        </>
      }
    >
      <CargoList />
      <ClientEditor s={s} row={row} index={existing.length} onChange={setRow} error={touched ? err : null} exclude={existing} />
    </Modal>
  );
}

export function AssignTruckModal({ shipment, onClose }: { shipment: Shipment; onClose: () => void }) {
  const s = useAppState()!;
  const [pick, setPick] = useState<string | null>(null);
  const free = s.trucks
    .filter((t) => !isOnRoad(t) && t.status !== "maintenance" && (!t.shipmentId || t.status === "arrived" || t.id === shipment.truckId))
    .sort((a, b) => Number(b.depot === shipment.pickup) - Number(a.depot === shipment.pickup));
  return (
    <Modal
      title={`Assign truck · ${shipment.id}`}
      description={`${shipment.pickup} → ${shipment.delivery} · ${shipment.weightT} t to carry`}
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
              if (pick) actions.assignTruckToShipment(shipment.id, pick);
              onClose();
            }}
          >
            Assign truck
          </button>
        </>
      }
    >
      <div className="group" style={{ boxShadow: "none", background: "var(--fill-2)", maxHeight: 380, overflowY: "auto" }}>
        {free.map((t) => (
          <label key={t.id} className="list-row" style={{ cursor: "pointer", background: pick === t.id ? "var(--accent-soft)" : undefined, opacity: t.capacityT < shipment.weightT ? 0.45 : 1 }}>
            <input type="radio" name="truck" disabled={t.capacityT < shipment.weightT} checked={pick === t.id} onChange={() => setPick(t.id)} />
            <Plate reg={t.reg} />
            <span className="grow">
              <span style={{ display: "block", fontWeight: 500 }}>{t.type}</span>
              <span className="muted" style={{ fontSize: 13 }}>
                {t.capacityT} t · {t.depot} depot{t.depot === shipment.pickup ? " · at pickup city" : ""}
              </span>
            </span>
          </label>
        ))}
        {free.length === 0 && <div className="muted" style={{ padding: 16 }}>No free trucks right now. Complete a delivery or add a truck.</div>}
      </div>
    </Modal>
  );
}

const KINDS: NotificationKind[] = ["Order Confirmed", "Shipment Dispatched", "In Transit", "Delivery Delay", "ETA Updated", "Out for Delivery", "Delivered"];

export function SendNotificationModal({ shipment, onClose, onlyCustomerId }: { shipment: Shipment; onClose: () => void; onlyCustomerId?: string }) {
  const s = useAppState()!;
  const clients = shipmentClients(shipment);
  const suggested: NotificationKind =
    shipment.status === "Delayed"
      ? "Delivery Delay"
      : shipment.status === "Out for Delivery"
        ? "Out for Delivery"
        : shipment.status === "Delivered"
          ? "Delivered"
          : shipment.status === "In Transit"
            ? "In Transit"
            : shipment.status === "Pickup Completed"
              ? "Shipment Dispatched"
              : "Order Confirmed";
  const [kind, setKind] = useState<NotificationKind>(suggested);
  const [to, setTo] = useState<string>(onlyCustomerId ?? "all");
  const t = findTruck(s, shipment.truckId);
  const route = resolveRoute(shipment.routeId, shipment.reversed);
  const first = clients.find((c) => to === "all" || c.customerId === to) ?? clients[0];
  const customer = findCustomer(s, first.customerId)!;
  const segIdx = t ? Math.max(0, route.cum.findIndex((c) => c > t.kmDone) - 1) : 0;
  const preview = buildMessage(kind, {
    customerName: customer.contact,
    shipmentId: shipment.id,
    pickup: shipment.pickup,
    delivery: shipment.delivery,
    eta: shipment.eta,
    now: simNow(s),
    near: route.stops[segIdx] ?? shipment.pickup,
    next: route.stops[segIdx + 1] ?? shipment.delivery,
    reason: shipment.delayReason,
    cargo: cargoPhrase(first.cargo, first.weightT),
    vehicle: t?.reg ?? null,
    company: s.settings.companyName,
  });
  return (
    <Modal
      title="Send a WhatsApp update"
      description={`${shipment.id} · ${shipment.pickup} → ${shipment.delivery}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn primary"
            onClick={() => {
              actions.sendManualNotification(shipment.id, kind, "WhatsApp", to === "all" ? undefined : to);
              onClose();
            }}
          >
            <IconWhatsApp size={16} /> Send to {to === "all" && clients.length > 1 ? `${clients.length} clients` : customer.contact.split(" ")[0]}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Send to">
          <select className="select" value={to} onChange={(e) => setTo(e.target.value)}>
            {clients.length > 1 && <option value="all">All {clients.length} clients on this truck</option>}
            {clients.map((c) => {
              const cu = findCustomer(s, c.customerId);
              return (
                <option key={c.customerId} value={c.customerId}>
                  {cu?.contact} · {cu?.company}
                </option>
              );
            })}
          </select>
        </Field>
        <Field label="Update">
          <select className="select" value={kind} onChange={(e) => setKind(e.target.value as NotificationKind)}>
            {KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </Field>
        <Field label={to === "all" && clients.length > 1 ? `Preview (for ${customer.contact.split(" ")[0]}; each client gets their own)` : "Preview"} full>
          <div className="wa-bubble">{preview}</div>
        </Field>
      </div>
    </Modal>
  );
}

