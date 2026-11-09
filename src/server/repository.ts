// Data access layer for the API routes.
//
// The demo keeps an in-memory, seeded copy of the data on the server so the
// API works with zero setup. To go to production, replace these functions with
// Prisma queries against PostgreSQL (see prisma/schema.prisma) — the service
// layer and routes above this file do not need to change.

import { createSeed } from "@/lib/seed";
import type { AppState } from "@/lib/types";

const g = globalThis as unknown as { __sstState?: AppState };

export function getSnapshot(): AppState {
  // Reseed every few hours so ETAs stay relative to "now".
  if (!g.__sstState || Date.now() - g.__sstState.seededAt > 4 * 3600_000) g.__sstState = createSeed(Date.now());
  return g.__sstState;
}
