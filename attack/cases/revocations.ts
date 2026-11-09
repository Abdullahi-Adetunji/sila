import { CaseReporter, expect, http, signup } from "../helpers";

export async function run(r: CaseReporter): Promise<void> {
  // couple_risk: grant from both sides, see 200 on /api/couple/risk, then
  // revoke one side and see 403.
  await r.run("REVOKE: couple_risk takes effect immediately", async () => {
    const a = await signup(`rev-a-${Date.now()}@example.com`);
    const b = await signup(`rev-b-${Date.now()}@example.com`);
    const invite = await http<{ inviteCode: string }>("POST", "/api/partner/invite", {
      cookie: a.cookie,
      headers: { "x-csrf-token": a.csrf },
    });
    expect(invite.status === 201, `invite expected 201, got ${invite.status}`);
    const accept = await http("POST", "/api/partner/accept", {
      cookie: b.cookie,
      headers: { "x-csrf-token": b.csrf },
      body: { code: invite.body.inviteCode },
    });
    expect(accept.status === 200, `accept expected 200, got ${accept.status}`);

    for (const who of [a, b]) {
      const target = who.id === a.id ? b : a;
      const gr = await http("POST", "/api/consent", {
        cookie: who.cookie,
        headers: { "x-csrf-token": who.csrf },
        body: { purpose: "couple_risk", targetUserId: target.id },
      });
      expect(gr.status === 201, `grant expected 201, got ${gr.status}`);
    }
    // No vault on file yet — the policy allows but the view is 404
    // (awaiting_results). Either way, a 403 would break this: assert not 403.
    const first = await http("GET", "/api/couple/risk", { cookie: a.cookie });
    expect(first.status !== 403, `after both grants expected not-403, got ${first.status}`);

    await http("POST", "/api/consent/revoke", {
      cookie: a.cookie,
      headers: { "x-csrf-token": a.csrf },
      body: { purpose: "couple_risk", targetUserId: b.id },
    });
    const second = await http("GET", "/api/couple/risk", { cookie: a.cookie });
    expect(second.status === 403, `after revoke expected 403, got ${second.status}`);
  });

  // share_with_partner, share_with_relative, counsellor_access, evaluation_data
  // are checked by the policy module. Here we confirm the consent write/revoke
  // round-trip for each purpose.
  const PURPOSES: Array<{ purpose: string; target?: "user" | "other"; scope?: string }> = [
    { purpose: "share_with_partner", target: "user", scope: "conditions_carried" },
    { purpose: "share_with_relative", target: "other", scope: "conditions_carried" },
    { purpose: "counsellor_access", target: "user" },
    { purpose: "evaluation_data" },
  ];

  for (const p of PURPOSES) {
    await r.run(`REVOKE: ${p.purpose} grant then revoke`, async () => {
      const g = await signup(`rev-${p.purpose}-g-${Date.now()}@example.com`);
      let target: Record<string, unknown> = {};
      if (p.target === "user") {
        const t = await signup(`rev-${p.purpose}-t-${Date.now()}@example.com`);
        target = { targetUserId: t.id };
      } else if (p.target === "other") {
        const add = await http<{ relative: { id: string } }>("POST", "/api/relatives", {
          cookie: g.cookie,
          headers: { "x-csrf-token": g.csrf },
          body: { displayName: "Family" },
        });
        expect(add.status === 201, `add relative expected 201, got ${add.status}`);
        target = { targetOther: add.body.relative.id };
      }
      const body = { purpose: p.purpose, ...target, ...(p.scope ? { scope: p.scope } : {}) };
      const gr = await http("POST", "/api/consent", {
        cookie: g.cookie,
        headers: { "x-csrf-token": g.csrf },
        body,
      });
      expect(gr.status === 201, `grant expected 201, got ${gr.status}`);
      const rv = await http<{ revoked: number }>("POST", "/api/consent/revoke", {
        cookie: g.cookie,
        headers: { "x-csrf-token": g.csrf },
        body,
      });
      expect(rv.status === 200 && rv.body.revoked === 1, `revoke expected {revoked:1}, got ${JSON.stringify(rv.body)}`);
    });
  }
}
