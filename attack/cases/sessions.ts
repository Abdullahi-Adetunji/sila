import { CaseReporter, expect, extractSessionCookie, http, signup } from "../helpers";

export async function run(r: CaseReporter): Promise<void> {
  await r.run("SESSION: session id rotates on login", async () => {
    const email = `sess-r-${Date.now()}@example.com`;
    const a = await signup(email);
    const me1 = await http("GET", "/api/auth/me", { cookie: a.cookie });
    expect(me1.status === 200, `me1 expected 200, got ${me1.status}`);
    const login = await http("POST", "/api/auth/login", {
      body: { email, password: "correct horse battery staple" },
    });
    const newCookie = extractSessionCookie(login.rawCookies);
    expect(!!newCookie, "login did not issue a new cookie");
    expect(newCookie !== a.cookie, "login reused the previous session cookie");
  });

  await r.run("SESSION: logout invalidates the session server-side", async () => {
    const a = await signup(`sess-l-${Date.now()}@example.com`);
    const out = await http("POST", "/api/auth/logout", {
      cookie: a.cookie,
      headers: { "x-csrf-token": a.csrf },
    });
    expect(out.status === 204, `logout expected 204, got ${out.status}`);
    const me = await http("GET", "/api/auth/me", { cookie: a.cookie });
    expect(me.status === 401, `after logout expected 401, got ${me.status}`);
  });

  await r.run("SESSION: cookie carries HttpOnly, SameSite=Lax; Secure in production", async () => {
    const r1 = await http("POST", "/api/auth/signup", {
      body: {
        email: `sess-f-${Date.now()}@example.com`,
        password: "correct horse battery staple",
      },
    });
    const raw = r1.rawCookies.find((c) => c.startsWith("sila_session=")) ?? "";
    expect(/HttpOnly/i.test(raw), `missing HttpOnly: ${raw}`);
    expect(/SameSite=Lax/i.test(raw), `missing SameSite=Lax: ${raw}`);
    // Secure is only set in production; if the attack suite is pointed at a
    // production BASE_URL (https://), assert it. Otherwise note it.
    if ((process.env.BASE_URL ?? "").startsWith("https://")) {
      expect(/Secure/i.test(raw), `missing Secure in production: ${raw}`);
    }
  });
}
