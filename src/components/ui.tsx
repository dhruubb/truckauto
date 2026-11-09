"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconCheck, IconX } from "./icons";
import { splitPlate } from "@/lib/format";
import type { AlertSeverity, ShipmentStatus, TruckStatus, DriverStatus } from "@/lib/types";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function Plate({ reg, size }: { reg: string; size?: "lg" }) {
  const parts = splitPlate(reg);
  return (
    <span className={cx("plate", size === "lg" && "lg")} title={`Registration ${reg}`}>
      <span className="ind">IND</span>
      <span className="chars">
        {parts.map((p, i) => (
          <span key={i}>{p}</span>
        ))}
      </span>
    </span>
  );
}

export const TRUCK_STATUS_META: Record<TruckStatus, { label: string; tone: string; color: string }> = {
  moving: { label: "Moving", tone: "green", color: "var(--green)" },
  delayed: { label: "Delayed", tone: "orange", color: "var(--orange)" },
  attention: { label: "Needs attention", tone: "red", color: "var(--red)" },
  idle: { label: "Parked", tone: "", color: "var(--grey)" },
  maintenance: { label: "Maintenance", tone: "", color: "var(--grey)" },
  arrived: { label: "At destination", tone: "slate", color: "var(--slate-blue)" },
};

export function TruckStatusBadge({ status }: { status: TruckStatus }) {
  const m = TRUCK_STATUS_META[status];
  return (
    <span className={cx("badge", m.tone)}>
      <span className="bdot" />
      {m.label}
    </span>
  );
}

const SHIP_TONE: Record<ShipmentStatus, string> = {
  "Order Confirmed": "",
  "Pickup Completed": "slate",
  "In Transit": "blue",
  Delayed: "orange",
  "Out for Delivery": "green",
  Delivered: "green",
};

export function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  return (
    <span className={cx("badge", SHIP_TONE[status])}>
      {status === "Delivered" ? <IconCheck size={12} strokeWidth={3} /> : <span className="bdot" />}
      {status}
    </span>
  );
}

const DRIVER_TONE: Record<DriverStatus, string> = { "On trip": "blue", Available: "green", Resting: "slate", "Off duty": "" };
export function DriverStatusBadge({ status }: { status: DriverStatus }) {
  return (
    <span className={cx("badge", DRIVER_TONE[status])}>
      <span className="bdot" />
      {status}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const map = { critical: ["red", "Critical"], warning: ["orange", "Warning"], info: ["blue", "Info"] } as const;
  return <span className={cx("badge", map[severity][0])}>{map[severity][1]}</span>;
}

export function Modal({
  title,
  description,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cx("modal", wide && "wide")} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button className="icon-btn ghost" onClick={onClose} aria-label="Close">
            <IconX size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ title, subtitle, onClose, children }: { title: ReactNode; subtitle?: ReactNode; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true">
        <div className="drawer-head">
          <div className="grow">
            <div style={{ fontWeight: 600, fontSize: 16 }}>{title}</div>
            {subtitle && <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button className="icon-btn ghost" onClick={onClose} aria-label="Close">
            <IconX size={18} />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
      </aside>
    </>
  );
}

export function Menu({ trigger, children, label = "More actions" }: { trigger: ReactNode; children: (close: () => void) => ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);
  return (
    <div className="menu-wrap" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button className="icon-btn ghost" aria-label={label} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {trigger}
      </button>
      {open && <div className="menu">{children(() => setOpen(false))}</div>}
    </div>
  );
}

export function Seg<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; count?: number }[] }) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} className={value === o.value ? "on" : ""} onClick={() => onChange(o.value)}>
          {o.label}
          {o.count != null && <span className="cnt">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="e-ico">{icon}</div>
      <b>{title}</b>
      {children}
    </div>
  );
}

export function Field({ label, hint, error, children, full }: { label: string; hint?: string; error?: string; children: ReactNode; full?: boolean }) {
  return (
    <div className={cx("field", full && "full")}>
      <label>{label}</label>
      {children}
      {error ? <span className="err">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export function Progress({ value, tone }: { value: number; tone?: "green" | "orange" | "red" }) {
  return (
    <div className={cx("progress", tone)}>
      <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Avatar({ name, size, soft }: { name: string; size?: "sm" | "lg"; soft?: boolean }) {
  const init = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  return <span className={cx("avatar", size, soft && "soft")}>{init}</span>;
}

/** Re-render every `ms` so relative times ("12s ago") stay fresh. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/** Read/write one URL query parameter with a soft navigation. */
export function useQueryParam(name: string): [string | null, (v: string | null) => void] {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const val = params?.get(name) ?? null;
  const set = (v: string | null) => {
    const p = new URLSearchParams(params?.toString() ?? "");
    if (v) p.set(name, v);
    else p.delete(name);
    const q = p.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };
  return [val, set];
}

export function copyText(text: string) {
  try {
    void navigator.clipboard?.writeText(text);
  } catch {
    /* clipboard blocked */
  }
}

/** Phone-only switch between the Trucks and Drivers lists (they share the Fleet tab). */
export function FleetSwitch({ active }: { active: "trucks" | "drivers" }) {
  return (
    <div className="seg block only-phone" style={{ marginBottom: 14 }}>
      <Link href="/trucks" className={active === "trucks" ? "on" : ""}>
        Trucks
      </Link>
      <Link href="/drivers" className={active === "drivers" ? "on" : ""}>
        Drivers
      </Link>
    </div>
  );
}

