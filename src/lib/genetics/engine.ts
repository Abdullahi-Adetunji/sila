// Couple risk engine for autosomal recessive conditions.
// Exact Mendelian arithmetic: each parent passes one of their two copies,
// each with probability 1/2, so every child outcome is a whole number of quarters.

import { PANEL, findPhenotype, getGene, type Severity } from "./panel";

export type GeneResult =
  | { status: "tested"; variants: string[] } // 0, 1 or 2 pathogenic variant ids found
  | { status: "uncertain" } // variant of uncertain significance or inconclusive test
  | { status: "not_tested" };

export interface PersonResult {
  id: string;
  results: Record<string, GeneResult>; // keyed by gene
}

export type PersonGeneStatus = "no_variant_found" | "carrier" | "affected" | "uncertain" | "not_tested";

export interface ChildOutcome {
  kind: "affected" | "carrier" | "unaffected";
  quarters: number; // chance per pregnancy, out of 4
  phenotype?: string; // English name, for affected outcomes
  severity?: Severity;
}

export interface GeneCoupleRisk {
  gene: string;
  computable: boolean;
  outcomes: ChildOutcome[]; // empty when not computable
  affectedQuarters: number;
  reason?: "uncertain_result" | "partner_needs_testing";
}

export type EscalationReason =
  | "shared_risk_serious"
  | "shared_risk"
  | "person_affected"
  | "uncertain_result"
  | "partner_needs_testing";

export type Route = "information" | "counsellor" | "counsellor_priority";

export interface CoupleAssessment {
  genes: GeneCoupleRisk[];
  reasons: EscalationReason[];
  route: Route;
}

export function personGeneStatus(r: GeneResult | undefined): PersonGeneStatus {
  if (!r || r.status === "not_tested") return "not_tested";
  if (r.status === "uncertain") return "uncertain";
  if (r.variants.length > 2) throw new Error("A person cannot carry more than two copies of a gene");
  if (r.variants.length === 0) return "no_variant_found";
  return r.variants.length === 1 ? "carrier" : "affected";
}

// The two copies a parent can pass on. null = a copy with no variant found.
function gametes(r: Extract<GeneResult, { status: "tested" }>): (string | null)[] {
  const v = r.variants;
  return [v[0] ?? null, v[1] ?? null];
}

export function geneCoupleRisk(gene: string, a: GeneResult | undefined, b: GeneResult | undefined): GeneCoupleRisk {
  const def = getGene(gene);
  const sa = personGeneStatus(a);
  const sb = personGeneStatus(b);

  if (sa === "uncertain" || sb === "uncertain") {
    return { gene, computable: false, outcomes: [], affectedQuarters: 0, reason: "uncertain_result" };
  }
  if (sa === "not_tested" || sb === "not_tested") {
    const otherHasVariant = ["carrier", "affected"].includes(sa === "not_tested" ? sb : sa);
    return {
      gene,
      computable: false,
      outcomes: [],
      affectedQuarters: 0,
      reason: otherHasVariant ? "partner_needs_testing" : undefined,
    };
  }

  const ga = gametes(a as Extract<GeneResult, { status: "tested" }>);
  const gb = gametes(b as Extract<GeneResult, { status: "tested" }>);
  const tally = new Map<string, ChildOutcome>();

  for (const x of ga) {
    for (const y of gb) {
      let outcome: ChildOutcome;
      if (x && y) {
        const ph = findPhenotype(def, x, y);
        outcome = { kind: "affected", quarters: 1, phenotype: ph.name.en, severity: ph.severity };
      } else if (x || y) {
        outcome = { kind: "carrier", quarters: 1 };
      } else {
        outcome = { kind: "unaffected", quarters: 1 };
      }
      const key = `${outcome.kind}:${outcome.phenotype ?? ""}`;
      const prev = tally.get(key);
      if (prev) prev.quarters += 1;
      else tally.set(key, outcome);
    }
  }

  const order = { affected: 0, carrier: 1, unaffected: 2 };
  const outcomes = [...tally.values()].sort((p, q) => order[p.kind] - order[q.kind]);
  const affectedQuarters = outcomes.filter((o) => o.kind === "affected").reduce((s, o) => s + o.quarters, 0);
  return { gene, computable: true, outcomes, affectedQuarters };
}

export function assessCouple(a: PersonResult, b: PersonResult): CoupleAssessment {
  const genes = PANEL.map((g) => geneCoupleRisk(g.gene, a.results[g.gene], b.results[g.gene]));
  const reasons = new Set<EscalationReason>();

  for (const g of genes) {
    if (g.reason) reasons.add(g.reason);
    for (const o of g.outcomes) {
      if (o.kind === "affected") reasons.add(o.severity === "serious" ? "shared_risk_serious" : "shared_risk");
    }
  }
  for (const p of [a, b]) {
    for (const g of PANEL) {
      if (personGeneStatus(p.results[g.gene]) === "affected") reasons.add("person_affected");
    }
  }

  const list = [...reasons];
  const route: Route =
    reasons.has("shared_risk_serious") || reasons.has("person_affected")
      ? "counsellor_priority"
      : list.length > 0
        ? "counsellor"
        : "information";

  return { genes, reasons: list, route };
}

export function quartersToWords(q: number): string {
  return ["no chance", "1 in 4", "1 in 2", "3 in 4", "every pregnancy"][q] ?? `${q} in 4`;
}
