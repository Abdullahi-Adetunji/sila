import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { setupTestDb, type TestDbHandle } from "./testDb";
import { signupAs, csrf } from "./helpers";

let app: Express;
let handle: TestDbHandle;

beforeAll(async () => {
  app = (await import("../app")).createApp();
});

beforeEach(async () => {
  handle = await setupTestDb();
});

afterEach(async () => {
  await handle.close();
});

describe("partner linking", () => {
  it("invite + accept creates an active link visible to both partners", async () => {
    const a = await signupAs(app, "a@example.com");
    const b = await signupAs(app, "b@example.com");

    const invite = await request(app).post("/api/partner/invite").set(csrf(a));
    expect(invite.status).toBe(201);
    const code = invite.body.inviteCode as string;
    expect(code.length).toBeGreaterThan(0);

    const accept = await request(app)
      .post("/api/partner/accept")
      .set(csrf(b))
      .send({ code });
    expect(accept.status).toBe(200);
    expect(accept.body.link.status).toBe("active");
    expect(accept.body.link.partnerId).toBe(a.id);

    const aView = await request(app).get("/api/partner").set("Cookie", a.cookie);
    expect(aView.body.link.partnerId).toBe(b.id);
    expect(aView.body.link.status).toBe("active");

    const bView = await request(app).get("/api/partner").set("Cookie", b.cookie);
    expect(bView.body.link.partnerId).toBe(a.id);
  });

  it("invite endpoints need a session", async () => {
    const r1 = await request(app).post("/api/partner/invite");
    expect(r1.status).toBe(401);
    const r2 = await request(app).post("/api/partner/accept").send({ code: "abc" });
    expect(r2.status).toBe(401);
  });

  it("invite endpoints need the csrf header", async () => {
    const a = await signupAs(app, "csrf@example.com");
    const noCsrf = await request(app).post("/api/partner/invite").set("Cookie", a.cookie);
    expect(noCsrf.status).toBe(403);
  });

  it("accept with wrong code returns 404", async () => {
    const b = await signupAs(app, "wrong@example.com");
    const res = await request(app).post("/api/partner/accept").set(csrf(b)).send({ code: "NOPE1234" });
    expect(res.status).toBe(404);
  });

  it("cannot self-accept own invite", async () => {
    const a = await signupAs(app, "self@example.com");
    const invite = await request(app).post("/api/partner/invite").set(csrf(a));
    const code = invite.body.inviteCode as string;
    const self = await request(app).post("/api/partner/accept").set(csrf(a)).send({ code });
    expect(self.status).toBe(404);
  });

  it("a person already in an active link cannot accept another invite", async () => {
    const a = await signupAs(app, "la1@example.com");
    const b = await signupAs(app, "lb1@example.com");
    const c = await signupAs(app, "lc1@example.com");

    const inv1 = await request(app).post("/api/partner/invite").set(csrf(a));
    await request(app).post("/api/partner/accept").set(csrf(b)).send({ code: inv1.body.inviteCode });

    const inv2 = await request(app).post("/api/partner/invite").set(csrf(c));
    const tryAccept = await request(app)
      .post("/api/partner/accept")
      .set(csrf(a))
      .send({ code: inv2.body.inviteCode });
    expect(tryAccept.status).toBe(404);
  });
});
