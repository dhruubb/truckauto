import { NextResponse, type NextRequest } from "next/server";
import { shipmentService } from "@/server/services";
import type { ShipmentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUSES: ShipmentStatus[] = ["Order Confirmed", "Pickup Completed", "In Transit", "Delayed", "Out for Delivery", "Delivered"];

/** GET /api/shipments?status=Delayed */
export function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  if (status && !STATUSES.includes(status as ShipmentStatus)) {
    return NextResponse.json({ error: `Unknown status "${status}". Use one of: ${STATUSES.join(", ")}` }, { status: 400 });
  }
  return NextResponse.json({ shipments: shipmentService.list(status ? { status: status as ShipmentStatus } : undefined) });
}
