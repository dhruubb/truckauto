const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const nf = new Intl.NumberFormat("en-IN");

export function fmtNum(n: number, digits = 0): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
}

export function fmtKm(km: number): string {
  return `${nf.format(Math.max(0, Math.round(km)))} km`;
}

export function fmtTime(ts: number): string {
  const d = new Date(ts);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export function fmtDate(ts: number): string {
  const d = new Date(ts);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function fmtDateShort(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function fmtMonth(ts: number): string {
  return MONTHS[new Date(ts).getMonth()];
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** "Today, 4:00 PM" · "Tomorrow, 3:30 PM" · "Thu 12 Nov, 4:00 PM" */
export function fmtDayTime(ts: number, now: number): string {
  const diffDays = Math.round((startOfDay(ts) - startOfDay(now)) / 86400000);
  const t = fmtTime(ts);
  if (diffDays === 0) return `Today, ${t}`;
  if (diffDays === 1) return `Tomorrow, ${t}`;
  if (diffDays === -1) return `Yesterday, ${t}`;
  const d = new Date(ts);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}, ${t}`;
}

/** Phrase used inside customer messages: "3:30 PM tomorrow", "6:00 PM today", "November 12, 2026, by 4:00 PM" */
export function fmtCustomerEta(ts: number, now: number): string {
  const diffDays = Math.round((startOfDay(ts) - startOfDay(now)) / 86400000);
  if (diffDays === 0) return `${fmtTime(ts)} today`;
  if (diffDays === 1) return `${fmtTime(ts)} tomorrow`;
  const d = new Date(ts);
  const long = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return `${long}, by ${fmtTime(ts)}`;
}

export function fmtRel(ts: number, now: number): string {
  const s = Math.round((now - ts) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} d ago`;
}

export function fmtDuration(min: number): string {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}m`;
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h`;
  }
  return r ? `${h}h ${r}m` : `${h}h`;
}

export function fmtINR(n: number): string {
  return `₹${nf.format(Math.round(n))}`;
}

export function fmtINRCompact(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`;
  return fmtINR(n);
}

export function splitPlate(reg: string): string[] {
  const m = reg.match(/^([A-Z]{2})(\d{2})([A-Z]{1,3})(\d{4})$/);
  return m ? [m[1], m[2], m[3], m[4]] : [reg];
}

export function fmtPlate(reg: string): string {
  return splitPlate(reg).join(" ");
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function firstName(name: string): string {
  return name.split(/\s+/)[0] ?? name;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `+91 ${digits.slice(-10, -8)}XXX XX${digits.slice(-3)}`;
}
