// Simulated clock used by the referral tracker so time-to-referral metrics
// are observable in demos. The clock is **scoped to a set of user ids**: an
// advance only shifts timestamps that services write for those users, never
// timestamps written for anyone else. In production without DEMO_MODE,
// advance() is a no-op and offsets stay at zero for every user.

const offsetByUser = new Map<string, number>();

function mutable(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "true";
}

export function now(userId?: string | null): Date {
  if (!userId) return new Date();
  const off = offsetByUser.get(userId) ?? 0;
  return new Date(Date.now() + off);
}

export function nowIso(userId?: string | null): string {
  return now(userId).toISOString();
}

// Add `ms` to the offset of every user id in `userIds`. No-op in production
// without DEMO_MODE. Returns the users that were actually advanced.
export function advance(ms: number, userIds: string[]): string[] {
  if (!mutable()) return [];
  if (!Number.isFinite(ms) || ms < 0) return [];
  const shift = Math.floor(ms);
  for (const id of userIds) {
    offsetByUser.set(id, (offsetByUser.get(id) ?? 0) + shift);
  }
  return [...userIds];
}

export function reset(): void {
  offsetByUser.clear();
}

export function offsetFor(userId: string): number {
  return offsetByUser.get(userId) ?? 0;
}

export function allOffsets(): Record<string, number> {
  return Object.fromEntries(offsetByUser.entries());
}
