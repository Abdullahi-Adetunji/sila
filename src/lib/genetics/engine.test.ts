import { describe, expect, it } from "vitest";
import { assessCouple, geneCoupleRisk, personGeneStatus, type GeneResult, type PersonResult } from "./engine";

const t = (...variants: string[]): GeneResult => ({ status: "tested", variants });
const person = (id: string, results: PersonResult["results"]): PersonResult => ({ id, results });
const clear = { HBB: t(), CFTR: t(), GJB2: t() };

describe("personGeneStatus", () => {
  it("reads variant counts", () => {
    expect(personGeneStatus(t())).toBe("no_variant_found");
    expect(personGeneStatus(t("HbS"))).toBe("carrier");
    expect(personGeneStatus(t("HbS", "HbS"))).toBe("affected");
    expect(personGeneStatus({ status: "uncertain" })).toBe("uncertain");
    expect(personGeneStatus(undefined)).toBe("not_tested");
  });
  it("rejects more than two copies", () => {
    expect(() => personGeneStatus(t("HbS", "HbS", "HbC"))).toThrow();
  });
});

describe("geneCoupleRisk (Punnett squares)", () => {
  it("two sickle cell carriers: 1 affected, 2 carriers, 1 unaffected", () => {
    const r = geneCoupleRisk("HBB", t("HbS"), t("HbS"));
    expect(r.affectedQuarters).toBe(1);
    expect(r.outcomes).toEqual([
      { kind: "affected", quarters: 1, phenotype: "sickle cell anaemia", severity: "serious" },
      { kind: "carrier", quarters: 2 },
      { kind: "unaffected", quarters: 1 },
    ]);
  });

  it("HbS carrier with beta thalassaemia carrier: compound risk on the same gene", () => {
    const r = geneCoupleRisk("HBB", t("HbS"), t("beta"));
    expect(r.affectedQuarters).toBe(1);
    expect(r.outcomes[0]).toMatchObject({ kind: "affected", phenotype: "sickle beta thalassaemia" });
  });

  it("HbS carrier with HbC carrier gives SC disease risk", () => {
    const r = geneCoupleRisk("HBB", t("HbC"), t("HbS"));
    expect(r.outcomes[0]).toMatchObject({ kind: "affected", quarters: 1, phenotype: "haemoglobin SC disease" });
  });

  it("one carrier only: no affected children, half carriers", () => {
    const r = geneCoupleRisk("CFTR", t("CFTR-p"), t());
    expect(r.affectedQuarters).toBe(0);
    expect(r.outcomes).toEqual([
      { kind: "carrier", quarters: 2 },
      { kind: "unaffected", quarters: 2 },
    ]);
  });

  it("affected parent with carrier: 1 in 2 affected", () => {
    const r = geneCoupleRisk("HBB", t("HbS", "HbS"), t("HbS"));
    expect(r.affectedQuarters).toBe(2);
    expect(r.outcomes).toEqual([
      { kind: "affected", quarters: 2, phenotype: "sickle cell anaemia", severity: "serious" },
      { kind: "carrier", quarters: 2 },
    ]);
  });

  it("affected parent with no variant found: every child is a carrier", () => {
    const r = geneCoupleRisk("HBB", t("HbS", "HbS"), t());
    expect(r.outcomes).toEqual([{ kind: "carrier", quarters: 4 }]);
  });

  it("two affected parents: every child affected", () => {
    const r = geneCoupleRisk("HBB", t("HbS", "HbS"), t("HbS", "HbS"));
    expect(r.affectedQuarters).toBe(4);
  });

  it("outcome quarters always sum to 4", () => {
    const cases: [GeneResult, GeneResult][] = [
      [t(), t()],
      [t("HbS"), t("HbC")],
      [t("HbS", "beta"), t("HbC")],
      [t("beta", "beta"), t("beta", "HbS")],
    ];
    for (const [a, b] of cases) {
      const r = geneCoupleRisk("HBB", a, b);
      expect(r.outcomes.reduce((s, o) => s + o.quarters, 0)).toBe(4);
    }
  });

  it("does not compute when a result is uncertain", () => {
    const r = geneCoupleRisk("HBB", { status: "uncertain" }, t("HbS"));
    expect(r.computable).toBe(false);
    expect(r.reason).toBe("uncertain_result");
  });

  it("asks for partner testing when the partner of a carrier was not tested", () => {
    const r = geneCoupleRisk("GJB2", t("GJB2-p"), { status: "not_tested" });
    expect(r.reason).toBe("partner_needs_testing");
  });
});

describe("assessCouple routing", () => {
  it("no shared risk and nothing uncertain goes to information only", () => {
    const a = person("a", clear);
    const b = person("b", { ...clear, HBB: t("HbS") });
    expect(assessCouple(a, b).route).toBe("information");
  });

  it("carriers of different conditions have no shared risk", () => {
    const a = person("a", { ...clear, CFTR: t("CFTR-p") });
    const b = person("b", { ...clear, GJB2: t("GJB2-p") });
    const res = assessCouple(a, b);
    expect(res.route).toBe("information");
    expect(res.genes.every((g) => g.affectedQuarters === 0)).toBe(true);
  });

  it("shared risk of a serious condition is a priority referral", () => {
    const a = person("a", { ...clear, HBB: t("beta") });
    const b = person("b", { ...clear, HBB: t("beta") });
    const res = assessCouple(a, b);
    expect(res.route).toBe("counsellor_priority");
    expect(res.reasons).toContain("shared_risk_serious");
  });

  it("shared risk of a non-serious condition still goes to a counsellor", () => {
    const a = person("a", { ...clear, GJB2: t("GJB2-p") });
    const b = person("b", { ...clear, GJB2: t("GJB2-p") });
    expect(assessCouple(a, b).route).toBe("counsellor");
  });

  it("an uncertain result goes to a counsellor", () => {
    const a = person("a", { ...clear, CFTR: { status: "uncertain" } });
    const b = person("b", clear);
    const res = assessCouple(a, b);
    expect(res.route).toBe("counsellor");
    expect(res.reasons).toEqual(["uncertain_result"]);
  });

  it("a person who has the condition is a priority referral even with no shared risk", () => {
    const a = person("a", { ...clear, HBB: t("HbS", "HbS") });
    const b = person("b", clear);
    expect(assessCouple(a, b).route).toBe("counsellor_priority");
  });
});
