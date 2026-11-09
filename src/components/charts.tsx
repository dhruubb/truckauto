"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

function useWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nf * exp;
}

export function Sparkline({ data, color = "var(--blue)", height = 34, width = 96 }: { data: number[]; color?: string; height?: number; width?: number }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * width, height - 3 - ((v - min) / span) * (height - 6)] as const);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} aria-hidden="true" style={{ overflow: "visible" }}>
      <path d={`${d}L${width},${height}L0,${height}Z`} fill={color} opacity={0.08} />
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={3} fill={color} stroke="#fff" strokeWidth={1.5} />
    </svg>
  );
}

export interface Series {
  name: string;
  color: string;
  values: number[];
}

export function LineChart({
  labels,
  series,
  height = 240,
  format = (v: number) => String(v),
  area = true,
  yMin,
}: {
  labels: string[];
  series: Series[];
  height?: number;
  format?: (v: number) => string;
  area?: boolean;
  yMin?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 44, r: 12, t: 12, b: 26 };
  const w = Math.max(0, width - pad.l - pad.r);
  const h = height - pad.t - pad.b;
  const all = series.flatMap((s) => s.values);
  const lo = yMin ?? 0;
  const hi = niceMax(Math.max(...all) * 1.05);
  const span = hi - lo || 1;
  const x = (i: number) => pad.l + (labels.length === 1 ? w / 2 : (i / (labels.length - 1)) * w);
  const y = (v: number) => pad.t + h - ((v - lo) / span) * h;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => lo + span * t);
  const step = Math.max(1, Math.ceil(labels.length / Math.max(1, Math.floor(w / 56))));

  return (
    <div className="chart" ref={ref} style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={series.map((s) => s.name).join(", ")}
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
            const px = e.clientX - rect.left - pad.l;
            const i = Math.round((px / (w || 1)) * (labels.length - 1));
            setHover(Math.max(0, Math.min(labels.length - 1, i)));
          }}
        >
          <g className="grid">
            {ticks.map((t) => (
              <line key={t} x1={pad.l} x2={pad.l + w} y1={y(t)} y2={y(t)} />
            ))}
          </g>
          <g className="axis">
            {ticks.map((t) => (
              <text key={t} x={pad.l - 8} y={y(t) + 4} textAnchor="end">
                {format(t)}
              </text>
            ))}
            {labels.map((l, i) =>
              (labels.length - 1 - i) % step === 0 ? (
                <text key={i} x={x(i)} y={height - 6} textAnchor="middle">
                  {l}
                </text>
              ) : null,
            )}
          </g>
          {series.map((s) => {
            const d = s.values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
            return (
              <g key={s.name}>
                {area && series.length === 1 && <path d={`${d}L${x(s.values.length - 1)},${y(lo)}L${x(0)},${y(lo)}Z`} fill={s.color} opacity={0.08} />}
                <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              </g>
            );
          })}
          {hover != null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + h} stroke="#c6cedb" strokeDasharray="3 3" />
              {series.map((s) => (
                <circle key={s.name} cx={x(hover)} cy={y(s.values[hover])} r={4.5} fill={s.color} stroke="#fff" strokeWidth={2} />
              ))}
            </g>
          )}
        </svg>
      )}
      {hover != null && width > 0 && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(x(hover), 70), width - 70), top: y(Math.max(...series.map((s) => s.values[hover]))) }}>
          <div className="ct-label">{labels[hover]}</div>
          {series.map((s) => (
            <div className="ct-row" key={s.name}>
              <i style={{ background: s.color }} />
              {series.length > 1 && <span>{s.name}:</span>}
              <b>{format(s.values[hover])}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function BarChart({
  labels,
  values,
  height = 240,
  color = "var(--blue)",
  format = (v: number) => String(v),
  highlight,
  tipLabel,
}: {
  labels: string[];
  values: number[];
  height?: number;
  color?: string;
  format?: (v: number) => string;
  highlight?: number;
  tipLabel?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 44, r: 8, t: 12, b: 26 };
  const w = Math.max(0, width - pad.l - pad.r);
  const h = height - pad.t - pad.b;
  const hi = niceMax(Math.max(...values) * 1.05);
  const band = w / values.length;
  const bw = Math.max(4, Math.min(34, band * 0.62));
  const y = (v: number) => pad.t + h - (v / hi) * h;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => hi * t);
  const step = Math.max(1, Math.ceil(labels.length / Math.max(1, Math.floor(w / 46))));
  return (
    <div className="chart" ref={ref} style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={tipLabel ?? "bar chart"}>
          <g className="grid">
            {ticks.map((t) => (
              <line key={t} x1={pad.l} x2={pad.l + w} y1={y(t)} y2={y(t)} />
            ))}
          </g>
          <g className="axis">
            {ticks.map((t) => (
              <text key={t} x={pad.l - 8} y={y(t) + 4} textAnchor="end">
                {format(t)}
              </text>
            ))}
            {labels.map((l, i) =>
              (labels.length - 1 - i) % step === 0 ? (
                <text key={i} x={pad.l + band * i + band / 2} y={height - 6} textAnchor="middle">
                  {l}
                </text>
              ) : null,
            )}
          </g>
          {values.map((v, i) => {
            const bx = pad.l + band * i + (band - bw) / 2;
            const by = y(v);
            const bh = pad.t + h - by;
            const r = Math.min(4, bh / 2, bw / 2);
            const fill = highlight != null && i !== highlight ? "#b9c9f5" : color;
            return (
              <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect x={pad.l + band * i} y={pad.t} width={band} height={h} fill="transparent" />
                <path
                  d={`M${bx},${pad.t + h}V${by + r}Q${bx},${by} ${bx + r},${by}H${bx + bw - r}Q${bx + bw},${by} ${bx + bw},${by + r}V${pad.t + h}Z`}
                  fill={fill}
                  opacity={hover == null || hover === i ? 1 : 0.55}
                />
              </g>
            );
          })}
        </svg>
      )}
      {hover != null && width > 0 && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(pad.l + band * hover + band / 2, 60), width - 60), top: y(values[hover]) }}>
          <div className="ct-label">{labels[hover]}</div>
          <b>{format(values[hover])}</b>
          {tipLabel && <span className="ct-label"> {tipLabel}</span>}
        </div>
      )}
    </div>
  );
}

export function HBarList({
  rows,
  color = "var(--blue)",
  format = (v: number) => String(v),
  max,
}: {
  rows: { label: ReactNode; value: number; title?: string; color?: string }[];
  color?: string;
  format?: (v: number) => string;
  max?: number;
}) {
  const hi = max ?? Math.max(...rows.map((r) => r.value), 1);
  return (
    <div>
      {rows.map((r, i) => (
        <div className="hbar-row" key={i} title={r.title}>
          <div className="ellipsis text-2">{r.label}</div>
          <div className="hbar-track">
            <div className="hbar-fill" style={{ width: `${(r.value / hi) * 100}%`, background: r.color ?? color }} />
          </div>
          <div className="right num" style={{ fontWeight: 600 }}>
            {format(r.value)}
          </div>
        </div>
      ))}
    </div>
  );
}
