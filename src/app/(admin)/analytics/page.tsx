"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BarChart, HBarList, LineChart } from "@/components/charts";
import { IconTrendDown, IconTrendUp } from "@/components/icons";
import { Plate, Seg, cx } from "@/components/ui";
import { citiesBreakdown, delayReasons, laneDelays, monthlyHistory, truckPerformance, type Period, type RegionFilter } from "@/lib/analytics";
import { simNow, useAppState } from "@/lib/store";
import { fmtINRCompact, fmtNum } from "@/lib/format";

function Kpi({ label, value, delta, invert, unit }: { label: string; value: string; delta: number; invert?: boolean; unit?: string }) {
  const good = invert ? delta < 0 : delta > 0;
  return (
    <div className="kpi-tile">
      <div className="kl">{label}</div>
      <div className="kv2">
        {value}
        {unit && <small>{unit}</small>}
      </div>
      <span className={cx("delta", delta === 0 ? "neutral" : good ? "up" : "down")}>
        {delta > 0 ? <IconTrendUp size={14} /> : <IconTrendDown size={14} />}
        {delta > 0 ? "+" : ""}
        {delta.toFixed(1)}%
      </span>
    </div>
  );
}

export default function AnalyticsPage() {
  const s = useAppState()!;
  const [period, setPeriod] = useState<Period>(6);
  const [region, setRegion] = useState<RegionFilter>("All");
  const now = simNow(s);
  const all = useMemo(() => monthlyHistory(now, region), [region, Math.floor(now / 86400000)]); // eslint-disable-line react-hooks/exhaustive-deps
  const cur = all.slice(-period);
  const prev = all.slice(-period * 2, -period);
  const sum = (rows: typeof all, k: "deliveries" | "revenue" | "delayed") => rows.reduce((n, r) => n + r[k], 0);
  const avg = (rows: typeof all, k: "onTime" | "avgHours" | "utilization") => rows.reduce((n, r) => n + r[k], 0) / Math.max(1, rows.length);
  const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);

  const cities = citiesBreakdown(period, region).slice(0, 10);
  const reasons = delayReasons(period, region);
  const lanes = laneDelays(region);
  const trucks = truckPerformance(s, period, region);


  return (
    <div className="page">
      <div className="large-title">
        <div>
          <h1>Insights</h1>
          <p>{region === "All" ? "All regions" : `${region} region`} · last {period} months</p>
        </div>
      </div>
      <div className="toolbar">
        <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
          <Seg
            value={String(period) as "3" | "6" | "12"}
            onChange={(v) => setPeriod(Number(v) as Period)}
            options={[
              { value: "3", label: "3 months" },
              { value: "6", label: "6 months" },
              { value: "12", label: "12 months" },
            ]}
          />
          <Seg
            value={region}
            onChange={setRegion}
            options={(["All", "West", "North", "South", "East"] as RegionFilter[]).map((r) => ({ value: r, label: r }))}
          />
        </div>
      </div>

      <div className="kpi-row">
        <Kpi label="Deliveries" value={fmtNum(sum(cur, "deliveries"))} delta={pct(sum(cur, "deliveries"), sum(prev, "deliveries"))} />
        <Kpi label="On-time delivery" value={avg(cur, "onTime").toFixed(1)} unit="%" delta={pct(avg(cur, "onTime"), avg(prev, "onTime"))} />
        <Kpi label="Avg delivery duration" value={avg(cur, "avgHours").toFixed(1)} unit="h" delta={pct(avg(cur, "avgHours"), avg(prev, "avgHours"))} invert />
        <Kpi label="Fleet utilisation" value={avg(cur, "utilization").toFixed(0)} unit="%" delta={pct(avg(cur, "utilization"), avg(prev, "utilization"))} />
        <Kpi label="Revenue" value={fmtINRCompact(sum(cur, "revenue"))} delta={pct(sum(cur, "revenue"), sum(prev, "revenue"))} />
      </div>

      <div className="split-even" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Monthly shipments</h3>
              <div className="sub">Completed deliveries per month</div>
            </div>
          </div>
          <div className="card-body">
            <LineChart labels={cur.map((r) => r.label)} series={[{ name: "Deliveries", color: "#2457e6", values: cur.map((r) => r.deliveries) }]} format={(v) => fmtNum(v)} />
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Revenue</h3>
              <div className="sub">Freight billed per month (sample data)</div>
            </div>
          </div>
          <div className="card-body">
            <BarChart labels={cur.map((r) => r.label)} values={cur.map((r) => r.revenue)} format={(v) => fmtINRCompact(v)} highlight={cur.length - 1} tipLabel="billed" />
          </div>
        </div>
      </div>

      <div className="three" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card-head">
            <div>
              <h3>On-time delivery</h3>
              <div className="sub">Delivered within 1 hour of plan</div>
            </div>
          </div>
          <div className="card-body">
            <LineChart labels={cur.map((r) => r.label)} series={[{ name: "On-time %", color: "#16a34a", values: cur.map((r) => r.onTime) }]} format={(v) => `${v.toFixed(0)}%`} yMin={80} height={200} area={false} />
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Deliveries by city</h3>
              <div className="sub">Top destinations, last {period} months</div>
            </div>
          </div>
          <div className="card-body">
            <HBarList rows={cities.map((c) => ({ label: c.city, value: c.value }))} format={(v) => fmtNum(v)} />
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Why shipments were late</h3>
              <div className="sub">{fmtNum(sum(cur, "delayed"))} delayed shipments</div>
            </div>
          </div>
          <div className="card-body">
            <HBarList rows={reasons.map((r) => ({ label: r.reason, value: r.value }))} color="var(--orange)" format={(v) => fmtNum(v)} />
          </div>
        </div>
      </div>

      <div className="split" style={{ marginTop: 16 }}>
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="card-head" style={{ paddingBottom: 14 }}>
            <div>
              <h3>Truck performance</h3>
              <div className="sub">Top 10 by revenue, last {period} months</div>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Truck</th>
                  <th className="right">Trips</th>
                  <th className="right">Distance</th>
                  <th className="right">On-time</th>
                  <th className="right">Utilisation</th>
                  <th className="right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {trucks.map((r) => (
                  <tr key={r.truck.id}>
                    <td>
                      <Link href={`/trucks/${r.truck.id}`} className="row" style={{ gap: 10 }}>
                        <Plate reg={r.truck.reg} />
                        <span className="cell-sub">{r.truck.model}</span>
                      </Link>
                    </td>
                    <td className="right num">{r.trips}</td>
                    <td className="right num">{fmtNum(r.km)} km</td>
                    <td className="right num">{r.onTime}%</td>
                    <td className="right num">{r.utilization}%</td>
                    <td className="right num" style={{ fontWeight: 600 }}>
                      {fmtINRCompact(r.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Average delay by lane</h3>
              <div className="sub">Hours behind plan per delayed trip</div>
            </div>
          </div>
          <div className="card-body">
            <HBarList rows={lanes.map((l) => ({ label: l.lane, value: l.hours, title: l.lane }))} color="var(--orange)" format={(v) => `${v.toFixed(1)} h`} />
          </div>
        </div>
      </div>
      <p className="muted" style={{ fontSize: 13, marginTop: 16 }}>Reports use sample history for the demo.</p>
    </div>
  );
}
