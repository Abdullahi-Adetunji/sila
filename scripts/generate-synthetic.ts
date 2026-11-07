// Generates the synthetic evaluation set: 100 couples (200 people).
// No real person's data is used. The scenario mix is fixed so every case type
// is represented; the seed makes the output identical on every run.
//
// Usage: npm run synthetic

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assessCouple, quartersToWords, type GeneResult, type PersonResult } from "../src/lib/genetics/engine";

const SEED = 20261106;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = s;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(SEED);
const pick = <T,>(xs: T[]): T => xs[Math.floor(rand() * xs.length)];

const t = (...variants: string[]): GeneResult => ({ status: "tested", variants });
const U: GeneResult = { status: "uncertain" };
const N: GeneResult = { status: "not_tested" };
type Results = Record<string, GeneResult>;
const clear = (): Results => ({ HBB: t(), CFTR: t(), GJB2: t() });
const carrierOf = (gene: string, allele: string): Results => ({ ...clear(), [gene]: t(allele) });

const ANY_CARRIER: [string, string][] = [
  ["HBB", "HbS"],
  ["HBB", "HbC"],
  ["HBB", "beta"],
  ["CFTR", "CFTR-p"],
  ["GJB2", "GJB2-p"],
];

interface Scenario {
  category: string;
  a: Results;
  b: Results;
}

const scenarios: Scenario[] = [];
const add = (n: number, category: string, make: () => [Results, Results]) => {
  for (let i = 0; i < n; i++) {
    const [a, b] = make();
    scenarios.push({ category, a, b });
  }
};

add(30, "neither carrier", () => [clear(), clear()]);
add(25, "one carrier", () => {
  const [g, al] = pick(ANY_CARRIER);
  return rand() < 0.5 ? [carrierOf(g, al), clear()] : [clear(), carrierOf(g, al)];
});
add(6, "both carriers, same gene: HbS + HbS", () => [carrierOf("HBB", "HbS"), carrierOf("HBB", "HbS")]);
add(4, "both carriers, same gene: HbS + beta", () => [carrierOf("HBB", "HbS"), carrierOf("HBB", "beta")]);
add(4, "both carriers, same gene: beta + beta", () => [carrierOf("HBB", "beta"), carrierOf("HBB", "beta")]);
add(2, "both carriers, same gene: HbS + HbC", () => [carrierOf("HBB", "HbS"), carrierOf("HBB", "HbC")]);
add(2, "both carriers, same gene: CFTR", () => [carrierOf("CFTR", "CFTR-p"), carrierOf("CFTR", "CFTR-p")]);
add(2, "both carriers, same gene: GJB2", () => [carrierOf("GJB2", "GJB2-p"), carrierOf("GJB2", "GJB2-p")]);
add(10, "both carriers, different genes", () => {
  const first = pick(ANY_CARRIER);
  const others = ANY_CARRIER.filter(([g]) => g !== first[0]);
  const second = pick(others);
  return [carrierOf(...first), carrierOf(...second)];
});
add(8, "uncertain result", () => {
  const g = pick(["HBB", "CFTR", "GJB2"]);
  const a = { ...clear(), [g]: U };
  const b = rand() < 0.5 ? clear() : carrierOf(...pick(ANY_CARRIER));
  return [a, b];
});
add(4, "one partner affected", () => {
  const a = { ...clear(), HBB: t("HbS", "HbS") };
  const b = rand() < 0.5 ? clear() : carrierOf("HBB", "HbS");
  return [a, b];
});
add(3, "partner not tested for a gene the other carries", () => [
  carrierOf("GJB2", "GJB2-p"),
  { ...clear(), GJB2: N },
]);

if (scenarios.length !== 100) throw new Error(`Expected 100 couples, got ${scenarios.length}`);

// Shuffle so case types are not grouped (reviewers should not guess from position).
for (let i = scenarios.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [scenarios[i], scenarios[j]] = [scenarios[j], scenarios[i]];
}

const describe = (r: Results) =>
  Object.entries(r)
    .map(([gene, v]) =>
      v.status === "tested" ? `${gene}:${v.variants.length ? v.variants.join("/") : "none"}` : `${gene}:${v.status}`,
    )
    .join(" ");

const couples = scenarios.map((s, i) => {
  const n = String(i + 1).padStart(3, "0");
  const a: PersonResult = { id: `P${n}A`, results: s.a };
  const b: PersonResult = { id: `P${n}B`, results: s.b };
  const assessment = assessCouple(a, b);
  return { coupleId: `C${n}`, category: s.category, a, b, engineOutput: assessment };
});

const outDir = join(process.cwd(), "data", "synthetic");
mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, "couples.json"),
  JSON.stringify({ seed: SEED, note: "Synthetic data. No real person's data.", couples }, null, 2),
);

const csvCell = (s: string) => `"${s.replace(/"/g, '""')}"`;
const header = [
  "couple_id",
  "partner_a",
  "partner_b",
  "engine_shared_risk",
  "engine_route",
  "engine_reasons",
  "clinician_agrees_risk (Y/N)",
  "clinician_expected_route",
  "clinician_notes",
];
const rows = couples.map((c) => {
  const risks = c.engineOutput.genes
    .filter((g) => g.affectedQuarters > 0)
    .map((g) => {
      const names = g.outcomes.filter((o) => o.kind === "affected").map((o) => o.phenotype).join(", ");
      return `${g.gene} ${quartersToWords(g.affectedQuarters)} (${names})`;
    })
    .join("; ");
  return [
    c.coupleId,
    describe(c.a.results),
    describe(c.b.results),
    risks || "none",
    c.engineOutput.route,
    c.engineOutput.reasons.join(", ") || "none",
    "",
    "",
    "",
  ]
    .map(csvCell)
    .join(",");
});
writeFileSync(join(outDir, "clinician_review.csv"), [header.join(","), ...rows].join("\n") + "\n");

const byRoute = couples.reduce<Record<string, number>>((m, c) => {
  m[c.engineOutput.route] = (m[c.engineOutput.route] ?? 0) + 1;
  return m;
}, {});
console.log(`Wrote ${couples.length} couples to data/synthetic. Routes:`, byRoute);
