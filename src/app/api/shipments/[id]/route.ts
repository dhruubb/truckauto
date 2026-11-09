import { NextResponse } from "next/server";
import { shipmentService } from "@/server/services";

export const dynamic = "force-dynamic";

/** GET /api/shipments/SST-2026-001 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shipment = shipmentService.get(id.toUpperCase());
  if (!shipment) return NextResponse.json({ error: `Shipment ${id} not found` }, { status: 404 });
  return NextResponse.json({ shipment });
}
