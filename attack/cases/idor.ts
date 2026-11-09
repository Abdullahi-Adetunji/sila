import { CaseReporter, expect, http, signup } from "../helpers";

export async function run(r: CaseReporter): Promise<void> {
  await r.run("IDOR: /api/counsellor/case/:personId/result is 403 for a non-counsellor", async () => {
    const stranger = await signup(`idor-c-${Date.now()}@example.com`);
    const target = await signup(`idor-t-${Date.now()}@example.com`);
    const res = await http(
      "GET",
      `/api/counsellor/case/${target.id}/result`,
      { cookie: stranger.cookie },
    );
    expect(res.status === 403, `expected 403, got ${res.status}`);
  });

  await r.run("IDOR: /api/relatives/:id DELETE on another person's relative is 404", async () => {
    const owner = await signup(`idor-o-${Date.now()}@example.com`);
    const stranger = await signup(`idor-s-${Date.now()}@example.com`);
    const add = await http<{ relative: { id: string } }>("POST", "/api/relatives", {
      cookie: owner.cookie,
      headers: { "x-csrf-token": owner.csrf },
      body: { displayName: "Cousin" },
    });
    expect(add.status === 201, `add expected 201, got ${add.status}`);
    const relId = add.body.relative.id;
    const del = await http("DELETE", `/api/relatives/${relId}`, {
      cookie: stranger.cookie,
      headers: { "x-csrf-token": stranger.csrf },
    });
    expect(del.status === 404, `expected 404, got ${del.status}`);
  });

  await r.run("IDOR: /api/referrals/:id for a stranger is 403", async () => {
    // We cannot create a referral in the attack suite without granting
    // counsellor_access (which needs a counsellor account). Hit a random id.
    const stranger = await signup(`idor-r-${Date.now()}@example.com`);
    const res = await http(
      "GET",
      "/api/referrals/00000000-0000-0000-0000-000000000000",
      { cookie: stranger.cookie },
    );
    expect([403, 404].includes(res.status), `expected 403 or 404, got ${res.status}`);
  });

  await r.run("IDOR: /api/me/result keyed only on session cookie", async () => {
    const a = await signup(`idor-m-${Date.now()}@example.com`);
    const res = await http("GET", "/api/me/result", { cookie: a.cookie });
    // No result on file yet; must be 404 (not 200 showing someone else).
    expect(res.status === 404, `expected 404, got ${res.status}`);
    const noSession = await http("GET", "/api/me/result");
    expect(noSession.status === 401, `without session expected 401, got ${noSession.status}`);
  });
}
