import request from "supertest";
import type { Express } from "express";

export interface AuthedUser {
  id: string;
  email: string;
  cookie: string;
  csrfToken: string;
}

export async function signupAs(
  app: Express,
  email: string,
  password = "correct horse battery staple",
): Promise<AuthedUser> {
  const res = await request(app).post("/api/auth/signup").send({ email, password });
  if (res.status !== 201) {
    throw new Error(`signup failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  const raw = res.headers["set-cookie"];
  const list = Array.isArray(raw) ? raw : [raw!];
  const session = list.find((c) => c.startsWith("sila_session="))!.split(";")[0];
  return {
    id: res.body.user.id as string,
    email: res.body.user.email as string,
    cookie: session,
    csrfToken: res.body.csrfToken as string,
  };
}

export function csrf(u: AuthedUser) {
  return { "x-csrf-token": u.csrfToken, Cookie: u.cookie };
}
