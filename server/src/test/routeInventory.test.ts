import { beforeAll, describe, expect, it } from "vitest";
import type { Router } from "express";
import { MOUNTS } from "../app";
import { ROUTE_POLICY, isPolicyRequired } from "../routePolicy";

// Every mounted route must appear in ROUTE_POLICY. Routes that read or
// write person/couple/referral/relative/consent data must carry a
// policy action (kind: "policy"). The map is also the single source of
// the public allowlist — if a route is kind: "public" it is public.

interface InventoryEntry {
  method: string;
  path: string;
  gated: boolean;
  handlers: string[];
}

interface MinimalLayer {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: Array<{ name?: string; handle?: { name?: string } }>;
  };
}

function enumerateRouter(router: Router, prefix: string, out: InventoryEntry[]): void {
  const stack = (router as unknown as { stack: MinimalLayer[] }).stack ?? [];
  for (const layer of stack) {
    if (!layer.route) continue;
    const methods = Object.keys(layer.route.methods).filter((m) => layer.route!.methods[m]);
    const handlers = layer.route.stack.map((h) => h.handle?.name ?? h.name ?? "");
    const gated = handlers.includes("requireSession");
    for (const method of methods) {
      let full = `${prefix}${layer.route.path}`;
      if (full.length > 1 && full.endsWith("/")) full = full.slice(0, -1);
      out.push({ method: method.toUpperCase(), path: full, gated, handlers });
    }
  }
}

function enumerate(): InventoryEntry[] {
  const out: InventoryEntry[] = [];
  for (const m of MOUNTS) enumerateRouter(m.router, m.prefix, out);
  return out;
}

describe("route inventory", () => {
  let routes: InventoryEntry[];

  beforeAll(() => {
    routes = enumerate();
  });

  it("every mounted route has an entry in ROUTE_POLICY", () => {
    const missing: string[] = [];
    for (const r of routes) {
      const key = `${r.method} ${r.path}`;
      if (!(key in ROUTE_POLICY)) missing.push(key);
    }
    expect(missing, `routes missing from ROUTE_POLICY: ${missing.join(", ")}`).toEqual([]);
  });

  it("no ROUTE_POLICY entry names a route that no longer exists", () => {
    const seen = new Set(routes.map((r) => `${r.method} ${r.path}`));
    const dead: string[] = [];
    for (const key of Object.keys(ROUTE_POLICY)) {
      if (!seen.has(key)) dead.push(key);
    }
    expect(dead, `stale ROUTE_POLICY entries: ${dead.join(", ")}`).toEqual([]);
  });

  it("every sensitive route (/me, /couple, /consent, /partner, /relatives, /referrals, /counsellor) carries kind: policy", () => {
    const bad: string[] = [];
    for (const r of routes) {
      if (!isPolicyRequired(r.path)) continue;
      const entry = ROUTE_POLICY[`${r.method} ${r.path}`];
      if (!entry || entry.kind !== "policy" || entry.action.length === 0) {
        bad.push(`${r.method} ${r.path}`);
      }
    }
    expect(
      bad,
      `sensitive routes without a policy action: ${bad.join(", ")}`,
    ).toEqual([]);
  });

  it("every public and session_only entry carries a reason", () => {
    const bad: string[] = [];
    for (const [key, entry] of Object.entries(ROUTE_POLICY)) {
      if (entry.kind === "policy") continue;
      if (!entry.reason || entry.reason.trim().length === 0) bad.push(key);
    }
    expect(bad, `entries missing a reason: ${bad.join(", ")}`).toEqual([]);
  });

  it("every non-public route is gated by requireSession in the middleware chain (or is on the volunteer code-auth allowlist)", () => {
    // Volunteer routes use x-volunteer-code instead of requireSession; they
    // are already classified session_only in ROUTE_POLICY.
    const codeAuthPrefix = "/api/volunteer";
    const missing: string[] = [];
    for (const r of routes) {
      const entry = ROUTE_POLICY[`${r.method} ${r.path}`];
      if (!entry || entry.kind === "public") continue;
      if (r.path.startsWith(codeAuthPrefix)) continue;
      if (!r.gated) missing.push(`${r.method} ${r.path}`);
    }
    expect(
      missing,
      `non-public routes not gated by requireSession: ${missing.join(", ")}`,
    ).toEqual([]);
  });
});
