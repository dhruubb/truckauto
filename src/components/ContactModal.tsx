"use client";

import { useEffect, useState } from "react";
import { IconPhone, IconSend, IconWhatsApp } from "./icons";
import { Avatar, Modal } from "./ui";
import { pushToast as pushToastSafe } from "@/lib/store";

export function ContactModal({ name, phone, role, onClose }: { name: string; phone: string; role: string; onClose: () => void }) {
  const [mode, setMode] = useState<"choose" | "calling" | "message">("choose");
  const [secs, setSecs] = useState(0);
  const [msg, setMsg] = useState(`Hi ${name.split(" ")[0]}, please share your current location and expected time at the next checkpoint.`);
  useEffect(() => {
    if (mode !== "calling") return;
    const id = setInterval(() => setSecs((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [mode]);

  return (
    <Modal
      title={`Contact ${name}`}
      description={`${role} · ${phone}`}
      onClose={onClose}
      footer={
        mode === "calling" ? (
          <button className="btn" style={{ background: "var(--red)", borderColor: "var(--red)", color: "#fff" }} onClick={onClose}>
            End call
          </button>
        ) : mode === "message" ? (
          <>
            <button className="btn ghost" onClick={() => setMode("choose")}>
              Back
            </button>
            <button
              className="btn primary"
              onClick={() => {
                pushToastSafe({ tone: "whatsapp", title: `WhatsApp sent to ${name}`, body: "Simulated message from the dispatch desk." });
                onClose();
              }}
            >
              <IconSend size={15} />
              Send WhatsApp
            </button>
          </>
        ) : (
          <button className="btn" onClick={onClose}>
            Close
          </button>
        )
      }
    >
      {mode === "choose" && (
        <div className="stack" style={{ gap: 12 }}>
          <div className="row" style={{ gap: 12 }}>
            <Avatar name={name} size="lg" soft />
            <div>
              <div style={{ fontWeight: 600 }}>{name}</div>
              <div className="muted">{phone}</div>
            </div>
          </div>
          <div className="grid g-2" style={{ gap: 10 }}>
            <button className="btn lg" onClick={() => setMode("calling")}>
              <IconPhone size={16} />
              Call via dispatch line
            </button>
            <button className="btn lg" onClick={() => setMode("message")}>
              <IconWhatsApp size={16} />
              Send WhatsApp
            </button>
          </div>
          <div className="sim-note">Demo mode: calls and messages are simulated. No real phone numbers are contacted.</div>
        </div>
      )}
      {mode === "calling" && (
        <div className="empty" style={{ padding: "28px 0" }}>
          <Avatar name={name} size="lg" />
          <b>Calling {name}…</b>
          <span className="num">
            {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")} · simulated call
          </span>
        </div>
      )}
      {mode === "message" && (
        <div className="field">
          <label htmlFor="drv-msg">Message</label>
          <textarea id="drv-msg" className="textarea" value={msg} onChange={(e) => setMsg(e.target.value)} />
          <span className="hint">Sent from the Shree Sai Trucks dispatch number (simulated).</span>
        </div>
      )}
    </Modal>
  );
}
