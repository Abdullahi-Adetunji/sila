"use client";

import { useEffect, useState } from "react";
import { api, isApiError } from "./api";

export interface SessionUser {
  id: string;
  email: string;
  role: "person" | "counsellor" | "lab" | "evaluator";
  locale: "en" | "ar";
}

export interface SessionState {
  user: SessionUser | null;
  csrfToken: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useSession(): SessionState {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await api.get<{ user: SessionUser; csrfToken: string }>("/api/auth/me");
      setUser(res.user);
      setCsrfToken(res.csrfToken);
    } catch (e: unknown) {
      if (isApiError(e) && e.status === 401) {
        setUser(null);
        setCsrfToken(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return { user, csrfToken, loading, refresh };
}
