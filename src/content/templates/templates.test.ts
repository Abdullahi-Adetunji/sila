import { describe, expect, it } from "vitest";
import { allTemplates, type Template } from "./index";

const VALID_SECTION: Template["sectionLabel"][] = [
  "education",
  "decision_support",
  "clinical_advice",
];

describe("template catalog", () => {
  const rows = allTemplates();

  it("has at least one template", () => {
    expect(rows.length).toBeGreaterThan(0);
  });

  it.each(rows)("$id has both languages, a section label, and valid metadata", (t) => {
    expect(t.id).toMatch(/^[a-z][a-z0-9_.]*$/);
    expect(t.version).toBeGreaterThan(0);
    expect(["draft", "approved"]).toContain(t.status);
    expect(VALID_SECTION).toContain(t.sectionLabel);
    expect(typeof t.note).toBe("string");
    expect(t.note.length).toBeGreaterThan(0);
    expect(t.text.en.length).toBeGreaterThan(0);
    expect(t.text.ar.length).toBeGreaterThan(0);
    if (t.status === "approved") {
      expect(t.approvedBy).toBeTruthy();
    }
  });

  it("has unique ids", () => {
    const ids = rows.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("marks confirmatory and result-received referral steps as clinical_advice", () => {
    const confirm = rows.find((r) => r.id === "referral.step.confirmatory_ordered")!;
    const result = rows.find((r) => r.id === "referral.step.result_received")!;
    expect(confirm.sectionLabel).toBe("clinical_advice");
    expect(result.sectionLabel).toBe("clinical_advice");
  });
});
