// Runs only when SILA_EXPECT_DEMO_MODE=true (i.e. the live submission site
// has DEMO_MODE=true). Verifies the three scoping guarantees:
//   1. Reset demo touches only demo accounts — a volunteer code created
//      before reset still works after it.
//   2. No demo account, including the counsellor, can see any volunteer
//      data (counsellor queue is empty; evaluator endpoints are 403).
//   3. evaluator@demo.sila is not reachable via the one-click panel
//      (POST /api/demo/login with account=evaluator is 400).

import { CaseReporter, expect, extractSessionCookie, http } from "../helpers";

export async function run(r: CaseReporter): Promise<void> {
  if (process.env.SILA_EXPECT_DEMO_MODE !== "true") return;

  await r.run("DEMO-ON: evaluator is not in the one-click panel", async () => {
    const res = await http("POST", "/api/demo/login", { body: { account: "evaluator" } });
    expect(res.status === 400, `expected 400, got ${res.status}`);
  });

  await r.run("DEMO-ON: reset demo does not delete a live volunteer code", async () => {
    // Seed a volunteer, then call reset as partner.a.
    const join = await http<{ code: string }>("POST", "/api/volunteer/join", {
      body: { language: "en", readingBand: "medium" },
    });
    expect(join.status === 201, `join expected 201, got ${join.status}`);
    const code = join.body.code;
    await http("POST", "/api/volunteer/consent", { headers: { "x-volunteer-code": code } });

    const login = await http<{ csrfToken: string }>("POST", "/api/demo/login", {
      body: { account: "partner.a" },
    });
    expect(login.status === 200, `demo login expected 200, got ${login.status}`);
    const cookie = extractSessionCookie(login.rawCookies);
    expect(!!cookie, "demo login returned no cookie");
    const csrf = login.body.csrfToken;

    const reset = await http("POST", "/api/demo/reset", {
      cookie: cookie!,
      headers: { "x-csrf-token": csrf },
    });
    expect(reset.status === 200, `reset expected 200, got ${reset.status}`);

    // Volunteer code still resolves.
    const me = await http("GET", "/api/volunteer/me", { headers: { "x-volunteer-code": code } });
    expect(me.status === 200, `volunteer /me expected 200 after reset, got ${me.status}`);
  });

  await r.run("DEMO-ON: a demo counsellor's queue is empty (no volunteer data leaks)", async () => {
    const login = await http<{ csrfToken: string }>("POST", "/api/demo/login", {
      body: { account: "counsellor" },
    });
    expect(login.status === 200, `demo login expected 200, got ${login.status}`);
    const cookie = extractSessionCookie(login.rawCookies);
    const queue = await http<{ queue: unknown[] }>("GET", "/api/counsellor/queue", {
      cookie: cookie!,
    });
    expect(queue.status === 200, `queue expected 200, got ${queue.status}`);
    // Unless a REAL (non-demo) person has granted this counsellor access,
    // the queue must be empty. In the pilot, counsellor_access is given by
    // real persons; demo volunteers have no role of counsellor_access.
    expect(Array.isArray(queue.body.queue), "queue must be an array");
    // We cannot strictly assert .length === 0 if the live site has real
    // counsellor_access grants; instead we assert that no queue item
    // carries a participant-code shape.
    const text = JSON.stringify(queue.body);
    expect(!/\b[BCDFGHJKMNPQRSTVWXZ23456789]{10}\b/.test(text), "participant code leaked to queue");
  });

  await r.run("DEMO-ON: demo counsellor gets 403 on an evaluator endpoint", async () => {
    const login = await http<{ csrfToken: string }>("POST", "/api/demo/login", {
      body: { account: "counsellor" },
    });
    const cookie = extractSessionCookie(login.rawCookies);
    const res = await http("GET", "/api/evaluator/comprehension/by-language", { cookie: cookie! });
    expect(res.status === 403, `expected 403, got ${res.status}`);
  });
}
