// Cross-role access: every person-only API route must return 403 for a
// signed-in counsellor (and symmetrically for other non-person roles when
// the UI starts handing them real sessions). Today the only staff session
// we can create live is the demo counsellor, which is enough to exercise
// the requirePersonRole middleware end-to-end.

import { CaseReporter, expect, extractSessionCookie, http } from "../helpers";

interface PersonRoute {
  name: string;
  method: "GET" | "POST" | "DELETE";
  path: string;
  body?: unknown;
  needsCsrf?: boolean;
}

const PERSON_ROUTES: PersonRoute[] = [
  { name: "/api/me/result", method: "GET", path: "/api/me/result" },
  { name: "/api/me/access-log", method: "GET", path: "/api/me/access-log" },
  { name: "/api/couple/risk", method: "GET", path: "/api/couple/risk" },
  { name: "/api/consent GET", method: "GET", path: "/api/consent" },
  {
    name: "/api/consent POST",
    method: "POST",
    path: "/api/consent",
    body: { purpose: "evaluation_data" },
    needsCsrf: true,
  },
  {
    name: "/api/consent/revoke POST",
    method: "POST",
    path: "/api/consent/revoke",
    body: { purpose: "evaluation_data", targetUserId: null },
    needsCsrf: true,
  },
  { name: "/api/partner GET", method: "GET", path: "/api/partner" },
  {
    name: "/api/partner/invite POST",
    method: "POST",
    path: "/api/partner/invite",
    body: {},
    needsCsrf: true,
  },
  {
    name: "/api/partner/accept POST",
    method: "POST",
    path: "/api/partner/accept",
    body: { code: "AAAAAAAAAA" },
    needsCsrf: true,
  },
  { name: "/api/relatives GET", method: "GET", path: "/api/relatives" },
  {
    name: "/api/relatives POST",
    method: "POST",
    path: "/api/relatives",
    body: { displayName: "sibling" },
    needsCsrf: true,
  },
  { name: "/api/referrals GET", method: "GET", path: "/api/referrals" },
  {
    name: "/api/referrals POST",
    method: "POST",
    path: "/api/referrals",
    body: { priority: "information" },
    needsCsrf: true,
  },
];

export async function run(r: CaseReporter): Promise<void> {
  await r.run("ROLE-SCOPE: counsellor hits 403 on every person-only API route", async () => {
    // Use the seeded demo counsellor to get a real counsellor cookie.
    const login = await http<{ csrfToken: string }>("POST", "/api/demo/login", {
      body: { account: "counsellor" },
    });
    expect(login.status === 200, `demo counsellor login expected 200, got ${login.status}`);
    const cookie = extractSessionCookie(login.rawCookies);
    expect(!!cookie, "demo counsellor login returned no session cookie");
    const csrf = login.body.csrfToken;

    const failures: string[] = [];
    for (const route of PERSON_ROUTES) {
      const headers: Record<string, string> = {};
      if (route.needsCsrf) headers["x-csrf-token"] = csrf;
      const res = await http(route.method, route.path, {
        cookie: cookie!,
        headers,
        body: route.body,
      });
      // 403 is the designed response; 404 is also acceptable for /:id-style
      // routes a counsellor shouldn't know exists, but every route in this
      // list has a static path so 403 is the only correct outcome.
      if (res.status !== 403) {
        failures.push(`${route.name} returned ${res.status} (expected 403)`);
      }
    }

    expect(
      failures.length === 0,
      `counsellor got past the person-role gate on ${failures.length} route(s):\n  ${failures.join("\n  ")}`,
    );
  });
}
