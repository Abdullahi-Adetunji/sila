import {
  assessCouple,
  type ChildOutcome,
  type PersonResult,
} from "../../../src/lib/genetics/engine";
import { PANEL, type Bilingual } from "../../../src/lib/genetics/panel";
import { readResults } from "./vault";

export type CoupleRouteLabel = "information" | "counsellor" | "counsellor_priority";

// Couple-level reason labels. These collapse the engine's per-person reasons
// so a reader cannot tell which partner carries or is affected.
export type CoupleReasonLabel =
  | "shared_risk_serious"
  | "shared_risk"
  | "incomplete"
  | "needs_review";

export type GeneStatusLabel = "ready" | "uncertain" | "incomplete";

export interface CoupleGeneRisk {
  gene: string;
  condition: Bilingual;
  status: GeneStatusLabel;
  computable: boolean;
  outcomes: ChildOutcome[];
  affectedQuarters: number;
}

export interface CoupleView {
  status: "ready";
  route: CoupleRouteLabel;
  reasons: CoupleReasonLabel[];
  genes: CoupleGeneRisk[];
}

function conditionFor(gene: string): Bilingual {
  const g = PANEL.find((p) => p.gene === gene);
  return g ? g.condition : { en: gene, ar: gene };
}

export async function computeCoupleView(
  actorId: string,
  partnerId: string,
): Promise<CoupleView | null> {
  const [resultsA, resultsB] = await Promise.all([readResults(actorId), readResults(partnerId)]);
  if (!resultsA || !resultsB) return null;

  const a: PersonResult = { id: actorId, results: resultsA };
  const b: PersonResult = { id: partnerId, results: resultsB };
  const engine = assessCouple(a, b);

  const reasons = new Set<CoupleReasonLabel>();
  for (const r of engine.reasons) {
    if (r === "shared_risk_serious") reasons.add("shared_risk_serious");
    else if (r === "shared_risk") reasons.add("shared_risk");
    else if (r === "uncertain_result" || r === "partner_needs_testing") reasons.add("incomplete");
    else if (r === "person_affected") reasons.add("needs_review");
  }

  const genes: CoupleGeneRisk[] = engine.genes.map((g) => {
    let status: GeneStatusLabel = "ready";
    if (g.reason === "uncertain_result") status = "uncertain";
    else if (g.reason === "partner_needs_testing") status = "incomplete";
    return {
      gene: g.gene,
      condition: conditionFor(g.gene),
      status,
      computable: g.computable,
      outcomes: g.outcomes,
      affectedQuarters: g.affectedQuarters,
    };
  });

  return {
    status: "ready",
    route: engine.route,
    reasons: [...reasons],
    genes,
  };
}
