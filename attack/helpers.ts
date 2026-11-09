// Tiny HTTP client + assertion runner for the black-box attack suite.
// Everything hits BASE_URL via global fetch; no in-process shortcut.

export const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export interface Finding {
  name: string;
  passed: boolean;
  detail?: string;
}

export class CaseReporter {
  readonly findings: Finding[] = [];

  async run(name: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
      this.findings.push({ name, passed: true });
      process.stdout.write(`PASS ${name}\n`);
    } catch (e: unknown) {
      const detail = e instanceof Error ? e.message : String(e);
      this.findings.push({ name, passed: false, detail });
      process.stdout.write(`FAIL ${name}  — ${detail}\n`);
    }
  }
}

export interface HttpResponse<T = unknown> {
  status: number;
  headers: Headers;
  body: T;
  rawCookies: string[];
}

export async function http<T = unknown>(
  method: string,
  path: string,
  init: { body?: unknown; headers?: Record<string, string>; cookie?: string } = {},
): Promise<HttpResponse<T>> {
  const headers: Record<string, string> = { ...(init.headers ?? {}) };
  if (init.body !== undefined && !headers["content-type"]) {
    headers["content-type"] = "application/json";
  }
  if (init.cookie) headers["cookie"] = init.cookie;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    redirect: "manual",
  });
  const text = await res.text();
  const body = text ? (safeJson<T>(text) ?? (text as unknown as T)) : (null as unknown as T);
  const rawCookies = res.headers.getSetCookie?.() ?? [];
  return { status: res.status, headers: res.headers, body, rawCookies };
}

function safeJson<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export function expect(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

export function extractSessionCookie(raw: string[]): string | undefined {
  const sess = raw.find((c) => c.startsWith("sila_session="));
  if (!sess) return undefined;
  return sess.split(";")[0];
}

export interface SignedInUser {
  id: string;
  email: string;
  cookie: string;
  csrf: string;
}

export async function signup(email: string, password = "correct horse battery staple"): Promise<SignedInUser> {
  const r = await http<{ user: { id: string; email: string }; csrfToken: string }>(
    "POST",
    "/api/auth/signup",
    { body: { email, password } },
  );
  expect(r.status === 201, `signup ${email} expected 201, got ${r.status}`);
  const cookie = extractSessionCookie(r.rawCookies);
  expect(!!cookie, `signup ${email} returned no session cookie`);
  return { id: r.body.user.id, email: r.body.user.email, cookie: cookie!, csrf: r.body.csrfToken };
}

export async function login(email: string, password = "correct horse battery staple"): Promise<SignedInUser> {
  const r = await http<{ user: { id: string; email: string }; csrfToken: string }>(
    "POST",
    "/api/auth/login",
    { body: { email, password } },
  );
  expect(r.status === 200, `login ${email} expected 200, got ${r.status}`);
  const cookie = extractSessionCookie(r.rawCookies);
  expect(!!cookie, `login ${email} returned no session cookie`);
  return { id: r.body.user.id, email: r.body.user.email, cookie: cookie!, csrf: r.body.csrfToken };
}
