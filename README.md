# Sila

Private carrier results for couples, explained clearly. Built by CEDELA Tech Park Solutions for the Future Health Digital Innovation Challenge (Challenge 03: Understanding and Reducing Inherited Disease Risk).

Prototype status: all data is synthetic, and all clinical wording is a draft awaiting review by the clinical adviser.

## What is here

| Path | What it is |
| --- | --- |
| `src/lib/genetics/panel.ts` | Screening panel: genes, variants, conditions, severity labels (draft) |
| `src/lib/genetics/engine.ts` | Couple risk engine: exact Mendelian risk per gene, including compound cases such as HbS with beta thalassaemia, plus routing to a counsellor |
| `src/lib/genetics/engine.test.ts` | Unit tests for every Punnett case and routing rule |
| `scripts/generate-synthetic.ts` | Generates 100 synthetic couples with a fixed seed |
| `data/synthetic/couples.json` | The 100 couples and the engine's output for each |
| `data/synthetic/clinician_review.csv` | Sheet for the clinical adviser to check every couple's risk and route |
| `src/app/page.tsx` | Couple result screen, English and Arabic |

## Run it

```bash
npm install
npm test            # engine tests
npm run synthetic   # regenerate the synthetic couples
npm run dev         # http://localhost:3000
```

## Design rules

- Risk is calculated with fixed genetics, not a model. The same inputs always give the same answer.
- A couple risk is only shown when both partners have consented. Neither partner sees the other's individual result unless that person chooses to share it.
- Any shared risk, uncertain result or affected partner is routed to a genetic counsellor. The app never gives clinical advice.
