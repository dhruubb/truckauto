"use client";

import { useMemo, useState } from "react";
import { actions, findCustomer, findTruck, isOnRoad, simNow, useAppState } from "@/lib/store";
import { LANES, resolveRoute } from "@/lib/geo";
import { buildMessage, trackingLink } from "@/lib/messages";
import { fmtKm, fmtPlate } from "@/lib/format";
import type { Channel, NotificationKind, Shipment } from "@/lib/types";
import { Field, Modal, Plate, cx } from "./ui";
import { IconSms, IconWhatsApp } from "./icons";

const CARGO = ["Cotton fabric rolls", "Pharmaceutical cartons", "Auto components", "FMCG cartons", "Steel coils", "Cement bags", "Basmati rice bags", "Consumer electronics", "Ceramic tiles", "Packaged dairy (chilled)", "Polymer granules", "Machinery parts", "Paper reels"];

export function NewShipmentModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const s = useAppState()!;
  const [customerId, setCustomerId] = useState(s.customers[0].id);
  const [lane, setLane] = useState(LANES[2].key);
  const [cargo, setCargo] = useState(CARGO[0]);
  const [weight, setWeight] = useState(12);
  const [truckId, setTruckId] = useState<string>("");
  const [touched, setTouched] = useState(false);
  const laneDef = LANES.find((l) => l.key === lane)!;
  const route = resolveRoute(laneDef.routeId, laneDef.reversed);
  const free = useMemo(
    () =>
      s.trucks
        .filter((t) => (t.status === "idle" || t.status === "arrived") && !(t.shipmentId && t.status === "idle"))
        .sort((a, b) => Number(b.depot === route.origin) - Number(a.depot === route.origin) || a.reg.localeCompare(b.reg)),
    [s.trucks, route.origin],
  );
  const truck = findTruck(s, truckId);
  const weightErr = weight <= 0 ? "Enter the cargo weight" : truck && weight > truck.capacityT ? `Exceeds ${fmtPlate(truck.reg)} capacity of ${truck.capacityT} t` : "";

  return (
    <Modal
      title="New shipment"
      description="Creates the order and a tracking ID the customer can use straight away."
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn primary"
            onClick={() => {
              setTouched(true);
              if (weightErr) return;
              const id = actions.createShipment({ customerId, routeId: laneDef.routeId, reversed: laneDef.reversed, cargo, weightT: weight, truckId: truckId || null });
              onCreated(id);
            }}
          >
            Create shipment
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Customer" full>
          <select className="select" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            {s.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company} · {c.contact}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Lane" hint={`${route.def.highway} · ${fmtKm(route.totalKm)} · about ${Math.round(route.totalKm / 30)} h on the road`} full>
          <select className="select" value={lane} onChange={(e) => setLane(e.target.value)}>
            {LANES.map((l) => (
              <option key={l.key} value={l.key}>
                {l.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Cargo">
          <select className="select" value={cargo} onChange={(e) => setCargo(e.target.value)}>
            {CARGO.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Weight (tonnes)" error={touched ? weightErr : undefined}>
          <input className={cx("input", touched && weightErr && "invalid")} type="number" step="0.5" min={0} value={weight} onChange={(e) => setWeight(Number(e.target.value))} />
        </Field>
        <Field label="Assign truck" hint="Trucks parked at the pickup city are listed first. You can assign later." full>
          <select className="select" value={truckId} onChange={(e) => setTruckId(e.target.value)}>
            <option value="">Assign later</option>
            {free.map((t) => (
              <option key={t.id} value={t.id}>
                {fmtPlate(t.reg)} · {t.type} · {t.capacityT} t · {t.status === "arrived" ? `at ${resolveRoute(t.routeId!, t.reversed).destination}` : `${t.depot} depot`}
              </option>
            ))}
          </select>
        </Field>
      </div>
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
      description={`${shipment.pickup} → ${shipment.delivery} · ${shipment.cargo} · ${shipment.weightT} t`}
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
      <div style={{ maxHeight: 360, overflow: "auto", border: "1px solid var(--border)", borderRadius: 10 }}>
        {free.map((t) => (
          <label key={t.id} className="list-row" style={{ cursor: "pointer", borderTop: 0, borderBottom: "1px solid var(--border)", background: pick === t.id ? "var(--blue-50)" : undefined, opacity: t.capacityT < shipment.weightT ? 0.5 : 1 }}>
            <input type="radio" name="truck" disabled={t.capacityT < shipment.weightT} checked={pick === t.id} onChange={() => setPick(t.id)} />
            <Plate reg={t.reg} />
            <span className="grow">
              <span style={{ display: "block", fontWeight: 500 }}>{t.type}</span>
              <span className="muted" style={{ fontSize: 12 }}>
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

const KINDS: NotificationKind[] = ["Shipment Dispatched", "In Transit", "Delivery Delay", "ETA Updated", "Out for Delivery", "Delivered"];

export function SendNotificationModal({ shipment, onClose }: { shipment: Shipment; onClose: () => void }) {
  const s = useAppState()!;
  const customer = findCustomer(s, shipment.customerId)!;
  const suggested: NotificationKind =
    shipment.status === "Delayed" ? "Delivery Delay" : shipment.status === "Out for Delivery" ? "Out for Delivery" : shipment.status === "Delivered" ? "Delivered" : shipment.status === "In Transit" ? "In Transit" : "Shipment Dispatched";
  const [kind, setKind] = useState<NotificationKind>(suggested);
  const [channel, setChannel] = useState<Channel>("WhatsApp");
  const t = findTruck(s, shipment.truckId);
  const route = resolveRoute(shipment.routeId, shipment.reversed);
  const preview = buildMessage(kind, {
    customerName: customer.contact,
    shipmentId: shipment.id,
    pickup: shipment.pickup,
    delivery: shipment.delivery,
    eta: shipment.eta,
    now: simNow(s),
    near: t ? route.stops[Math.max(0, route.cum.findIndex((c) => c > t.kmDone) - 1)] : shipment.pickup,
    next: t ? route.stops[Math.max(1, route.cum.findIndex((c) => c > t.kmDone))] ?? shipment.delivery : shipment.delivery,
    reason: shipment.delayReason,
    trackingLink: trackingLink(shipment.id),
    company: s.settings.companyName,
  });
  return (
    <Modal
      title="Send customer update"
      description={`${customer.contact} · ${customer.company} · ${customer.phone}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn primary"
            onClick={() => {
              actions.sendManualNotification(shipment.id, kind, channel);
              onClose();
            }}
          >
            Send {channel}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Message type">
          <select className="select" value={kind} onChange={(e) => setKind(e.target.value as NotificationKind)}>
            {KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </Field>
        <Field label="Channel">
          <div className="seg" style={{ width: "fit-content" }}>
            <button className={channel === "WhatsApp" ? "on" : ""} onClick={() => setChannel("WhatsApp")}>
              <IconWhatsApp size={14} /> WhatsApp
            </button>
            <button className={channel === "SMS" ? "on" : ""} onClick={() => setChannel("SMS")}>
              <IconSms size={14} /> SMS
            </button>
          </div>
        </Field>
        <Field label="Preview" full>
          <div className="bubble" style={{ maxWidth: "100%", background: channel === "WhatsApp" ? "#dcf8c6" : "#e7e9ee", boxShadow: "none" }}>
            {preview}
          </div>
        </Field>
      </div>
      <div className="sim-note" style={{ marginTop: 14 }}>
        Simulated send. No WhatsApp or SMS credentials are used in this demo.
      </div>
    </Modal>
  );
}
