import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { setupTestDb, type TestDbHandle } from "./testDb";
import { signupAs, csrf } from "./helpers";
import { canShareWithRelative } from "../lib/policy";
import { grantConsent, revokeConsent } from "../services/consent";

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

describe("relatives + relative sharing", () => {
  it("add / list / delete a relative", async () => {
    const a = await signupAs(app, "rel-a@example.com");

    const list0 = await request(app).get("/api/relatives").set("Cookie", a.cookie);
    expect(list0.body.relatives).toEqual([]);

    const added = await request(app)
      .post("/api/relatives")
      .set(csrf(a))
      .send({ displayName: "Lina" });
    expect(added.status).toBe(201);
    const relativeId: string = added.body.relative.id;

    const list1 = await request(app).get("/api/relatives").set("Cookie", a.cookie);
    expect(list1.body.relatives).toHaveLength(1);
    expect(list1.body.relatives[0].displayName).toBe("Lina");

    const del = await request(app).delete(`/api/relatives/${relativeId}`).set(csrf(a));
    expect(del.status).toBe(204);

    const list2 = await request(app).get("/api/relatives").set("Cookie", a.cookie);
    expect(list2.body.relatives).toEqual([]);
  });

  it("adding a relative requires a session and csrf", async () => {
    const noSess = await request(app).post("/api/relatives").send({ displayName: "X" });
    expect(noSess.status).toBe(401);
    const a = await signupAs(app, "rel-csrf@example.com");
    const noCsrf = await request(app)
      .post("/api/relatives")
      .set("Cookie", a.cookie)
      .send({ displayName: "X" });
    expect(noCsrf.status).toBe(403);
  });

  it("cannot delete another person's relative (not found)", async () => {
    const a = await signupAs(app, "owner@example.com");
    const b = await signupAs(app, "stranger@example.com");
    const added = await request(app)
      .post("/api/relatives")
      .set(csrf(a))
      .send({ displayName: "Family" });
    const del = await request(app)
      .delete(`/api/relatives/${added.body.relative.id}`)
      .set(csrf(b));
    expect(del.status).toBe(404);
  });

  it("policy: canShareWithRelative is denied without a matching active consent", async () => {
    const a = await signupAs(app, "pol-a@example.com");
    const added = await request(app)
      .post("/api/relatives")
      .set(csrf(a))
      .send({ displayName: "Cousin" });
    const relativeId: string = added.body.relative.id;

    const none = await canShareWithRelative(a.id, relativeId, "conditions_carried");
    expect(none.outcome).toBe("denied");
    expect(none.reason).toBe("no_share_with_relative_consent");

    await grantConsent({
      grantorId: a.id,
      purpose: "share_with_relative",
      targetOther: relativeId,
      scope: "conditions_carried",
    });
    const ok = await canShareWithRelative(a.id, relativeId, "conditions_carried");
    expect(ok.outcome).toBe("allowed");

    const tooMuch = await canShareWithRelative(a.id, relativeId, "full_result");
    expect(tooMuch.outcome).toBe("denied");
    expect(tooMuch.reason).toBe("insufficient_scope");

    await revokeConsent({
      grantorId: a.id,
      purpose: "share_with_relative",
      targetOther: relativeId,
    });
    const after = await canShareWithRelative(a.id, relativeId, "conditions_carried");
    expect(after.outcome).toBe("denied");
  });
});
