# 3-minute demo script

**Audience.** The 3-minute video narrator. Matches the Playwright `judge.spec.ts` click path so every step can be captured.

**Live URL:** https://sila-a7fx.onrender.com

**Total runtime:** 3:00 ± 0:05.

## Shot list

| # | Time | Action | What to show |
| --- | --- | --- | --- |
| 1 | 0:00 – 0:10 | Open the live URL. | Landing. Pause on the hero: "Private carrier results for couples, explained clearly." Then the prototype banner. |
| 2 | 0:10 – 0:20 | Scroll to **Try the demo**. Click **Sign in as Partner A**. | The three demo buttons, then the signed-in home (`/home`). |
| 3 | 0:20 – 0:35 | Click **My result**. | The `/me` page: HBB carrier card with SectionLabel = Education; residual-risk explainer appears for a "no variant found" gene. |
| 4 | 0:35 – 0:55 | Click **Consent**. Toggle **Share the couple risk with my partner**. | The grant-row flips from Grant to Granted. |
| 5 | 0:55 – 1:25 | (Pre-arranged: Partner B has already toggled the same consent from their session.) Open **Couple result**. | Dual framing visible: "1 in 4 chance a child is affected, 3 in 4 chance not." Underneath, the independence line: "The chance is the same in every pregnancy, whatever happened in earlier pregnancies." |
| 6 | 1:25 – 1:40 | Click the **EN ↔ عربي** switch. | Arabic strings appear right-to-left with the same layout. Pause 2s. |
| 7 | 1:40 – 1:55 | Click **Options**. | Five non-ranked options with a "Sila never recommends a reproductive or marriage decision" note. |
| 8 | 1:55 – 2:15 | Back to **Couple result**. Click **Request a counsellor** → **Submit referral**. | Referral posted. The button flips to "Referral submitted". |
| 9 | 2:15 – 2:30 | Log out. **Sign in as counsellor** from the demo panel. Open **Queue**. | Partner A's referral appears at the top, tagged priority. |
| 10 | 2:30 – 2:45 | As the counsellor, open Developer tools → fetch `/api/me/result` with Partner A's ID as the path. | 403 with `reason: "not_own_result"` (or an equivalent policy denial). |
| 11 | 2:45 – 3:00 | Log in as Partner A. Open **Access log**. | The denied counsellor attempt appears at the top with outcome "denied" and purpose. |

## Narration notes

- Say "all data is synthetic" once in the first 15 seconds.
- Say "no AI in the risk calculation or clinical text" once between shot 5 and shot 6.
- Do **not** quote a risk figure outside the templates. Where a chance is on screen, use the exact wording the template shows.

## Follow-along checklist (for the operator)

- [ ] Browser zoom at 100% so the two-framings line fits.
- [ ] Two private windows, one each for Partner A and Partner B, already warm.
- [ ] The counsellor demo button goes to a third private window — close it after shot 11.
- [ ] After the recording, clear every browser session and run `npm run attack` once against the live URL to confirm nothing changed.
