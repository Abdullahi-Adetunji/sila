import { beforeAll, describe, expect, it } from "vitest";
import type { Router } from "express";
import { MOUNTS } from "../app";

// Every route must either sit behind requireSession (which lets a downstream
// authorize() decide) OR appear on the PUBLIC_ALLOWLIST here with a one-line
// reason. Adding a new route that is neither will fail the suite.

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
      // Normalise paths: strip the trailing '/' that comes from a router
      // mounted on "/api/x" with a route at "/", so the combined path is
      // written as "/api/x" (not "/api/x/").
      let fullPath = `${prefix}${layer.route.path}`;
      if (fullPath.length > 1 && fullPath.endsWith("/")) fullPath = fullPath.slice(0, -1);
      out.push({ method: method.toUpperCase(), path: fullPath, gated, handlers });
    }
  }
}

function enumerate(): InventoryEntry[] {
  const out: InventoryEntry[] = [];
  for (const m of MOUNTS) enumerateRouter(m.router, m.prefix, out);
  return out;
}

const PUBLIC_ALLOWLIST: Array<{ method: string; path: string; reason: string }> = [
  { method: "POST", path: "/api/auth/signup", reason: "account creation entry point" },
  { method: "POST", path: "/api/auth/login", reason: "rate-limited login entry point" },

  // Volunteer flow is anonymous; the code is authenticated by the
  // x-volunteer-code header inside the route (fromHeader + HMAC lookup).
  { method: "POST", path: "/api/volunteer/join", reason: "anonymous study join" },
  { method: "GET", path: "/api/volunteer/me", reason: "code-authenticated via header" },
  { method: "POST", path: "/api/volunteer/consent", reason: "code-authenticated via header" },
  { method: "POST", path: "/api/volunteer/complete", reason: "code-authenticated via header" },
  { method: "POST", path: "/api/volunteer/withdraw", reason: "code-authenticated via header" },
  { method: "GET", path: "/api/volunteer/quiz", reason: "code-authenticated via header" },
  { method: "POST", path: "/api/volunteer/quiz/response", reason: "code-authenticated via header" },
  { method: "GET", path: "/api/volunteer/quiz/progress", reason: "code-authenticated via header" },
  { method: "POST", path: "/api/volunteer/ttr", reason: "code-authenticated via header" },
  { method: "GET", path: "/api/volunteer/couple-view", reason: "code-authenticated via header" },

  { method: "GET", path: "/api/demo/config", reason: "public feature-flag check" },
  { method: "POST", path: "/api/demo/login", reason: "DEMO_PASSWORD-authenticated; 404 unless DEMO_MODE" },
];

describe("route inventory", () => {
  let routes: InventoryEntry[];

  beforeAll(() => {
    routes = enumerate();
  });

  it("every route is either gated by requireSession or on the public allowlist", () => {
    const allowed = new Set(PUBLIC_ALLOWLIST.map((e) => `${e.method} ${e.path}`));
    const missing = routes
      .filter((r) => !r.gated && !allowed.has(`${r.method} ${r.path}`))
      .map((r) => `${r.method} ${r.path}`);
    expect(missing, `uncovered routes (add requireSession or allowlist them): ${missing.join(", ")}`).toEqual([]);
  });

  it("no public-allowlist entry names a route that does not exist (prevents dead allowlisting)", () => {
    const seen = new Set(routes.map((r) => `${r.method} ${r.path}`));
    const dead: string[] = [];
    for (const entry of PUBLIC_ALLOWLIST) {
      const key = `${entry.method} ${entry.path}`;
      if (!seen.has(key)) dead.push(key);
    }
    expect(dead, `stale allowlist entries: ${dead.join(", ")}`).toEqual([]);
  });

  it("the enumerator finds the known gated routes", () => {
    const gated = new Set(
      routes.filter((r) => r.gated).map((r) => `${r.method} ${r.path}`),
    );
    for (const expected of [
      "GET /api/auth/me",
      "POST /api/auth/logout",
      "GET /api/me/result",
      "GET /api/me/access-log",
      "GET /api/couple/risk",
      "POST /api/consent",
      "GET /api/evaluator/comprehension/by-language",
    ]) {
      expect(gated.has(expected), `${expected} should be gated by requireSession`).toBe(true);
    }
  });
});
