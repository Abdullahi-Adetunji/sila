import { CaseReporter, expect, http } from "../helpers";

export async function run(r: CaseReporter): Promise<void> {
  await r.run("DEMO-OFF: /api/demo/config reports enabled matching DEMO_MODE", async () => {
    const res = await http<{ enabled: boolean }>("GET", "/api/demo/config");
    expect(res.status === 200, `expected 200, got ${res.status}`);
    const expected = process.env.SILA_EXPECT_DEMO_MODE === "true";
    expect(
      res.body.enabled === expected,
      `expected enabled=${expected}, got ${res.body.enabled}. Set SILA_EXPECT_DEMO_MODE to match the server's DEMO_MODE.`,
    );
  });

  await r.run("DEMO-OFF: /api/demo/login is 404 when DEMO_MODE is off", async () => {
    const res = await http("POST", "/api/demo/login", { body: { account: "partner.a" } });
    const expectedStatus = process.env.SILA_EXPECT_DEMO_MODE === "true" ? "200-or-401" : 404;
    if (expectedStatus === 404) {
      expect(res.status === 404, `expected 404, got ${res.status}`);
    } else {
      expect(
        res.status === 200 || res.status === 401 || res.status === 503,
        `expected 200/401/503 under DEMO_MODE, got ${res.status}`,
      );
    }
  });

  await r.run("DEMO-OFF: /api/dev/clock is 404 when neither NODE_ENV!=production nor DEMO_MODE=true", async () => {
    // We have no way to introspect the server's NODE_ENV from here; this case
    // only asserts that an anonymous request is at least 401 or 404.
    const res = await http("GET", "/api/dev/clock");
    expect([401, 404].includes(res.status), `expected 401 or 404, got ${res.status}`);
  });
}
