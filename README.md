# Shree Sai Trucks · Fleet Intelligence & Shipment Tracking

A client demo of a fleet management platform for a 100-truck Indian logistics company. It includes:

- **Admin dashboard:** overview, live India fleet map, trucks, shipments, drivers, customers, analytics, alerts, notifications and settings.
- **Customer tracking portal:** `/track` and `/track/SST-2026-001`.
- **GPS simulator:** trucks move along real national-highway lanes.
- **Simulated WhatsApp and SMS:** automatic customer updates.

> **Demo data only.** No GPS hardware, WhatsApp or SMS provider is connected, and the interface says so wherever it matters. All trucks, drivers, customers and phone numbers are fictional.

Powered by KaptainX.

---

## Run it locally

You need **Node.js 18.18 or newer** (Node 20 or 22 recommended).

```bash
cd ~/Desktop/shree-sai-trucks
npm install
npm run dev
```

Open **http://localhost:3000**. On a phone on the same Wi-Fi, open `http://<your-mac-ip>:3000`.

## Deploy on Vercel

You can deploy in either of two ways:

- **Vercel CLI:** in this folder, run `npx vercel` and accept the defaults. Then run `npx vercel --prod` for the live URL.
- **GitHub:** push this folder to a GitHub repository. In Vercel, choose **Add New → Project**, import the repository and click **Deploy**.

Either way, Vercel detects Next.js automatically. There are no environment variables or API keys to set.

The font is **SF Pro Display**. It's self-hosted from `src/app/fonts/` through `next/font/local`.

## Presenting the demo

On a phone, the app has a bottom tab bar: **Home, Live, Shipments, Fleet (Trucks and Drivers) and Insights**. On desktop, the same sections are in a sidebar.

1. **Home** shows how many trucks are on the road, a live mini map, the KPIs, what's running late and what's arriving today.
2. **Live:** the map fills the screen. Drag the panel up to see every truck, then tap one (try MH 04 KT 7821, Mumbai → Delhi) for its ETA, driver, cargo and speed.
3. In the truck panel, tap **Delay**. The status and ETA update straight away.
4. **Shipments**, **Trucks** and **Drivers** have search and filters, and support add, edit, assign and status changes.
5. **Insights** has charts filtered by period and region.

Click the **Live · simulated GPS** pill to pause or resume the simulator. Use the avatar menu to reset the demo data.

---

## What's inside

| Area | Where |
| --- | --- |
| Pages (Next.js App Router) | `src/app/(admin)/*`, `src/app/track/*` |
| Live map (Leaflet + OpenStreetMap/CARTO tiles, custom clustering) | `src/components/FleetMap.tsx` |
| GPS simulation engine, demo actions, automatic notifications and alerts | `src/lib/store.ts` |
| Seed data (100 trucks, 110 drivers, 24 customers, ~150 shipments) | `src/lib/seed.ts` |
| Highway lanes and city coordinates | `src/lib/geo.ts` |
| Customer-safe tracking projection | `src/lib/tracking.ts` |
| API routes + service layer | `src/app/api/*`, `src/server/*` |
| Production data model (PostgreSQL) | `prisma/schema.prisma` |

### API (read-only, seeded on the server)

- `GET /api/trucks?status=onroad`
- `GET /api/shipments?status=Delayed`
- `GET /api/shipments/SST-2026-001`
- `GET /api/track/SST-2026-001`: the customer-safe view, with no other shipments and no driver contact details
- `GET /api/health`

### How the demo keeps everything in sync

The dashboard keeps one shared data store in the browser, saved to `localStorage`. Every page reads from it, so updating a truck or shipment shows up everywhere straight away. Other open tabs, such as the customer portal, get the change too. Only one tab runs the simulator at a time.

### Going to production

1. Install Prisma and point `DATABASE_URL` at PostgreSQL. Then run `npx prisma migrate dev`.
2. Replace `src/server/repository.ts` with Prisma queries, and move the browser actions in `src/lib/store.ts` to API calls.
3. Feed real GPS pings into `GpsLocation`. Most Indian telematics providers support webhooks.
4. Swap the simulated notification sender for WhatsApp Business API and DLT-registered SMS.

### Tech stack

Next.js 15 (App Router), React 19, TypeScript and Leaflet. The UI kit, icons and charts are written by hand in plain CSS and SVG, so the demo installs only four runtime packages and stays fast on any laptop.
