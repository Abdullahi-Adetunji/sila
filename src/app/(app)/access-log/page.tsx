"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface Entry {
  seq: number;
  action: string;
  outcome: "allowed" | "denied";
  purpose: string | null;
  youWere: "actor" | "target";
  targetType: string | null;
  targetId: string | null;
  createdAt: string;
  meta: unknown;
}

export default function AccessLogPage() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  useEffect(() => {
    api.get<{ entries: Entry[] }>("/api/me/access-log").then((r) => setEntries(r.entries));
  }, []);

  return (
    <main>
      <h1 className="text-2xl font-semibold">Access log</h1>
      <p className="mt-2 text-sm text-muted">
        Every access decision about your data, newest first. Entries cannot be edited or
        deleted — the database rejects both.
      </p>
      {!entries && <p className="mt-6 text-sm text-muted">Loading…</p>}
      {entries && entries.length === 0 && (
        <p className="mt-6 rounded-xl border border-line bg-surface p-4 text-sm text-muted">
          No entries yet.
        </p>
      )}
      {entries && entries.length > 0 && (
        <ul className="mt-6 space-y-2 text-sm">
          {entries.map((e) => (
            <li key={e.seq} className="rounded-xl border border-line bg-surface p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{e.action}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    e.outcome === "allowed"
                      ? "bg-teal-soft text-teal"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {e.outcome}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted">
                {new Date(e.createdAt).toLocaleString()} · you were {e.youWere}
                {e.purpose ? ` · purpose: ${e.purpose}` : ""}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
