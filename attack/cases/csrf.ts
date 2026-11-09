import { CaseReporter, expect, http, signup } from "../helpers";

export async function run(r: CaseReporter): Promise<void> {
  await r.run("CSRF: /api/partner/invite without x-csrf-token is 403", async () => {
    const a = await signup(`csrf-a-${Date.now()}@example.com`);
    const res = await http("POST", "/api/partner/invite", { cookie: a.cookie });
    expect(res.status === 403, `expected 403, got ${res.status}`);
  });

  await r.run("CSRF: /api/consent (grant) without x-csrf-token is 403", async () => {
    const a = await signup(`csrf-b-${Date.now()}@example.com`);
    const res = await http("POST", "/api/consent", {
      cookie: a.cookie,
      body: { purpose: "evaluation_data" },
    });
    expect(res.status === 403, `expected 403, got ${res.status}`);
  });

  await r.run("CSRF: /api/consent/revoke without x-csrf-token is 403", async () => {
    const a = await signup(`csrf-c-${Date.now()}@example.com`);
    const res = await http("POST", "/api/consent/revoke", {
      cookie: a.cookie,
      body: { purpose: "evaluation_data" },
    });
    expect(res.status === 403, `expected 403, got ${res.status}`);
  });

  await r.run("CSRF: /api/relatives (add) without x-csrf-token is 403", async () => {
    const a = await signup(`csrf-d-${Date.now()}@example.com`);
    const res = await http("POST", "/api/relatives", {
      cookie: a.cookie,
      body: { displayName: "Aunt" },
    });
    expect(res.status === 403, `expected 403, got ${res.status}`);
  });
}
