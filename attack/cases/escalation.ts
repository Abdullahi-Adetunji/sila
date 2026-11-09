import { CaseReporter, expect, extractSessionCookie, http } from "../helpers";

export async function run(r: CaseReporter): Promise<void> {
  await r.run("ESCALATION: signup cannot set role via mass assignment", async () => {
    const email = `esc-${Date.now()}@example.com`;
    const res = await http<{ user: { role: string } }>("POST", "/api/auth/signup", {
      body: {
        email,
        password: "correct horse battery staple",
        role: "counsellor",
        is_admin: true,
      },
    });
    expect(res.status === 201, `signup expected 201, got ${res.status}`);
    expect(res.body.user.role === "person", `role leaked to ${res.body.user.role}`);
  });

  await r.run("ESCALATION: a person account cannot access /api/counsellor/queue", async () => {
    const email = `esc2-${Date.now()}@example.com`;
    const s = await http<{ csrfToken: string }>("POST", "/api/auth/signup", {
      body: { email, password: "correct horse battery staple" },
    });
    const cookie = extractSessionCookie(s.rawCookies)!;
    const queue = await http("GET", "/api/counsellor/queue", { cookie });
    expect(queue.status === 403, `expected 403, got ${queue.status}`);
  });

  await r.run("ESCALATION: a person account cannot read /api/evaluator/comprehension/by-language", async () => {
    const email = `esc3-${Date.now()}@example.com`;
    const s = await http<{ csrfToken: string }>("POST", "/api/auth/signup", {
      body: { email, password: "correct horse battery staple" },
    });
    const cookie = extractSessionCookie(s.rawCookies)!;
    const r2 = await http("GET", "/api/evaluator/comprehension/by-language", { cookie });
    expect(r2.status === 403, `expected 403, got ${r2.status}`);
  });
}
