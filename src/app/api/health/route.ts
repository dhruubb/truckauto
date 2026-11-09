import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ok: true, service: "shree-sai-trucks-demo", gps: "simulated", time: new Date().toISOString() });
}
