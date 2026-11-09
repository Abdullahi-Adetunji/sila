import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { advance, now, offsetFor, reset } from "../lib/clock";

describe("simulated clock (user-scoped)", () => {
  beforeEach(() => reset());
  afterEach(() => reset());

  it("returns real time for any user when no advance has been applied", () => {
    const before = Date.now();
    const got = now("userA").getTime();
    expect(got).toBeGreaterThanOrEqual(before);
    expect(got - before).toBeLessThan(1000);
    expect(offsetFor("userA")).toBe(0);
  });

  it("advance only shifts the users it names", () => {
    const base = Date.now();
    advance(60 * 1000, ["userA", "userB"]);
    expect(offsetFor("userA")).toBe(60 * 1000);
    expect(offsetFor("userB")).toBe(60 * 1000);
    expect(offsetFor("userC")).toBe(0);
    expect(now("userA").getTime()).toBeGreaterThanOrEqual(base + 60 * 1000);
    expect(now("userC").getTime() - base).toBeLessThan(1000);
  });

  it("refuses negative and non-finite advances", () => {
    advance(-1000, ["u"]);
    expect(offsetFor("u")).toBe(0);
    advance(NaN, ["u"]);
    expect(offsetFor("u")).toBe(0);
  });

  it("is a no-op in production without DEMO_MODE", () => {
    const env = process.env as Record<string, string | undefined>;
    const originalNode = env.NODE_ENV;
    const originalDemo = env.DEMO_MODE;
    env.NODE_ENV = "production";
    delete env.DEMO_MODE;
    try {
      advance(123_456, ["u"]);
      expect(offsetFor("u")).toBe(0);
    } finally {
      env.NODE_ENV = originalNode;
      if (originalDemo !== undefined) env.DEMO_MODE = originalDemo;
    }
  });

  it("now() without a user id returns real time even after an advance", () => {
    const base = Date.now();
    advance(60 * 60 * 1000, ["u"]);
    expect(now().getTime() - base).toBeLessThan(1000);
  });
});
