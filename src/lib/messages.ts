import { fmtCustomerEta, fmtPlate, fmtTime, firstName } from "./format";
import type { NotificationKind } from "./types";

export interface MessageContext {
  customerName: string;
  shipmentId: string;
  pickup: string;
  delivery: string;
  eta: number;
  now: number;
  near?: string;
  next?: string;
  reason?: string | null;
  /** This client's goods on the truck, e.g. "6 t of cotton fabric rolls" */
  cargo?: string;
  vehicle?: string | null;
  company: string;
  /** kept for older callers; links are no longer included in messages */
  trackingLink?: string;
}

export function buildMessage(kind: NotificationKind, c: MessageContext): string {
  const hello = `Hello ${firstName(c.customerName)}, `;
  const goods = c.cargo ? `your ${c.cargo}` : `your shipment ${c.shipmentId}`;
  const ref = ` (ref ${c.shipmentId})`;
  switch (kind) {
    case "Order Confirmed":
      return `${hello}we've booked ${goods} from ${c.pickup} to ${c.delivery}${ref}.${c.vehicle ? ` It will travel on truck ${fmtPlate(c.vehicle)}.` : ""} Expected delivery: ${fmtCustomerEta(c.eta, c.now)}. We'll update you here on WhatsApp. – ${c.company}`;
    case "Shipment Dispatched":
      return `${hello}${goods} has left ${c.pickup}${ref}. Expected delivery: ${fmtCustomerEta(c.eta, c.now)}. – ${c.company}`;
    case "In Transit":
      return `${hello}${goods} is near ${c.near}, heading to ${c.next}${ref}. Estimated arrival: ${fmtCustomerEta(c.eta, c.now)}. – ${c.company}`;
    case "Delivery Delay":
      return `${hello}${goods} is delayed due to ${c.reason ?? "traffic conditions"}${ref}. Revised delivery time: ${fmtCustomerEta(c.eta, c.now)}. Sorry for the inconvenience. – ${c.company}`;
    case "ETA Updated":
      return `${hello}the delivery time for ${goods} has changed${ref}. New estimate: ${fmtCustomerEta(c.eta, c.now)}. – ${c.company}`;
    case "Out for Delivery":
      return `Good news, ${firstName(c.customerName)}! ${goods.charAt(0).toUpperCase() + goods.slice(1)} is out for delivery in ${c.delivery} and should reach you by ${fmtTime(c.eta)} today${ref}. – ${c.company}`;
    case "Delivered":
      return `${hello}${goods} has been delivered in ${c.delivery}${ref}. Thank you for choosing ${c.company}!`;
  }
}

export const DELAY_REASONS = [
  "heavy traffic conditions",
  "congestion at a toll plaza",
  "road works on the highway",
  "heavy rain on the route",
  "a checkpost inspection",
  "a vehicle breakdown (repair in progress)",
  "late loading at the pickup point",
];

export function trackingLink(id: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  return `${origin}/track/${id}`;
}

/** Opens WhatsApp (app or web) with the message filled in, addressed to an Indian mobile number. */
export function whatsappLink(phone: string, text: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** "cotton fabric rolls" style lowercase cargo label with weight, used in messages. */
export function cargoPhrase(cargo: string, weightT: number): string {
  return `${weightT} t of ${cargo.charAt(0).toLowerCase()}${cargo.slice(1)}`;
}
