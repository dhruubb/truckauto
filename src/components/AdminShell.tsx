"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { actions, isOnRoad, useAppState } from "@/lib/store";
import { fmtPlate } from "@/lib/format";
import { resolveRoute } from "@/lib/geo";
import { IconChart, IconDriver, IconHome, IconMap, IconPackage, IconRefresh, IconSearch, IconTruck, Logo } from "./icons";
import { BootScreen } from "./Providers";
import { cx } from "./ui";

const SIDE = [
  { href: "/", label: "Overview", icon: IconHome },
  { href: "/fleet", label: "Live Fleet", icon: IconMap, count: "onroad" as const },
  { href: "/shipments", label: "Shipments", icon: IconPackage, count: "active" as const },
  { href: "/trucks", label: "Trucks", icon: IconTruck },
  { href: "/drivers", label: "Drivers", icon: IconDriver },
  { href: "/analytics", label: "Analytics", icon: IconChart },
];

const TABS = [
  { href: "/", label: "Home", icon: IconHome, match: (p: string) => p === "/" },
  { href: "/fleet", label: "Live", icon: IconMap, match: (p: string) => p.startsWith("/fleet") },
  { href: "/shipments", label: "Shipments", icon: IconPackage, match: (p: string) => p.startsWith("/shipments") },
  { href: "/trucks", label: "Fleet", icon: IconTruck, match: (p: string) => p.startsWith("/trucks") || p.startsWith("/drivers") },
  { href: "/analytics", label: "Insights", icon: IconChart, match: (p: string) => p.startsWith("/analytics") },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const s = useAppState();
  const pathname = usePathname() ?? "/";
  if (!s) return <BootScreen />;
  const counts = {
    onroad: s.trucks.filter(isOnRoad).length,
    active: s.shipments.filter((x) => x.status !== "Delivered").length,
  };
  const isMap = pathname.startsWith("/fleet");

  return (
    <div className="app">
      <aside className="side">
        <Link href="/" className="side-brand">
          <Logo size={36} />
          <div>
            <b>Shree Sai Trucks</b>
            <span>Fleet &amp; shipments</span>
          </div>
        </Link>
        <nav className="side-nav" aria-label="Main">
          {SIDE.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={cx("side-item", active && "active")}>
                <Icon size={19} />
                {item.label}
                {item.count && <span className="count">{counts[item.count]}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="side-foot">
          <SearchBox />
          <LivePill />
          <div className="side-credit">
            Powered by <b>KaptainX</b>
          </div>
        </div>
      </aside>

      <div className="main">
        {!isMap && (
          <header className="mbar">
            <Link href="/" className="mbar-brand">
              <Logo size={30} />
              <b>Shree Sai Trucks</b>
            </Link>
            <div className="row">
              <LivePill />
              <AccountMenu />
            </div>
          </header>
        )}
        <Suspense fallback={null}>{children}</Suspense>
      </div>

      <nav className="tabbar" aria-label="Sections">
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = t.match(pathname);
          return (
            <Link key={t.href} href={t.href} className={cx("tab", on && "active")}>
              <Icon size={24} strokeWidth={on ? 2.2 : 1.8} />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function LivePill() {
  const s = useAppState()!;
  return (
    <button
      className={cx("live-pill", !s.sim.running && "paused")}
      onClick={() => actions.setRunning(!s.sim.running)}
      title="Truck positions are simulated for this demo. Tap to pause or resume."
    >
      <span className="dot" />
      {s.sim.running ? "Live · simulated" : "Paused"}
    </button>
  );
}

function AccountMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    document.addEventListener("touchstart", h);
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("touchstart", h);
    };
  }, [open]);
  return (
    <div className="menu-wrap" ref={ref}>
      <button className="avatar sm" style={{ border: 0 }} onClick={() => setOpen((v) => !v)} aria-label="Account">
        SO
      </button>
      {open && (
        <div className="menu">
          <div className="menu-label">Sai Operations · Admin</div>
          <hr />
          <button
            onClick={() => {
              setOpen(false);
              actions.reset(false);
            }}
          >
            <IconRefresh size={17} /> Reset demo data
          </button>
        </div>
      )}
    </div>
  );
}

function SearchBox() {
  const s = useAppState()!;
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase().replace(/\s+/g, "");
    if (term.length < 2) return [];
    const out: { key: string; label: string; sub: string; href: string }[] = [];
    for (const t of s.trucks) {
      if (t.reg.toLowerCase().includes(term)) {
        const r = t.routeId ? resolveRoute(t.routeId, t.reversed) : null;
        out.push({ key: t.id, label: fmtPlate(t.reg), sub: r && isOnRoad(t) ? `${r.origin} → ${r.destination}` : `${t.depot} depot`, href: `/fleet?truck=${t.id}` });
      }
    }
    for (const x of s.shipments) {
      if (x.id.toLowerCase().replace(/-/g, "").includes(term.replace(/-/g, ""))) out.push({ key: x.id, label: x.id, sub: `${x.pickup} → ${x.delivery}`, href: `/shipments/${x.id}` });
    }
    for (const d of s.drivers) {
      if (d.name.toLowerCase().replace(/\s+/g, "").includes(term)) out.push({ key: d.id, label: d.name, sub: "Driver", href: `/drivers?driver=${d.id}` });
    }
    return out.slice(0, 7);
  }, [q, s]);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };

  return (
    <div className="search" ref={wrap}>
      <IconSearch size={16} />
      <input
        className="input"
        value={q}
        placeholder="Search"
        aria-label="Search trucks, shipments, drivers"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setIdx(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setIdx((i) => Math.min(i + 1, results.length - 1));
          else if (e.key === "ArrowUp") setIdx((i) => Math.max(i - 1, 0));
          else if (e.key === "Enter" && results[idx]) go(results[idx].href);
          else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && q.trim().length >= 2 && (
        <div className="menu" style={{ left: 0, right: "auto", top: "auto", bottom: "calc(100% + 6px)", width: 300 }}>
          {results.length === 0 ? (
            <div className="menu-label">No match for “{q}”</div>
          ) : (
            results.map((r, i) => (
              <button key={r.key} onMouseEnter={() => setIdx(i)} onClick={() => go(r.href)} style={i === idx ? { background: "var(--fill-2)" } : undefined}>
                <span className="grow">
                  <span style={{ display: "block", fontWeight: 500 }}>{r.label}</span>
                  <span className="muted" style={{ fontSize: 13 }}>
                    {r.sub}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
