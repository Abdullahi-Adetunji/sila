// Simulated clock used by the referral tracker. In production this is just
// `new Date()`; in demo mode, tests and the /api/dev/clock endpoint can
// advance the offset so time-to-referral metrics are observable in minutes
// rather than days.

let offsetMs = 0;

function mutable(): boolean {
  // Only allow advance() to do anything outside production, or when the
  // deployment explicitly enables the demo clock via DEMO_MODE=true.
  return process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "true";
}

export function now(): Date {
  return new Date(Date.now() + offsetMs);
}

export function nowIso(): string {
  return now().toISOString();
}

export function advance(ms: number): void {
  if (!mutable()) return;
  if (!Number.isFinite(ms) || ms < 0) return;
  offsetMs += Math.floor(ms);
}

export function reset(): void {
  offsetMs = 0;
}

export function currentOffsetMs(): number {
  return offsetMs;
}
