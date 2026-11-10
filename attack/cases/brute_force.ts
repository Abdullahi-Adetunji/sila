import { CaseReporter, expect, http, signup } from "../helpers";

export async function run(r: CaseReporter): Promise<void> {
  await r.run("BRUTE-FORCE: login rate-limits after ~20 bad attempts", async () => {
    const email = `brute-${Date.now()}@example.com`;
    await signup(email);
    let limited = false;
    for (let i = 0; i < 30; i++) {
      const res = await http("POST", "/api/auth/login", {
        body: { email, password: `wrong ${i}` },
      });
      if (res.status === 429) {
        limited = true;
        break;
      }
    }
    expect(limited, "no 429 observed after 30 bad logins");
  });

  await r.run("BRUTE-FORCE: random partner invite codes are 404 (single-use + enough entropy)", async () => {
    const a = await signup(`binv-${Date.now()}@example.com`);
    // Try 100 random base32-ish codes.
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let found = 0;
    for (let i = 0; i < 100; i++) {
      let code = "";
      for (let j = 0; j < 10; j++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
      const res = await http("POST", "/api/partner/accept", {
        cookie: a.cookie,
        headers: { "x-csrf-token": a.csrf },
        body: { code },
      });
      if (res.status === 200) found += 1;
    }
    expect(found === 0, `${found} random invite codes were accepted`);
  });

  await r.run(
    "BRUTE-FORCE: XFF-spoofed bad logins still hit the 20/15min cap",
    async () => {
      // trust proxy=3 is only safe if the hosting edge (Cloudflare) strips or
      // rewrites client-supplied X-Forwarded-For. If it doesn't, an attacker
      // can put a fresh fake IP in XFF on every request and the per-IP cap
      // never trips. We spoof a fresh forwarded chain per attempt and expect
      // the 429 to still fire within ~30 attempts, which proves the real
      // client IP survived to req.ip.
      const email = `xff-${Date.now()}@example.com`;
      await signup(email);
      let limited = false;
      let attempts = 0;
      for (let i = 0; i < 30; i++) {
        attempts += 1;
        const a = 203;
        const b = i;
        const res = await http("POST", "/api/auth/login", {
          body: { email, password: `wrong ${i}` },
          headers: {
            // Fresh three-entry XFF chain every request. If Express trusted
            // more than three hops, it would pick 203.0.113.i each time —
            // distinct bucket per request — and never hit 20.
            "x-forwarded-for": `${a}.0.113.${b}, 198.51.100.${b}, 10.0.0.${b}`,
          },
        });
        if (res.status === 429) {
          limited = true;
          break;
        }
      }
      expect(
        limited,
        `no 429 after ${attempts} spoofed-XFF attempts — trust proxy may be too permissive`,
      );
    },
  );

  await r.run("BRUTE-FORCE: random participant codes return 401 on /api/volunteer/me", async () => {
    const alphabet = "BCDFGHJKMNPQRSTVWXZ23456789";
    let authed = 0;
    for (let i = 0; i < 100; i++) {
      let code = "";
      for (let j = 0; j < 10; j++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
      const res = await http("GET", "/api/volunteer/me", {
        headers: { "x-volunteer-code": code },
      });
      if (res.status === 200) authed += 1;
    }
    expect(authed === 0, `${authed} random participant codes authenticated`);
  });
}
