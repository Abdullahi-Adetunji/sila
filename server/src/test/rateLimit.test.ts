import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { ipKeyGenerator } from "express-rate-limit";
import { createApp } from "../app";

// These tests protect the invariant that the rate limiter keys on the real
// client IP, not on 127.0.0.1. The real risk: on Render the API sits behind
// Render's edge proxy and Next.js (same container) — if Express trusts 0
// hops, every /api/auth/login call would key on 127.0.0.1 and one person's
// failed attempts would lock out every signed-in user.

describe("trust proxy wiring", () => {
  it("createApp sets trust proxy to 2 hops", () => {
    const app = createApp();
    expect(app.get("trust proxy")).toBe(2);
  });

  it("req.ip reflects the client's forwarded IP, not 127.0.0.1", async () => {
    const app = express();
    app.set("trust proxy", 2);
    app.get("/probe", (req, res) => {
      res.json({ ip: req.ip, key: ipKeyGenerator(req.ip ?? "") });
    });

    const res = await request(app)
      .get("/probe")
      .set("X-Forwarded-For", "203.0.113.5, 10.0.0.1");
    expect(res.body.ip).toBe("203.0.113.5");
    expect(res.body.ip).not.toBe("127.0.0.1");
    expect(res.body.key).not.toBe(ipKeyGenerator("127.0.0.1"));
  });

  it("two distinct forwarded IPs produce distinct rate-limit keys", async () => {
    const app = express();
    app.set("trust proxy", 2);
    const seen: Array<{ ip: string | undefined; key: string }> = [];
    app.get("/probe", (req, res) => {
      seen.push({ ip: req.ip, key: ipKeyGenerator(req.ip ?? "") });
      res.end();
    });

    await request(app).get("/probe").set("X-Forwarded-For", "203.0.113.5, 10.0.0.1");
    await request(app).get("/probe").set("X-Forwarded-For", "198.51.100.9, 10.0.0.1");

    expect(seen).toHaveLength(2);
    expect(seen[0].ip).toBe("203.0.113.5");
    expect(seen[1].ip).toBe("198.51.100.9");
    expect(seen[0].key).not.toBe(seen[1].key);
  });
});
