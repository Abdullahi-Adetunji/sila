import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { eq } from "drizzle-orm";
import { setupTestDb, type TestDbHandle } from "./testDb";
import { db } from "../db/client";
import { users } from "../db/schema";
import { storeResults, type ResultsByGene } from "../services/vault";

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

const SAMPLE: ResultsByGene = {
  HBB: { status: "tested", variants: ["HbS"] },
  CFTR: { status: "tested", variants: [] },
  GJB2: { status: "not_tested" },
};

async function signup(email: string, password: string): Promise<string> {
  const res = await request(app).post("/api/auth/signup").send({ email, password });
  expect(res.status).toBe(201);
  const raw = res.headers["set-cookie"];
  const cookies = Array.isArray(raw) ? raw : [raw!];
  const sess = cookies.find((c) => c.startsWith("sila_session="))!;
  return sess.split(";")[0];
}

describe("GET /api/me/result", () => {
  it("returns 401 without a session", async () => {
    const res = await request(app).get("/api/me/result");
    expect(res.status).toBe(401);
  });

  it("returns 404 when the person has no result on file", async () => {
    const cookie = await signup("none@example.com", "correct horse battery staple");
    const res = await request(app).get("/api/me/result").set("Cookie", cookie);
    expect(res.status).toBe(404);
  });

  it("returns the person's own result when uploaded by a lab", async () => {
    const cookie = await signup("own@example.com", "correct horse battery staple");
    // Create a lab user and upload a result into the person's vault.
    const personId = (
      await db.select({ id: users.id }).from(users).where(eq(users.email, "own@example.com"))
    )[0].id;
    const [lab] = await db
      .insert(users)
      .values({ email: "lab@example.com", passwordHash: "x", role: "lab" })
      .returning({ id: users.id });
    await storeResults(personId, lab.id, SAMPLE);

    const res = await request(app).get("/api/me/result").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual(SAMPLE);
  });
});
