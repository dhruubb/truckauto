import { fmtDayTime } from "@/lib/format";
import type { Shipment } from "@/lib/types";
import { timelineSteps } from "@/lib/timeline";
import { IconBox, IconCheck, IconClock, IconFlag, IconPackage, IconTruck, IconNavigation, IconHome } from "./icons";
import { cx } from "./ui";

const ICONS: Record<string, typeof IconCheck> = {
  created: IconPackage,
  assigned: IconTruck,
  picked: IconBox,
  dispatched: IconFlag,
  transit: IconNavigation,
  out: IconClock,
  delivered: IconHome,
};

export function ShipmentTimeline({ shipment, now, currentLocation, publicMode }: { shipment: Shipment; now: number; currentLocation: string | null; publicMode?: boolean }) {
  const steps = timelineSteps(shipment, currentLocation, publicMode);
  return (
    <ol className="timeline">
      {steps.map((st) => {
        const Icon = st.done ? IconCheck : ICONS[st.key];
        const late = st.current && shipment.status === "Delayed";
        return (
          <li key={st.key} className={cx(st.done ? "done" : st.current ? "current" : "pending", late && "late")}>
            <span className="tl-dot">
              <Icon size={14} strokeWidth={st.done ? 3 : 2} />
            </span>
            <div>
              <div className="tl-title">{st.title}</div>
              <div className="tl-meta">
                {st.done && st.at ? fmtDayTime(st.at, now) : st.current ? (st.key === "delivered" || st.key === "out" ? `Expected ${fmtDayTime(shipment.eta, now)}` : "In progress") : "Pending"}
                {st.note && <span style={{ display: "block", color: late ? "var(--orange-text)" : "var(--blue-600)" }}>{st.note}</span>}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
