"use client";

import { useEffect, useState } from "react";
import { api, isApiError } from "../../lib/api";
import type { GeneResult } from "@/lib/genetics/engine";
import { PANEL } from "@/lib/genetics/panel";

type ResultsByGene = Record<string, GeneResult>;

export default function MyResultPage() {
  const [results, setResults] = useState<ResultsByGene | null>(null);
  const [state, setState] = useState<"loading" | "empty" | "ready" | "error">("loading");

  useEffect(() => {
    api
      .get<{ results: ResultsByGene }>("/api/me/result")
      .then((res) => {
        setResults(res.results);
        setState("ready");
      })
      .catch((e: unknown) => {
        if (isApiError(e) && e.status === 404) setState("empty");
        else setState("error");
      });
  }, []);

  return (
    <main>
      <h1 className="text-2xl font-semibold">Your result</h1>
      <p className="mt-2 text-sm text-muted">
        This page shows your own carrier result only. Your partner cannot see it unless you
        choose to share it on the Consent page.
      </p>
      {state === "loading" && <p className="mt-6 text-sm text-muted">Loading…</p>}
      {state === "error" && (
        <p className="mt-6 text-sm text-red-600">Could not load your result.</p>
      )}
      {state === "empty" && (
        <p className="mt-6 rounded-xl border border-line bg-surface p-4 text-sm">
          No carrier result has been uploaded to your account yet. In this prototype, a
          simulated lab uploads results via <code>npm run seed</code>.
        </p>
      )}
      {state === "ready" && results && (
        <ul className="mt-6 space-y-3">
          {PANEL.map((gene) => {
            const r = results[gene.gene];
            return (
              <li key={gene.gene} className="rounded-xl border border-line bg-surface p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  {gene.condition.en}
                </p>
                <p className="mt-1 text-sm font-semibold">{describe(r)}</p>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function describe(r: GeneResult | undefined): string {
  if (!r || r.status === "not_tested") return "Not tested";
  if (r.status === "uncertain") return "Uncertain result — needs a counsellor to review";
  if (r.variants.length === 0) return "No variant found";
  if (r.variants.length === 1) return "Carrier of one variant";
  return "Affected (two variants)";
}
