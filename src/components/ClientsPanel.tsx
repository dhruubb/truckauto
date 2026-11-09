"use client";

import { useState } from "react";
import { actions, findCustomer, shipmentClients, simNow, useAppState } from "@/lib/store";
import { whatsappLink } from "@/lib/messages";
import { fmtRel, fmtTime } from "@/lib/format";
import type { Shipment } from "@/lib/types";
import { AddClientModal, SendNotificationModal } from "./ShipmentModals";
import { IconMore, IconPlus, IconWhatsApp } from "./icons";
import { Avatar, Menu } from "./ui";

/** Everyone whose goods are on this truck, and the WhatsApp updates they've received. */
export function ClientsPanel({ shipment }: { shipment: Shipment }) {
  const s = useAppState()!;
  const now = simNow(s);
  const [modal, setModal] = useState<{ kind: "add" } | { kind: "send"; customerId?: string } | null>(null);
  const clients = shipmentClients(shipment);
  const delivered = shipment.status === "Delivered";
  const msgs = s.notifications.filter((n) => n.shipmentId === shipment.id);

  return (
    <section>
      <div className="section-title" style={{ marginTop: 8 }}>
        <h2 style={{ fontSize: 17 }}>
          {clients.length > 1 ? `${clients.length} clients on this truck` : "Client"}
        </h2>
        {!delivered && (
          <button onClick={() => setModal({ kind: "add" })}>
            <span className="row" style={{ gap: 4 }}>
              <IconPlus size={15} /> Add client
            </span>
          </button>
        )}
      </div>
      <div className="group">
        {clients.map((c, i) => {
          const cu = findCustomer(s, c.customerId);
          if (!cu) return null;
          const last = msgs.find((n) => n.customerId === c.customerId);
          return (
            <div key={c.customerId} className="cell inset" style={{ alignItems: "flex-start" }}>
              <Avatar name={cu.company} size="sm" soft />
              <span className="grow">
                <span className="cell-title" style={{ display: "block" }}>
                  {cu.company}
                </span>
                <span className="cell-sub" style={{ display: "block" }}>
                  {cu.contact !== cu.company ? `${cu.contact} · ` : ""}
                  {c.cargo} · {c.weightT} t
                </span>
                {last && (
                  <span className="wa-status">
                    <IconWhatsApp size={13} /> {last.kind} · {last.status === "Pending" ? "sending…" : "delivered"} · {fmtRel(last.createdAt, now)}
                  </span>
                )}
              </span>
              <button className="icon-btn wa" onClick={() => setModal({ kind: "send", customerId: c.customerId })} aria-label={`Send WhatsApp update to ${cu.contact}`}>
                <IconWhatsApp size={17} />
              </button>
              {i > 0 && !delivered && (
                <Menu trigger={<IconMore size={18} />} label={`More for ${cu.company}`}>
                  {(close) => (
                    <button
                      onClick={() => {
                        close();
                        actions.removeClient(shipment.id, c.customerId);
                      }}
                      style={{ color: "var(--red-text)" }}
                    >
                      Remove from this truck
                    </button>
                  )}
                </Menu>
              )}
            </div>
          );
        })}
      </div>
      <button className="btn block wa-btn" style={{ marginTop: 10 }} onClick={() => setModal({ kind: "send" })}>
        <IconWhatsApp size={17} /> {clients.length > 1 ? `Send update to all ${clients.length} clients` : "Send WhatsApp update"}
      </button>

      <div className="section-title">
        <h2 style={{ fontSize: 17 }}>WhatsApp updates</h2>
        <span className="muted" style={{ fontSize: 14 }}>
          {msgs.length} sent
        </span>
      </div>
      <div className="wa-thread">
        {msgs.length === 0 && <div className="muted" style={{ padding: 12, fontSize: 14 }}>No messages yet. Clients get one as soon as the shipment is booked.</div>}
        {msgs.slice(0, 12).map((n) => {
          const cu = findCustomer(s, n.customerId);
          return (
            <div key={n.id} className="wa-msg">
              <div className="wa-to">
                To {cu?.contact}
                {cu && cu.company !== cu.contact ? ` · ${cu.company}` : ""}
              </div>
              <div className="wa-bubble">
                {n.message}
                <span className="wa-meta">
                  {fmtTime(n.createdAt)} {n.status === "Pending" ? "◷" : n.status === "Failed" ? "!" : "✓✓"}
                </span>
              </div>
              {cu && !cu.demo && (
                <a className="wa-open" href={whatsappLink(cu.phone, n.message)} target="_blank" rel="noreferrer">
                  Open in WhatsApp to send
                </a>
              )}
            </div>
          );
        })}
      </div>
      <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
        Demo clients are sent simulated messages. Add a client with your own number to send the message for real through WhatsApp.
      </p>

      {modal?.kind === "add" && <AddClientModal shipment={shipment} onClose={() => setModal(null)} />}
      {modal?.kind === "send" && <SendNotificationModal shipment={shipment} onlyCustomerId={modal.customerId} onClose={() => setModal(null)} />}
    </section>
  );
}
