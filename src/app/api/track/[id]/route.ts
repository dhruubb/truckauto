import { NextResponse } from "next/server";
import { trackingService } from "@/server/services";

export const dynamic = "force-dynamic";

/** GET /api/track/SST-2026-001 — public, customer-safe tracking data. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tracking = trackingService.get(id);
  if (!tracking) return NextResponse.json({ error: "No shipment found for this tracking ID" }, { status: 404 });
  return NextResponse.json({ tracking });
}
