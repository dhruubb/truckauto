import { NextResponse, type NextRequest } from "next/server";
import { fleetService } from "@/server/services";
import type { TruckStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUSES = ["moving", "delayed", "attention", "idle", "maintenance", "arrived", "onroad"];

/** GET /api/trucks?status=onroad — fleet positions (simulated GPS). */
export function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  if (status && !STATUSES.includes(status)) {
    return NextResponse.json({ error: `Unknown status "${status}". Use one of: ${STATUSES.join(", ")}` }, { status: 400 });
  }
  return NextResponse.json({ summary: fleetService.summary(), trucks: fleetService.listTrucks(status ? { status: status as TruckStatus | "onroad" } : undefined) });
}
