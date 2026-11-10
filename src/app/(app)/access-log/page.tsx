"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Reveal } from "../../components/Reveal";
import { IconScroll, IconShield } from "../../components/Icons";

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

  const allowedCount = entries?.filter((e) => e.outcome === "allowed").length ?? 0;
  const deniedCount = entries?.filter((e) => e.outcome === "denied").length ?? 0;

  return (
    <main>
      <Reveal>
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Transparency</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Access log</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Every access decision about your data, newest first. Entries cannot be edited or
            deleted — the database rejects both. Each row is hash-chained to the one before.
          </p>
        </header>
      </Reveal>

      {entries && entries.length > 0 && (
        <Reveal>
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <StatPill label="Allowed" value={allowedCount} tone="teal" />
            <StatPill label="Denied" value={deniedCount} tone="affected" />
            <StatPill label="Total" value={entries.length} tone="neutral" Icon={IconScroll} />
          </div>
        </Reveal>
      )}

      {!entries && <p className="text-sm text-muted">Loading…</p>}
      {entries && entries.length === 0 && (
        <Reveal>
          <p className="rounded-2xl border border-dashed border-line bg-surface p-5 text-sm text-muted">
            No entries yet.
          </p>
        </Reveal>
      )}
      {entries && entries.length > 0 && (
        <ul className="space-y-2 text-sm">
          {entries.map((e, i) => (
            <Reveal
              as="li"
              key={e.seq}
              delay={((Math.min((i % 6) + 1, 6)) as 1 | 2 | 3 | 4 | 5 | 6)}
            >
              <article className="rounded-xl border border-line bg-surface p-4 transition-colors hover:border-teal/40">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="font-mono text-xs text-muted"
                      title={`sequence #${e.seq}`}
                    >
                      #{e.seq}
                    </span>
                    <span className="font-medium">{e.action}</span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      e.outcome === "allowed"
                        ? "bg-teal-soft text-teal"
                        : "bg-affected-soft text-affected"
                    }`}
                  >
                    <IconShield />
                    {e.outcome}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted">
                  {new Date(e.createdAt).toLocaleString()} · you were {e.youWere}
                  {e.purpose ? ` · purpose: ${e.purpose}` : ""}
                </div>
              </article>
            </Reveal>
          ))}
        </ul>
      )}
    </main>
  );
}

function StatPill({
  label,
  value,
  tone,
  Icon,
}: {
  label: string;
  value: number;
  tone: "teal" | "affected" | "neutral";
  Icon?: (p: { className?: string }) => React.ReactElement;
}) {
  const styles: Record<string, string> = {
    teal: "border-teal/30 bg-teal-soft/50 text-teal",
    affected: "border-affected/30 bg-affected-soft/50 text-affected",
    neutral: "border-line bg-surface text-muted",
  };
  return (
    <section className={`rounded-2xl border p-4 ${styles[tone]}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider opacity-80">{label}</p>
        {Icon && (
          <span aria-hidden>
            <Icon />
          </span>
        )}
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
    </section>
  );
}
