"use client";

import { useEffect, type ReactNode } from "react";
import { dismissToast, initStore, useToasts } from "@/lib/store";
import { IconAlert, IconCheck, IconInfo, IconSms, IconWhatsApp, IconX, Logo } from "./icons";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    initStore();
  }, []);
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}

function Toaster() {
  const toasts = useToasts();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone}`}>
          <div className="t-ico">
            {t.tone === "whatsapp" ? (
              <IconWhatsApp size={16} />
            ) : t.tone === "sms" ? (
              <IconSms size={16} />
            ) : t.tone === "warning" || t.tone === "danger" ? (
              <IconAlert size={16} />
            ) : t.tone === "success" ? (
              <IconCheck size={16} />
            ) : (
              <IconInfo size={16} />
            )}
          </div>
          <div className="grow">
            <b>{t.title}</b>
            {t.body && <span>{t.body}</span>}
          </div>
          <button onClick={() => dismissToast(t.id)} aria-label="Dismiss">
            <IconX size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function BootScreen({ label = "Loading fleet data" }: { label?: string }) {
  return (
    <div className="boot">
      <div className="boot-inner">
        <Logo size={44} />
        <div className="boot-bar" />
        <span style={{ fontSize: 13 }}>{label}</span>
      </div>
    </div>
  );
}
