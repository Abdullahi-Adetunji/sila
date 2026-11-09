import { describe, expect, it } from "vitest";
import { allQuizItems, conceptsCovered } from "./index";

const REQUIRED_CONCEPTS = [
  "carrier_vs_affected",
  "chance_per_pregnancy",
  "independence_between_pregnancies",
  "risk_vs_diagnosis",
  "residual_risk",
  "consanguinity",
  "uncertainty",
  "neutrality",
] as const;

describe("quiz catalog", () => {
  const items = allQuizItems();

  it("covers every required concept exactly once", () => {
    const covered = conceptsCovered();
    for (const c of REQUIRED_CONCEPTS) expect(covered).toContain(c);
    // No duplicate concepts.
    expect(new Set(items.map((i) => i.concept)).size).toBe(items.length);
  });

  it("each item has forms A and B with same choice counts across forms and languages", () => {
    for (const it of items) {
      expect(it.forms.A.en.choices.length).toBeGreaterThanOrEqual(2);
      expect(it.forms.A.en.choices.length).toBe(it.forms.A.ar.choices.length);
      expect(it.forms.B.en.choices.length).toBe(it.forms.B.ar.choices.length);
      expect(it.forms.A.en.choices.length).toBe(it.forms.B.en.choices.length);
    }
  });

  it("scored items have a valid correct index on every language and form; neutrality is null", () => {
    for (const it of items) {
      for (const form of ["A", "B"] as const) {
        for (const lang of ["en", "ar"] as const) {
          const f = it.forms[form][lang];
          if (it.concept === "neutrality") {
            expect(f.correct).toBeNull();
          } else {
            expect(f.correct).not.toBeNull();
            expect(f.correct!).toBeGreaterThanOrEqual(0);
            expect(f.correct!).toBeLessThan(f.choices.length);
          }
        }
      }
    }
  });

  it("every item has unique ids and non-empty metadata", () => {
    const ids = items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const it of items) {
      expect(it.id).toMatch(/^quiz\./);
      expect(it.note.length).toBeGreaterThan(0);
      expect(it.version).toBeGreaterThan(0);
    }
  });

  it("A and B differ in at least the question text, so 'after' does not measure memory of 'before'", () => {
    for (const it of items) {
      expect(it.forms.A.en.question).not.toBe(it.forms.B.en.question);
      expect(it.forms.A.ar.question).not.toBe(it.forms.B.ar.question);
    }
  });
});
