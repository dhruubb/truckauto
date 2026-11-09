import { fmtCustomerEta, fmtTime, firstName } from "./format";
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
  trackingLink: string;
  company: string;
}

export function buildMessage(kind: NotificationKind, c: MessageContext): string {
  const hello = `Hello ${firstName(c.customerName)}, `;
  switch (kind) {
    case "Shipment Dispatched":
      return `${hello}your shipment ${c.shipmentId} has been dispatched from ${c.pickup}. Your expected delivery is ${fmtCustomerEta(c.eta, c.now)}. Track your shipment here: ${c.trackingLink}`;
    case "In Transit":
      return `${hello}your shipment ${c.shipmentId} is currently near ${c.near} and progressing towards ${c.next}. Estimated arrival: ${fmtCustomerEta(c.eta, c.now)}. Track: ${c.trackingLink}`;
    case "Delivery Delay":
      return `${hello}your shipment ${c.shipmentId} has experienced a delay due to ${c.reason ?? "traffic conditions"}. Your revised expected delivery time is ${fmtCustomerEta(c.eta, c.now)}. We're sorry for the inconvenience. Track: ${c.trackingLink}`;
    case "ETA Updated":
      return `${hello}the expected delivery time for shipment ${c.shipmentId} has changed. New estimate: ${fmtCustomerEta(c.eta, c.now)}. Track: ${c.trackingLink}`;
    case "Out for Delivery":
      return `Good news, ${firstName(c.customerName)}! Your shipment ${c.shipmentId} is out for delivery and is expected to reach you in ${c.delivery} by ${fmtTime(c.eta)} today.`;
    case "Delivered":
      return `Your shipment ${c.shipmentId} has been successfully delivered in ${c.delivery}. Thank you for choosing ${c.company}!`;
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
