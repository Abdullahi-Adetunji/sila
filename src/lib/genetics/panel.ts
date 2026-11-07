// Screening panel used by the prototype.
// DRAFT: the conditions, variant groups, names and severity labels must be
// confirmed by the clinical adviser before any evaluation run.

export type Severity = "serious" | "moderate" | "mild" | "variable";

export interface Bilingual {
  en: string;
  ar: string;
}

export interface AlleleDef {
  id: string;
  label: Bilingual;
  // Wording for a person who carries one copy of this variant.
  carrierLabel: Bilingual;
}

export interface PhenotypeDef {
  // Two allele ids, order does not matter.
  alleles: [string, string];
  name: Bilingual;
  severity: Severity;
}

export interface GeneDef {
  gene: string;
  condition: Bilingual;
  alleles: AlleleDef[];
  phenotypes: PhenotypeDef[];
}

export const PANEL: GeneDef[] = [
  {
    gene: "HBB",
    condition: { en: "Haemoglobin disorders", ar: "اضطرابات الهيموغلوبين" },
    alleles: [
      {
        id: "HbS",
        label: { en: "Haemoglobin S", ar: "الهيموغلوبين S" },
        carrierLabel: { en: "sickle cell trait", ar: "سمة الخلايا المنجلية" },
      },
      {
        id: "HbC",
        label: { en: "Haemoglobin C", ar: "الهيموغلوبين C" },
        carrierLabel: { en: "haemoglobin C trait", ar: "سمة الهيموغلوبين C" },
      },
      {
        id: "beta",
        label: { en: "Beta thalassaemia variant", ar: "متغير ثلاسيميا بيتا" },
        carrierLabel: { en: "beta thalassaemia trait", ar: "سمة ثلاسيميا بيتا" },
      },
    ],
    phenotypes: [
      { alleles: ["HbS", "HbS"], name: { en: "sickle cell anaemia", ar: "فقر الدم المنجلي" }, severity: "serious" },
      { alleles: ["HbS", "HbC"], name: { en: "haemoglobin SC disease", ar: "مرض الهيموغلوبين SC" }, severity: "moderate" },
      { alleles: ["HbS", "beta"], name: { en: "sickle beta thalassaemia", ar: "ثلاسيميا بيتا المنجلية" }, severity: "variable" },
      { alleles: ["beta", "beta"], name: { en: "beta thalassaemia (major or intermedia)", ar: "ثلاسيميا بيتا (الكبرى أو المتوسطة)" }, severity: "serious" },
      { alleles: ["HbC", "HbC"], name: { en: "haemoglobin C disease", ar: "مرض الهيموغلوبين C" }, severity: "mild" },
      { alleles: ["HbC", "beta"], name: { en: "haemoglobin C beta thalassaemia", ar: "ثلاسيميا بيتا مع الهيموغلوبين C" }, severity: "variable" },
    ],
  },
  {
    gene: "CFTR",
    condition: { en: "Cystic fibrosis", ar: "التليف الكيسي" },
    alleles: [
      {
        id: "CFTR-p",
        label: { en: "Cystic fibrosis variant", ar: "متغير التليف الكيسي" },
        carrierLabel: { en: "cystic fibrosis carrier", ar: "حامل للتليف الكيسي" },
      },
    ],
    phenotypes: [
      { alleles: ["CFTR-p", "CFTR-p"], name: { en: "cystic fibrosis", ar: "التليف الكيسي" }, severity: "serious" },
    ],
  },
  {
    gene: "GJB2",
    condition: { en: "Inherited hearing loss", ar: "فقدان السمع الوراثي" },
    alleles: [
      {
        id: "GJB2-p",
        label: { en: "Hearing loss variant", ar: "متغير فقدان السمع" },
        carrierLabel: { en: "hearing loss carrier", ar: "حامل لفقدان السمع" },
      },
    ],
    phenotypes: [
      { alleles: ["GJB2-p", "GJB2-p"], name: { en: "inherited hearing loss (DFNB1)", ar: "فقدان السمع الوراثي (DFNB1)" }, severity: "moderate" },
    ],
  },
];

export function getGene(gene: string): GeneDef {
  const g = PANEL.find((x) => x.gene === gene);
  if (!g) throw new Error(`Unknown gene: ${gene}`);
  return g;
}

export function findPhenotype(gene: GeneDef, a: string, b: string): PhenotypeDef {
  const p = gene.phenotypes.find(
    (ph) => (ph.alleles[0] === a && ph.alleles[1] === b) || (ph.alleles[0] === b && ph.alleles[1] === a),
  );
  if (!p) throw new Error(`No phenotype defined for ${gene.gene} ${a}/${b}`);
  return p;
}
