import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { advance, currentOffsetMs, now, reset } from "../lib/clock";

describe("simulated clock", () => {
  beforeEach(() => reset());
  afterEach(() => reset());

  it("returns real time when no advance has been applied", () => {
    const before = Date.now();
    const got = now().getTime();
    expect(got).toBeGreaterThanOrEqual(before);
    expect(got - before).toBeLessThan(1000);
    expect(currentOffsetMs()).toBe(0);
  });

  it("advance(ms) moves the clock forward by that many ms", () => {
    const base = Date.now();
    advance(60 * 1000);
    expect(currentOffsetMs()).toBe(60 * 1000);
    expect(now().getTime()).toBeGreaterThanOrEqual(base + 60 * 1000);
  });

  it("refuses negative and non-finite advances", () => {
    advance(-1000);
    expect(currentOffsetMs()).toBe(0);
    advance(NaN);
    expect(currentOffsetMs()).toBe(0);
  });

  it("is a no-op in production without DEMO_MODE", () => {
    const env = process.env as Record<string, string | undefined>;
    const originalNode = env.NODE_ENV;
    const originalDemo = env.DEMO_MODE;
    env.NODE_ENV = "production";
    delete env.DEMO_MODE;
    try {
      advance(123_456);
      expect(currentOffsetMs()).toBe(0);
    } finally {
      env.NODE_ENV = originalNode;
      if (originalDemo !== undefined) env.DEMO_MODE = originalDemo;
    }
  });
});
