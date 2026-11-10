"use client";

import { useState } from "react";
import { api, isApiError } from "../../lib/api";
import { useSession } from "../../lib/session";
import { Reveal } from "../../components/Reveal";
import { IconArrowRight, IconShield } from "../../components/Icons";
import { PANEL } from "@/lib/genetics/panel";

type Status = "tested" | "not_tested" | "uncertain";

interface GeneForm {
  status: Status;
  variants: string[]; // only when status === "tested"
}

function initialForm(): Record<string, GeneForm> {
  const o: Record<string, GeneForm> = {};
  for (const g of PANEL) o[g.gene] = { status: "not_tested", variants: [] };
  return o;
}

export default function LabPage() {
  const { csrfToken, user } = useSession();
  const [silaId, setSilaId] = useState("");
  const [form, setForm] = useState<Record<string, GeneForm>>(initialForm());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<
    | { ok: true; replaced: boolean; id: string }
    | { ok: false; reason: string }
    | null
  >(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!csrfToken) return;
    setSubmitting(true);
    setResult(null);
    const results: Record<string, { status: Status; variants?: string[] }> = {};
    for (const gene of Object.keys(form)) {
      const f = form[gene];
      if (f.status === "tested") results[gene] = { status: "tested", variants: f.variants };
      else if (f.status === "uncertain") results[gene] = { status: "uncertain" };
      // not_tested is the implicit default server-side; omit to keep the
      // payload small.
    }
    try {
      const r = await api.post<{ id: string; replaced: boolean }>(
        "/api/lab/submit",
        { silaId, results },
        csrfToken,
      );
      setResult({ ok: true, replaced: r.replaced, id: r.id });
      setForm(initialForm());
      setSilaId("");
    } catch (e: unknown) {
      if (isApiError(e)) {
        const msg = (e.body as { error?: string } | null)?.error ?? "";
        if (msg === "sila_id_not_found") setResult({ ok: false, reason: "Unknown Sila ID." });
        else if (msg === "existing_result") setResult({ ok: false, reason: "That person already has a result on file; the demo lab can only submit fresh ones." });
        else if (msg === "unknown_gene") setResult({ ok: false, reason: "The payload contained a gene not on the current panel." });
        else setResult({ ok: false, reason: msg || "Could not submit." });
      } else {
        setResult({ ok: false, reason: "Could not submit." });
      }
    } finally {
      setSubmitting(false);
    }
  }

  function updateStatus(gene: string, status: Status) {
    setForm((f) => ({ ...f, [gene]: { status, variants: status === "tested" ? f[gene].variants : [] } }));
  }

  function toggleVariant(gene: string, variantId: string) {
    setForm((f) => {
      const current = f[gene].variants;
      const next = current.includes(variantId)
        ? current.filter((v) => v !== variantId)
        : [...current, variantId];
      // Cap at 2 — a person has at most two alleles per gene.
      const capped = next.slice(0, 2);
      return { ...f, [gene]: { status: "tested", variants: capped } };
    });
  }

  return (
    <main>
      <Reveal>
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">
            <span aria-hidden className="rule-green" />
            Lab workspace
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Submit a result</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Enter the person&apos;s Sila ID, pick each condition&apos;s result from the panel, then
            submit. Lab accounts can submit but never read a result back.
          </p>
        </header>
      </Reveal>

      <Reveal>
        <form onSubmit={submit} className="tile space-y-6 p-6">
          <label className="block text-sm font-medium">
            Sila ID
            <input
              value={silaId}
              onChange={(e) => setSilaId(e.target.value.toUpperCase())}
              placeholder="ABCD-EFGHIJ"
              required
              className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5 font-mono text-lg tracking-widest outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20"
            />
          </label>

          <div className="space-y-4">
            {PANEL.map((gene) => {
              const f = form[gene.gene];
              return (
                <fieldset
                  key={gene.gene}
                  className="rounded-xl border border-line bg-background/40 p-4"
                >
                  <legend className="px-2 text-sm font-semibold">
                    {gene.condition.en}{" "}
                    <span className="font-mono text-xs text-muted">({gene.gene})</span>
                  </legend>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {(["not_tested", "tested", "uncertain"] as Status[]).map((s) => (
                      <label key={s} className={`cursor-pointer rounded-full border px-3 py-1 ${
                        f.status === s
                          ? "border-teal bg-teal-soft text-teal"
                          : "border-line text-muted"
                      }`}>
                        <input
                          type="radio"
                          name={`${gene.gene}-status`}
                          value={s}
                          className="sr-only"
                          checked={f.status === s}
                          onChange={() => updateStatus(gene.gene, s)}
                        />
                        {s === "not_tested" ? "Not tested" : s === "uncertain" ? "Uncertain" : "Tested"}
                      </label>
                    ))}
                  </div>
                  {f.status === "tested" && (
                    <div className="mt-3">
                      <p className="text-xs text-muted">
                        Pick zero, one, or two alleles the person carries.
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {gene.alleles.map((a) => (
                          <label
                            key={a.id}
                            className={`cursor-pointer rounded-full border px-3 py-1 ${
                              f.variants.includes(a.id)
                                ? "border-teal bg-teal-soft text-teal"
                                : "border-line text-muted"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={f.variants.includes(a.id)}
                              onChange={() => toggleVariant(gene.gene, a.id)}
                            />
                            {a.id}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </fieldset>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted">
              Signed in as <span className="font-mono">{user?.email}</span>
            </p>
            <button
              type="submit"
              disabled={submitting || silaId.length === 0}
              className="group inline-flex items-center gap-2 rounded-full bg-teal px-5 py-2.5 text-sm font-medium text-white transition-[filter,transform] hover:brightness-110 hover:translate-y-[-1px] disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            >
              {submitting ? "Submitting…" : "Submit result"}
              {!submitting && <IconArrowRight />}
            </button>
          </div>

          {result && result.ok && (
            <p
              role="status"
              className="flex items-center gap-2 rounded-lg border border-teal/40 bg-teal-soft/50 p-3 text-sm text-teal"
            >
              <IconShield />
              {result.replaced ? "Result replaced." : "Result stored."}
              <span className="font-mono text-xs opacity-80">id: {result.id}</span>
            </p>
          )}
          {result && !result.ok && (
            <p
              role="alert"
              className="rounded-lg border border-affected/40 bg-affected-soft/50 p-3 text-sm text-affected"
            >
              {result.reason}
            </p>
          )}
        </form>
      </Reveal>
    </main>
  );
}
