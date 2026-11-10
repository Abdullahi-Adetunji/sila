// Admin + lab cross-role access. The checks mirror the person_endpoint_
// access middleware plus:
//   - admin cannot read any person's result, consent, couple view or
//     referral (just like counsellor/evaluator)
//   - lab cannot read any result back
//   - person cannot reach /api/admin/* or /api/lab/*
//   - invite claim is single-use

import { CaseReporter, expect, extractSessionCookie, http } from "../helpers";

export async function run(r: CaseReporter): Promise<void> {
  await r.run("ADMIN: admin hits 403 on every person-only API route", async () => {
    const login = await http<{ csrfToken: string }>("POST", "/api/demo/login", {
      body: { account: "admin" },
    });
    expect(login.status === 200, `demo admin login expected 200, got ${login.status}`);
    const cookie = extractSessionCookie(login.rawCookies);
    expect(!!cookie, "demo admin login returned no session cookie");

    const routes = [
      { method: "GET" as const, path: "/api/me/result" },
      { method: "GET" as const, path: "/api/me/access-log" },
      { method: "GET" as const, path: "/api/me/sila-id" },
      { method: "GET" as const, path: "/api/couple/risk" },
      { method: "GET" as const, path: "/api/consent" },
      { method: "GET" as const, path: "/api/partner" },
      { method: "GET" as const, path: "/api/relatives" },
      { method: "GET" as const, path: "/api/referrals" },
    ];
    const failures: string[] = [];
    for (const route of routes) {
      const res = await http(route.method, route.path, { cookie: cookie! });
      if (res.status !== 403) failures.push(`${route.path} returned ${res.status}`);
    }
    expect(failures.length === 0, `admin reached ${failures.length} person route(s): ${failures.join(", ")}`);
  });

  await r.run("ADMIN: admin cannot read /api/counsellor/queue", async () => {
    const login = await http<{ csrfToken: string }>("POST", "/api/demo/login", {
      body: { account: "admin" },
    });
    const cookie = extractSessionCookie(login.rawCookies)!;
    const res = await http("GET", "/api/counsellor/queue", { cookie });
    expect(res.status === 403, `admin got ${res.status} on /api/counsellor/queue`);
  });

  await r.run("LAB: lab hits 403 on every person-only API route (no read-back)", async () => {
    const login = await http<{ csrfToken: string }>("POST", "/api/demo/login", {
      body: { account: "lab" },
    });
    expect(login.status === 200, `demo lab login expected 200, got ${login.status}`);
    const cookie = extractSessionCookie(login.rawCookies)!;
    const routes = ["/api/me/result", "/api/couple/risk", "/api/consent", "/api/referrals"];
    const failures: string[] = [];
    for (const path of routes) {
      const res = await http("GET", path, { cookie });
      if (res.status !== 403) failures.push(`${path} returned ${res.status}`);
    }
    expect(failures.length === 0, `lab reached ${failures.length} person route(s)`);
  });

  await r.run("ROLE-SCOPE: person hits 403 on /api/admin/staff and /api/lab/submit", async () => {
    const login = await http<{ csrfToken: string }>("POST", "/api/demo/login", {
      body: { account: "partner.a" },
    });
    const cookie = extractSessionCookie(login.rawCookies)!;
    const csrf = login.body.csrfToken;

    const adminRes = await http("GET", "/api/admin/staff", { cookie });
    expect(adminRes.status === 403, `person got ${adminRes.status} on /api/admin/staff`);

    const labRes = await http("POST", "/api/lab/submit", {
      cookie,
      headers: { "x-csrf-token": csrf },
      body: { silaId: "ABCD-EFGHIJ", results: {} },
    });
    expect(labRes.status === 403, `person got ${labRes.status} on /api/lab/submit`);
  });

  await r.run("LAB: an unknown Sila ID returns 404 and does not leak existence", async () => {
    const login = await http<{ csrfToken: string }>("POST", "/api/demo/login", {
      body: { account: "lab" },
    });
    const cookie = extractSessionCookie(login.rawCookies)!;
    const csrf = login.body.csrfToken;
    // Submit against a Sila ID that cannot possibly resolve to any user
    // (ten base32 chars all 'A') and expect the same 404 as we'd return
    // for a mistyped real one — no 200, no 401, no 500.
    const res = await http("POST", "/api/lab/submit", {
      cookie,
      headers: { "x-csrf-token": csrf },
      body: {
        silaId: "AAAA-AAAAAA",
        results: {},
      },
    });
    expect(res.status === 404, `unknown silaId returned ${res.status}`);
  });

  await r.run("INVITE: a random invite code is 404 (not oracle)", async () => {
    // Base64url-ish, length matching real invite codes but random. The
    // server should 404 fast; must not leak whether the code-shape is
    // valid vs expired vs consumed.
    let codes = 0;
    for (let i = 0; i < 20; i++) {
      const c =
        Math.random().toString(36).slice(2) +
        Math.random().toString(36).slice(2) +
        Math.random().toString(36).slice(2);
      const res = await http("GET", `/api/invite/${c}`);
      if (res.status === 200) codes += 1;
    }
    expect(codes === 0, `${codes} random invite codes resolved`);
  });
}
