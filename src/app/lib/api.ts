"use client";

export interface ApiError {
  status: number;
  body: unknown;
}

async function request<T>(
  path: string,
  init: RequestInit & { csrfToken?: string } = {},
): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (init.csrfToken) headers.set("x-csrf-token", init.csrfToken);
  const res = await fetch(path, {
    ...init,
    headers,
    credentials: "same-origin",
  });
  const text = await res.text();
  const body: unknown = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw { status: res.status, body } as ApiError;
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown, csrfToken?: string) =>
    request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
      csrfToken,
    }),
};

export function isApiError(e: unknown): e is ApiError {
  return typeof e === "object" && e !== null && "status" in e;
}
