# Test Performance Audit

This audit measures where the CI test jobs spend their time, lists tests that are slow, duplicate another test, or prove nothing the layer below does not already prove, and proposes the CI splits and test cuts that bring every CI test job's test step under 7 minutes. It changes no test or app code.

**What the owner needs to do:** approve, change, or skip the five proposed tasks (MC.10 to MC.14 in [Proposed Tasks](#proposed-tasks)). Nothing is minted until then. The rules in [Proposed Rules](#proposed-rules) are already decided by the owner; the table there records each decision.

## Summary

**What was measured.** Two CI runs of the PR gate (run A = 42934452944, run B = 42931606693) on `ubuntu-26.04` runners with 4 vCPU. Every figure marked **(CI)** is read from those runs. Every figure not so marked is an **estimate**. Playwright and story timings come from CI only, by decision; no local Playwright run was made. No local `npm run test:coverage` figures are recorded: the owner did not approve a full-suite run for this audit.

**The headline.**

- Three jobs are at or near 7 minutes in their test step: the `playwright` gate (795 s, over), the `stories` suite (476 s, over), and `vitest-dom` (426 s, borderline).
- No job shards today: each runs as one runner. The gate's 563 tests and the stories' 128 each run on one 4-vCPU machine.
- In the gate, one accessibility sweep file, `axe.spec.ts`, is 589 of about 2,500 summed test seconds (23%), and its longest single test (114 s) cannot be split across shards as it is written.
- In Vitest, one PDF test file takes 59 s, and four whole-form component files take 17 to 34 s each.
- About 25 gate accessibility scans and about 29 story scans (estimate) repeat a page state the sweep already scans.

**The five follow-up tasks (approved by the owner, 27 h in all).** MC.11 fixes the two flaky tests itself rather than filing bug tasks for them (+0.5 h), and MC.13 builds the Vitest half of R-7, a named wait helper and its guard (+0.5 h).

| Id    | Title                                                      | Estimate |
| ----- | ---------------------------------------------------------- | -------- |
| MC.10 | Shard the CI Test Jobs                                     | 5 h      |
| MC.11 | Wait on State in Playwright, Not on Time                   | 4 h      |
| MC.12 | Trim the Playwright Suites to What a Browser Adds          | 6.5 h    |
| MC.13 | Speed Up the Slow Vitest Dom Files                         | 6.5 h    |
| MC.14 | Pay Database Setup Once and Prove Each Rule Once in Vitest | 5 h      |

**How sure the findings are.** Every finding was checked against the code by a read-only pass, with file and line references. Line numbers are from the `/app` checkout on branch `feature/mc.9-clean-up-styles-unused-code` as of 2026-11-11. MC.8 and MC.9 were not yet merged, so each task re-checks its findings against their diffs first.

**Earlier work this audit does not repeat.** M14.27 and MB.224 to MB.230 ("prove each requirement once") already cut duplicates. New rules add to [`testing/layer-ownership.md`](../testing/layer-ownership.md) and never restate it. [Past Attempts](#past-attempts) lists what was tried and rejected.

## Where CI's Time Goes

All figures in this section are **CI measurements** from runs A and B. Every job runs on `ubuntu-26.04` (4 vCPU), in containers, with no shard or matrix anywhere.

| Job               | Job total | Test step | Startup inside step         | Real test time | Tests | Over 7 min? |
| ----------------- | --------- | --------- | --------------------------- | -------------- | ----- | ----------- |
| `playwright` gate | 14m49s    | 795 s     | about 81 s                  | about 714 s    | 563   | Yes         |
| `stories`         | 9m30s     | 476 s     | about 99 s                  | about 378 s    | 128   | Yes         |
| `vitest-dom`      | 7m54s     | 426 s     | not measured                | 402 s (6m42s)  | 4,397 | Borderline  |
| `vitest-db`       | 7m18s     | 363 s     | about 42 s (template build) | 321 s (5m21s)  | 4,799 | No          |
| `vitest-node`     | 3m33s     | 159 s     | not measured                | not measured   | 2,940 | No          |

- **Gate:** 4 workers, 2 retries, `fullyParallel`. Summed test seconds were 2,517 (run A) and 2,558 (run B).
- **Stories:** 1 retry, 4 workers. Summed test seconds were 1,398 (run A) and 1,061 (run B).
- **End-to-end coverage:** `E2E_COVERAGE=1` is set on both Playwright suites. The docs say it costs about 25% of test time.
- **Retries seen:**
  - Run A: `spell-quantity-input` failed at 30.2 s, then passed on retry in 5.5 s.
  - Run B: the `admin-help` keeper test failed at its 120 s timeout, then passed on retry in 42.4 s.
  - Stories: no retries.
- **Vitest merge job:** 44 s of image pull for 7 s of work.
- **`playwright-coverage`:** it was cancelled by a newer push, not failed. Its group `pr-gate-playwright-coverage-<pr>` has `cancel-in-progress: true` (`.github/workflows/pr-gate.yml:364-377`).
- **The Playwright PR comment shows no duration.** `.github/actions/pr-comment/action.yml:67` declares a `duration` input that no workflow passes.
- **Coverage reporting:**
  - Playwright coverage artifacts upload `if: always()` (`playwright.yml:204-210`). `vitest-coverage` uploads on `!cancelled()` (`vitest.yml:225-231`).
  - The stories suite uploads its own `playwright-coverage-stories`. `merge-playwright-coverage.mjs` merges it into one Coverage section, so acceptance coverage is not reported separately in the comment.
  - Only the `vitest / vitest` merge job enforces the 80% threshold (`vitest.yml:212`, `vitest.config.mts:197-202`). The parts pass `--coverage.thresholds.*=0` (`vitest-part/action.yml:40`).
- **Vitest coverage (run A):** 95.81% lines, 89.58% branches, 94.06% functions, 94.44% statements, over 966 files and 12,136 tests. The log gives percentages only; counts are in `coverage-summary.json` inside the `vitest-coverage` artifact.
- **Branch rules:** the Main, Release Branches, and Staging rulesets have no required-status-checks rule. Branch protection returned 403, so it is unread.
- **`claude-docs/ci/runner-budget.md`:** its timing tables are about 9 times out of date. It already sketches `dom --shard 1/2` (lines 131-133) and advises against sharding `db`.

### Gate Files by Median Summed Seconds (CI)

| File                 | Summed s | Tests | Note                                                                                                      |
| -------------------- | -------- | ----- | --------------------------------------------------------------------------------------------------------- |
| `axe.spec.ts`        | 589      | 29    | 23% of the gate. "Every modal, as steward" alone takes 114 s, and one test cannot be split across shards. |
| `admin-compendium`   | 178      | 29    |                                                                                                           |
| `skeleton-layout`    | 156      | 65    |                                                                                                           |
| `admin-documents`    | 135      | 14    | One test takes 29.8 s.                                                                                    |
| `admin-help`         | 101      | 3     | Its keeper test is the flaky one: 120 s fail, then 42 s pass.                                             |
| `stack-row-skeleton` | 101      | 2     | Two 375 px tests (light and dark) take 48-52 s each.                                                      |
| `help-pages`         | 89       | 42    |                                                                                                           |
| `shell`              | 71       | 20    |                                                                                                           |
| `document-pages`     | 63       | 35    |                                                                                                           |
| `admin-cards`        | 49       | 4     | One test takes 27.4 s.                                                                                    |

- **Next tier:** `navigation-wait` 48 s, `coven-ingredients` 47 s, `ingredient-details-modal` 43 s, `admin` 40 s, `spell-recipe-layout` 40 s, `card-click` 37 s, `forced-colours` 36 s.
- **Layout, width, and skeleton files:** 18 files, about 434 s, or 17% of the gate. The stories suite has none.
- **Stories:** `07-admin` 267 s (16 tests, one of 57 s), `06-grimoire` 162 s, `08-email-and-admin` 134 s, `04-modals` 85 s, `03-ingredients` 84 s, `03-ingredient-autosave` 68 s (2 tests, one of 46 s).

### Slowest Vitest Files (CI, Run A, Comment's Top 10)

| File                                     | Time   | Tests      |
| ---------------------------------------- | ------ | ---------- |
| `tests/lib/invitation-cards/pdf.test.ts` | 59.3 s | 26         |
| `IngredientForm/index.test.tsx`          | 33.5 s | 51         |
| `IngredientForm/variants.test.tsx`       | 23.4 s | 14         |
| `SpellBuilder/steps.test.tsx`            | 22.6 s | 51         |
| `IngredientForm/compendium.test.tsx`     | 17.0 s | 32         |
| `tests/db/seed/compendium.test.ts`       | 14.9 s | 63         |
| `password-lockout`                       | 14.8 s | not listed |
| `seed/index.test.ts`                     | 14.4 s | 35         |
| `two-factor`                             | 12.5 s | not listed |
| `DocumentEditor/toolbar`                 | 12.3 s | 23         |

The part logs print no per-file lines beyond the comment's top 10. The full list is in the part JSON artifacts, which CI keeps for 1 day.

## Findings

Twenty-seven findings, T-1 to T-27, in the order of the areas they sit in. Each gives where it is, what was found and how sure that is, the fix, and the keeper: the test that keeps the requirement proved after the fix. Where a finding cuts nothing, the keeper line says so. A cut is proposed only where a named test keeps the requirement.

### CI Structure

#### T-1. No Shard Anywhere; Three Jobs Are at or Over 7 Minutes

- **Where:** `.github/workflows/playwright.yml`, `vitest.yml`, `pr-gate.yml`. Timings are in [Where CI's Time Goes](#where-cis-time-goes).
- **Found:** the gate, the stories suite, and `vitest-dom` each run on one runner. High confidence in the timings (CI); the per-shard times below are estimates.
- **Fix:** split with `--shard`, never with hand-assigned files.
  - Gate: 3 shards. Estimated about 215 s per shard if perfectly balanced, 300-340 s with about 80 s of startup.
  - Stories: 2 shards, an estimated 190-250 s each.
  - `vitest-dom`: 2 shards, an estimated 200 s each.
  - `vitest-db` stays one job (321 s), as `runner-budget.md` advises, because each shard would build its own template database.
- **Keeper:** nothing is cut.

#### T-2. The Axe Sweep Caps Shard Balance

- **Where:** `tests/e2e/axe.spec.ts:231` and `:233-287`; the scan lists are in `tests/e2e/axe-scans.ts`.
- **Found:** the sweep covers 68 routes and 43 modals in both themes, as 29 tests, one per persona. The longest ("Every modal, as steward") takes 114 s. A test is never split across shards, so that one test sets a floor under its shard. High confidence.
- **Fix:** generate one test per route group or modal group from `ROUTE_SCANS` and `MODAL_SCANS`, so `fullyParallel` sharding can spread them.
- **Keeper:** the guard `tests/guards/axe-scans.test.ts` stays, and so does every scan; only the grouping into tests changes.

#### T-3. The Edits Sharding Needs

This is a list of edits, not a new finding.

- `playwright.yml:176-189`: a matrix plus `--shard`.
- `playwright.yml:195, 204-210, 228-237`: shard-unique cache, coverage, and report artifact names.
- `playwright.yml:250-262`: merge the per-section comment and summary.
- `playwright-coverage.yml:73-89`: download artifacts by pattern.
- `vitest.yml:51`: a `dom` matrix.
- `vitest.yml:190-196`: download `vitest-blob-*`.
- `vitest.yml:207`: the hard-coded blob count of 3.
- `vitest.yml:221`: `VITEST_PARTS_PASSED`.
- `vitest-part/action.yml:40`: `--shard` and a unique blob name.
- `summarize-playwright.mjs` and `summarize-vitest.mjs`: aggregate across shards.
- `pr-gate.yml:317`, `:326-362`, `:364-376`, `:425-440`: the comment sections, `needs`, and the skipped-section logic.
- No new aggregator jobs: the Vitest merge job and the Playwright merge step join the shards (R-2).
- No config change: `--shard` is a command-line flag.
- **Keeper:** nothing is cut.

#### T-4. The Playwright Comment Has No Duration and No Slowest-Files List

- **Where:** `.github/actions/pr-comment/action.yml:67`; `.github/scripts/lib/slowest-files.mjs`.
- **Found:** the `duration` input exists and no workflow passes it. The Vitest comment lists its slowest files; the Playwright comment does not. High confidence.
- **Fix:** pass `duration`, and add a Playwright slowest-files list beside Vitest's.
- **Keeper:** nothing is cut.

#### T-5. Acceptance Coverage Is Not Reported Separately

- **Where:** `merge-playwright-coverage.mjs`; the stories suite's `playwright-coverage-stories` artifact.
- **Found:** the merge folds stories coverage into one Coverage section. High confidence.
- **Fix:** report the stories coverage figure as its own line in the comment.
- **Keeper:** nothing is cut.

**Coverage threshold probe.** A throwaway draft PR (#1677) added one generated, untested file under `src/` and was closed unmerged. The `vitest / vitest` job failed at its `Run vitest` step, with one error per metric against the 80% threshold: lines 67.65%, branches 70.63%, functions 70%, statements 69.28%. Every other job in the run passed or was still running at that point, including `checks / unused`. The branch was deleted from the remote and locally. A deliberate coverage drop therefore fails CI at that one job.

#### T-6. Two Flaky Gate Tests in Two Runs

- **Where:** `spell-quantity-input` (run A, 30 s fail), the `admin-help` keeper test (run B, 120 s fail).
- **Found:** each failed once and passed on retry. The gate retries twice. Two runs are too few to know the true flake rate.
- **Fix:** retries 2 to 1, and one bug task per flake. R-13 sets how a flake is shown.
- **Keeper:** nothing is cut; a flaky test is never skipped.

#### T-7. `runner-budget.md`'s Timing Tables Are About 9 Times Out of Date

- **Where:** `claude-docs/ci/runner-budget.md`, "Where a gate run's time goes".
- **Fix:** refresh the tables from the sharded runs (MC.10).
- **Keeper:** nothing is cut.

### Playwright Waits and Setup

#### T-8. Twenty-Two `networkidle` Waits

- **Where:** across `tests/e2e/`. A `hydrated` wait is defined twice, in `skeleton-layout` and `skeleton-back-scroll`.
- **Found:** `networkidle` waits for the network to go quiet rather than for the page state a test needs. Playwright's own API page marks it discouraged ([PW-api]). High confidence in the count.
- **Fix:** replace each with one shared `hydrated(page, selector)` helper, and add a guard that bans `networkidle`.
- **Keeper:** every test keeps its assertions; only the wait changes.

#### T-9. Real Sleeps to Replace

- **Where:**
  - `back-during-navigation:56, 59` (wait for the held request instead);
  - `back-during-navigation:109` (use `hydrated`);
  - `stack-row-skeleton:155` (wait on the `REAL` selector);
  - `menu-button-edge:53`;
  - `step-row-stays-open:41` (use `expect.poll`);
  - `admin-documents:641`.
- **Found:** fixed sleeps wait a set time whether or not the state arrived. They slow a passing run and can fail a slow one. High confidence.
- **Fix:** wait on the state each one is standing in for.
- **Keeper:** the assertions after each wait stay.

#### T-9a. Sleeps That Stay

- **Where:** `back-during-navigation:131`, `route-scroll:51`, `navigation-wait:238`, `spell-dialog-size:53`, `ingredient-details-modal:250`.
- **Found:** each is a timing requirement: the test is about what happens after a delay.
- **Fix:** route them through one shared helper that names why, so a guard can allow only that helper.
- **Keeper:** the five tests stay.

#### T-10. Slow, Mostly-Waiting Files

- **Where:** `stack-row-skeleton` (2 tests, 101 s), `admin-help` (3 tests, 101 s), `admin-documents:641`, `admin-cards` (one test of 27 s).
- **Found:** most of each test's time is a wait. The cause in each file is not yet confirmed; the task confirms it. Medium confidence.
- **Fix:** find the wait in each and replace it with a state wait.
- **Keeper:** the assertions stay.

#### T-11. Read-Only Story Tests Could Share One Seed

- **Where:** `stories/06-grimoire`: story 49 (:127), 52 (:263), 54 (:293), and 56 (:317, :396).
- **Found:** these tests only read what the seed gives them. Check [`testing/e2e.md`](../testing/e2e.md), "Databases and reseeding", before changing. `04-modals` writes in every story and is left alone. `spell-recipe-layout` (16 in-body seeds) and `coven-ingredients` (11) are not yet classified; the audit's classification was lost, so the task classifies them. Medium confidence.
- **Fix:** move the shared setup to `beforeAll` where the tests only read.
- **Keeper:** each story keeps its flow.

#### T-12. Serial Files Are All Correct

- **Where:** `stories/01-invitations`, the block at `01-accounts:138`, the block at `08-email-and-admin:329`, `compendium-cache`, `admin-help-order`. All chain state, so serial mode is right.
- **Exception:** `back-during-navigation`. Its seed moves to `beforeAll` and serial mode is dropped.
- **Keeper:** the lint rule `sorrel/e2e-chained-tests-serial` already holds this.

### Playwright Widths and Design Pins

Breakpoints the code has:

- Viewport: 640 (phone), 896 (tablet), 928 (page with navigation, wide), 800 (framed tabbed header).
- Page-header container queries: 350, 368, 400, 448, 536, 680, and 700, each at viewport width minus about 32 px.
- `TABLET_BAND` in `src/lib/use-media-query.ts`.

No spec-side export of these widths exists. The source side is DRY finding D-12 in [`dry.md`](dry.md); it is in no MC task (checked against `tasks/v1/mc.md`).

#### T-13. Width Sweeps

- **Where and fix:**
  - `tabbed-page-alignment:27`: cut 500, 600, 680, 700, and 1000 of 11 widths. Keep 712, the regression width.
  - `jump-menu-width:14`: keep 700, 900, and 1000. The guard `width < 1200` at :45 is stale and should be 928.
  - `page-with-nav-layout:53`: cut 1280.
  - `shell.spec.ts:430-436`: one `goto`, then a `setViewportSize` per step (about 24 `goto` calls saved).
- **Found:** the cut widths run code identical to a width that stays. High confidence for the three cuts; the saving is an estimate.
- **Keeper:** the widths that stay, each of which crosses a breakpoint above.

#### T-14. Identical-Body Width and Theme Pairs

- **Where and fix:**
  - `skeleton-layout:570-586`: the theme field is dead (always light). Run 375 only for pages that change at phone width.
  - `skeleton-back-scroll:36-75`: one width, cutting 2 tests.
  - `help-pages`: `:270` keeps 1280 only, `:307` drops 1000, `:617` drops 1200.
  - `spell-recipe-layout`: merge `:65` and `:236` and drop 800 (saves 3-4 seeded tests). Merge `:180` and `:333` at 1280, and keep `:333` at 800.
  - `theme-switch:10`: 1280 only.
  - `spell-quick-look:77-83`: cut the 375 step.
  - Width values equal to the default: drop them at `spell-footer-layout:17` and `ingredient-details-modal:211`, keeping the heights.
- **Found:** the removed rows run an identical body at a state that another row already proves. Medium to high confidence.
- **Keeper:** the row that stays in each pair.

#### T-15. Design Pins to Cut

A design pin asserts how something looks (a colour, a font weight, a pixel size). Rule 4 of `layer-ownership.md` says presentation belongs to the workshop story and the axe scan.

- **Where and fix:**
  - `smoke:72`: selection colours.
  - `compendium-entry:111`: badge colour, dark only.
  - `help-pages:644`: hover bar colour.
  - `card-invalid-backdrop:19, 26`: a `display` pin (medium confidence).
  - Trim only the pin lines in `ingredient-details-modal:153-158` (hover scale and colour) and `:204` (`overflowY`), `spell-print:180-187` (font weight) and `:249-259` (note width and font size), and `inventory-quick-look-size:46` (exact 28 and 20.3 px, and colour; keep a target of at least 24 px).
  - Drop the `card-click:30` `reducedMotion` line, which repeats the global setting.
  - Delete the two unasserted screenshots at `stories/06-spell-preview:168-190`.
- **Keeper:** the layout checks that stay (see T-17), and `tests/scss/tokens.test.ts` for token pairs.

#### T-16. Merges

- **Where and fix:** merge `public-compendium:143` and `:162`; merge `footer-tab-bar:50` into `smoke:13`; align `admin-compendium:917` from 390 to 375.
- **Keeper:** the merged test keeps both assertions.

#### T-17. Kept as Real Browser Requirements

This is the list the rules cite as "keep". Nothing here is cut.

- the 375 px no-sideways-scroll checks;
- the phone tab bar;
- the 640-896 SectionNav band;
- the 712 regression;
- print layout (`spell-print`);
- forced-colours marks;
- dialogs and panels fitting the viewport (`admin-compendium`);
- sticky rows (`public-compendium`);
- the 24 px target size (`card-click`);
- the fold layout and one contrast check per theme (`smoke:13`);
- `theme-switch:11` and `admin-compendium:877` (a deliberate `no-preference` setting);
- `backdrop-placement`, `menu-button-edge`, `tip-placement`, `coven-ingredients:438`, and `admin-compendium:949` and `:1001`.

### Accessibility Scans

The sweep `axe.spec.ts:233-287` covers 68 routes and 43 modals in both themes.

#### T-18. About 25 Gate Scans Repeat a Default State the Sweep Already Covers

About 7 of the 25 are uncertain.

- **Where (repeats, to cut):**
  - `shell:213-235` (keep the 375 `assertNoSidewaysScroll`);
  - `account:48`;
  - `admin:38, 59, 215`;
  - `access-pause:85`;
  - `error-pages:21`;
  - `admin-support-views:29`;
  - `admin-cards:64`;
  - `smoke:31`;
  - `support-pages:16, 21, 28, 35`;
  - `support-signed-out:15`;
  - `document-pages:44, 47`;
  - `document-sections:197`;
  - `document-versions:43`;
  - `public-compendium:158`;
  - `coven:97, 131`;
  - `terms-gate:24`;
  - `compendium-entry`;
  - `help-pages:504, 522`.
- **Distinct states, which stay:** `access-pause:72, 108, 140`; `error-pages:44`; `account:66`; `admin-cards:39, 50, 53, 60, 74, 91`; `admin-support-views:38`; `admin-business-cards:46, 111`; `admin:233, 283`; `support-sender-statuses:14` (one scan per status).
- **Found:** a scan of the plain page, as the same persona, in the same state the sweep scans. Rule 9 of `layer-ownership.md` already allows only one scan per page state.
- **Keeper:** the sweep scan of the same route and persona.

#### T-19. About 29 Story Scans Repeat the Sweep

- **Where:** 146 scan calls in the stories; the largest counts are `07-admin` 34, `08-email-and-admin` 23, and `01-invitations` 13. The repeats include the `/keepers/*` and `/curator/*` list pages and `/invite/[token]`.
- **Found:** an **estimate** of 29, range 20 to 35.
- **Fix:** remove the scan line. Removing a scan line does not delete a story.
- **Keeper:** the sweep scan of the same state.

### Gate Specs Another Layer Proves

Rule 9 of `layer-ownership.md`: a gate spec that a story flow proves is deleted.

#### T-20. Gate Specs to Cut or Move

- **Cut:**
  - `coven-rename:24` (kept by `stories/96-coven-rename:15-41`);
  - `admin-cards:12` (kept by `stories/88-invitation-cards:14`);
  - `support-sender-resolve:13` (kept by `stories/91-sender-thread:15`; check its admin-list and menu-count assertions first);
  - `graphql:8` (kept by `tests/app/api/graphql/route.test.ts:47`).
- **Cut, or move to Vitest:**
  - `security-headers:30`, if `tests/lib/security-headers.test.ts:18, 28` covers the same values;
  - `error-pages:86` (a title is copy).
- **Keep, because only a real server can prove them:** `coven-rename:51, 83, 116`; `workspace-invitation` (all four); `admin-cards:78, 143`; `admin-business-cards`; `admin-support-curator`; `help-pages` status codes; `public-compendium` cache and server HTML; `seo` (rendered output); `security-headers:39, 53`; `graphql:15-42`; the access-pause flows; `form-error-summary:29`.
- **Found:** medium to high confidence; the two "check first" items are the uncertain ones.

### Vitest

#### T-21. `pdf.test.ts` (59 s): About 640 Cards Rendered, 495 in One 100-Page Test

- **Where:** `tests/lib/invitation-cards/pdf.test.ts`.
- **Fix:**
  - Build `ten` and one 11-card document once.
  - Drop the 1, 10, 20, and 21 rows and the 495-card build.
  - Extract the sheet count (`Math.ceil(links.length / CARDS_PER_SHEET)`, inline in `renderCardSheets`) as a pure function, and test `MAX_SHEETS_PER_BATCH` on it.
- **Saving:** an **estimate** of about 40-48 s.
- **Keeper:** the 10-card and 11-card documents still prove one sheet and a page break; the pure function proves the boundaries.

#### T-22. Whole-Form Renders That Prove One Field

An **estimate** of about 33 s summed.

- **`IngredientForm/index`:**
  - Move `:140` to a `FormProvider` harness.
  - Move `:568` and `:597` to the `MultiSelectField` describe (`list-field.test.tsx:649`).
  - Cut `:770` (kept by `list-field:542` and `reorder:260`).
  - Merge `:1302` into `:746`, `:560` into `:546`, and `:446` into `:423`.
  - Assert role and kind, not the sentence, at `:1099`.
  - About 45 tests genuinely need the whole tree, so the file stays at about 29 s, over budget by decision.
- **`variants`:**
  - Move `:86`, `:111`, `:145`, `:250`, and `:270` to `renderVariants()` (`tests/components/IngredientForm/variants-harness.tsx:255`).
  - Cut `:303` (kept by `copy.test.tsx:58, 71`).
- **`SpellBuilder/steps`:**
  - About 38 tests move to a new `SpellSteps` harness on the `list-field.test.tsx:128` model.
  - Cut `:462` and `:485` (kept by `reorder:271, 282, 260`) and `:1336` (copy).
  - Replace the class checks at `:366`, `:946`, and `:949` with `aria-expanded` or an accessible name.
  - Drop the `:299` copy line.
- **`compendium`:**
  - Cut `:266` and `:297` (kept by `list-field:350, 255, 322`).
  - Move `:308` to `substitutes.test.tsx:73`.
  - Merge `:368`, `:505`, and `:520`.
  - Cut one row of `:655` (kept by `:636`).
- **Found:** each moved or cut test proves one field or one step, which a harness of that field proves with far less rendering (rule 6). Medium confidence on the saving.

#### T-23. Real Sleeps in Vitest

An **estimate** of about 13.4 s summed.

- **Replace with fake timers or a flush:**
  - `DocumentEditor/toolbar:64, 94`: 150 ms times about 56 calls, about 8.4 s. Use fake timers with `advanceTimersByTimeAsync`. The `platejs` throttle is unread, so confidence is medium.
  - `DocumentEditor/saving:72`.
  - `CompendiumList:493`: 1000 ms twice. Use `typingClock()` from `tests/support/compendium-list.tsx:233`.
  - `RecordWorking/dialog:136` (400 ms), `Combobox:848` (350 ms), `lookup-settling:20` (450 ms), `public-cupboard-actions:340` (200 ms).
  - `TermsAgreement:140`, `shown-toggle:118`, and `pending-navigation:247`: 50 ms each; an `act` flush is enough.
  - `tests/support/sortable.ts:68-119`: 60 ms each.
- **Cut:** `tests/lib/watch-loads.test.ts` (750 ms). It tests a test helper, which rule 1 says is not tested (R-14).
- **Keep:** the lock and race guards (`stock:564, 941`, `write:347, 456`, `email:144`); the 20 ms database polls; the `pg_sleep` calls in `last-edits` and `connection-under-msw:27`; the `setTimeout(0)` flushes.
- **Keeper:** each test's assertions stay.

#### T-24. Password Hashing Paid per Test

- **`password-lockout`:** 23 sign-ups and 45 sign-ins. Sign up once in `beforeAll` and reset the failure counts per test (an estimate of about 3-5 s).
- **`two-factor`:** share one enrolled account and merge the rotation pair.
- **Do not add a test hasher.** `src/lib/auth.ts:451-473` sets no `password.hash`, and the real hash is what is under test.
- **Keeper:** every lockout and enrolment path is still exercised.

#### T-25. Seed Tests Re-Truncate and Re-Seed per Test

- **`seed/compendium.test.ts`:**
  - Replace or delete `:465`. It reads the real compendium three times, and the fixture already covers it at `:350-382`.
  - Share one fixture seed for the read-only `:181-280` and the update-path reads `:561`, `:590`, `:600`, `:624`, `:665`, and `:676`.
  - Fold the three `afterAll(seedSharedVocabularies)` into one.
  - **Estimated** saving: about 4-6 s.
- **`seed/index.test.ts`:**
  - One `describe.each(SEED_ENTRIES)` with one `beforeAll`. The steps run in order: dry run, then seed and fill, then idempotent, then no-resurrect. This cuts 32 truncates to 8.
  - Cut `:221` (kept by `compendium-files.test.ts:26`).
  - **Estimated** saving: about 4-6 s.
- **`modules/ingredients/services/stock.test.ts`:**
  - Create the three ingredients in `beforeAll`.
  - Reset only `inventory_items` and `workspace_compendium_entries` per test.
  - Move the about 12 fixture-mutating tests into their own describe: `:196`, `:198`, `:351`, `:406`, `:444`, `:450`, `:465`, `:480`, `:606-625`, `:781`, `:837`, and `:842`.
  - **Estimated** saving: about 1.5-2.5 s, low confidence.

#### T-26. Cross-Layer and In-File Repeats

- **`tests/db/repository/invitations.test.ts`:**
  - Cut `:378` (kept by `:316`).
  - Cut `:363` (kept by `invitation-revocation.test.ts:162`).
  - Cut `:339` (kept by `invitation-revocation:131, 147`).
  - Trim `:387` to its unique half.
  - In `:987-1041`, keep one SQL-mechanism row (kept by `invitation-acceptance-by-token:591, 640, 654`).
  - Cut `:959`, `:1041`, and `:1076` (kept by `invitation-cards.test.ts:81, 230, 283`).
- **`invitation-acceptance-by-token`:** cut `:336` (kept by `:304`). Merge `:654` into `:666`, moving its `roleOf` check.
- **`identity/graphql/admin-invitations:143`:** cut to one row.
- **`tests/db/repository/sourcing-score.test.ts:372`:** this is a service authorization loop in the repository folder. Keep the "repository answers unguarded" half (the loop is kept by `compendium-sourcing.test.ts:56, 74`).
- **`HelpWidget/unit-converter:60-71`:** drop the `unitConvert` refusal repeat (kept by `convert.test.ts:166, 177`).
- **`grimoire/services/workings:215`:** drop the conversion arithmetic (kept by `plan-deductions:41, 73`).
- **`password-lockout:173`:** cut (kept by `stories/16-password:135`).
- **`user-list.test.ts`:** merge `:140`, `:150`, and `:160` into `:111`.
- **`help-reads.test.ts:519-545`:** add positive staff reads (glossary, index, sitemap) beside the absence checks (R-12). This adds tests and cuts none.
- **Presentation:** cut the style and class checks in `LinkHint/held-page:20-45`, `LinkHint/index`, and `IconTip/index:35-70`; cut `toHaveClass('chip')` in `comparison-panel:165-178`. Keep all four `tests/scss` files.
- **`add-ingredient-button:249`:** cut 2 of 4 rows. `Modal:704` stays.

#### T-27. Checked and Not Duplicates

Recorded so nobody re-audits them.

- **Soft-delete pairs** (`stock:344` and `:399`, `retired-entry-writes`, `references`): each calls a different reader.
- **Membership-proof tests in `tests/db/repository/`:** one per finder family.
- **The narrowing refusal** (`workings.test.ts:441`, `working.test.ts:329`): one refusal per other entry point, which is never deleted. The earlier `spell-visibility.test.ts` matrix was removed with `setSpellVisibility`.
- **The GraphQL refusal codes:** the transport layer owns them.
- **`plan-deductions:103`**, **`password-lockout:234`**, and **`Modal:704`.**
- **The `tests/scss` files.**

### Shared Pieces a Fix Reuses

| Area       | Helpers                                                                                                                                                                                               |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Playwright | `tests/e2e/axe.ts` (`assertNoSidewaysScroll`, `scanBothThemes`), `holdServerAnswers`, `seedCoven` (`tests/e2e/stories/coven-ingredients.ts`), `recreateE2eDatabase`, `base-config.ts`, `axe-scans.ts` |
| Vitest     | `typingClock`, `renderWithQuery`, `interact.tsx`, `ingredient-form.tsx`, `variants-harness`, the `list-field.test.tsx` `FormProvider` model, `importAuth`, `truncateAllTables`                        |

New pieces:

| Piece                        | Why                                                            |
| ---------------------------- | -------------------------------------------------------------- |
| A shared e2e breakpoint file | Specs have no export of the app's widths                       |
| `hydrated`                   | Moved from its two copies into one                             |
| A named-wait helper          | So the guard can allow only the sleeps that stay               |
| A `SpellSteps` harness       | For the steps tests that need one field, not the whole builder |

## Past Attempts

`ci.md` is [`design-decisions/ci.md`](../design-decisions/ci.md); `runner-budget.md` is [`ci/runner-budget.md`](../ci/runner-budget.md). This table records what was tried before and how each earlier decision relates to this audit's proposals.

| Proposal                 | Before                                                                                                                                                                | Outcome and why                                                                                           | Where                                             | Effect on this audit                                                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Shard Playwright         | Rejected twice (M11.18, MB.235)                                                                                                                                       | "Sharding pays more in pulls than it saves". Rejected when the gate had 56 tests; it now has 563 (714 s). | `ci.md:300`, `:1024-1028`                         | Put to the owner as a changed situation, not a new idea. MC.10 cites both decisions and corrects them.                                  |
| Shard `vitest-dom`       | Deferred, not rejected; the order was to cut the seed tests, re-measure, then decide                                                                                  | The merge job already accepts any number of blobs.                                                        | `runner-budget.md`, "Splitting the Vitest job"    | MC.10 follows the deferred plan.                                                                                                        |
| Shard `vitest-db`        | Rejected: each shard builds its own template                                                                                                                          | Agrees with this audit.                                                                                   | `runner-budget.md`                                | No change.                                                                                                                              |
| Axe sweep                | Built per persona in M11.8 (`fe2c624b1`); no split tried                                                                                                              |                                                                                                           | `axe.spec.ts:231`                                 | The split is new.                                                                                                                       |
| Axe trims                | "Trimming the double-theme and double-width axe scans" rejected: about 2 s saved, "not worth the coverage". M14.27 still cut repeats of the same page state (rule 9). |                                                                                                           | `ci.md:292-294`, `:411-412`                       | T-18 and T-19 cut only same-state, same-persona repeats, which rule 9 already allows. They never cut a theme or a width of the sweep.   |
| End-to-end trims         | "Trimming e2e past duplicates" ruled out                                                                                                                              |                                                                                                           | `ci.md:995`, `:1008`                              | Every Playwright cut in MC.12 is a duplicate (identical body, same state) or a rule 4 presentation pin. Nothing is cut for speed alone. |
| `E2E_COVERAGE`           | Opt-in since M11.18 (`27d866b97`); both suites merged since M14.28                                                                                                    | Never reconsidered.                                                                                       | `e2e.md:507`, `:547-553`                          | Kept (see [Keep](#keep)).                                                                                                               |
| Retries                  | Never lowered. `acceptance.md:43` says CI uses one retry, which is wrong for the gate (2).                                                                            |                                                                                                           |                                                   | MC.11 corrects the doc.                                                                                                                 |
| `networkidle` and sleeps | No ban ever. MB.296 (`149137ad6`) fixed two flakes by waiting on state.                                                                                               |                                                                                                           |                                                   | R-7 is new.                                                                                                                             |
| Shared seed and serial   | Done in M11.18 (`b7b87c677`): serial dropped where not chained, setup in `beforeAll`, enforced by lint `sorrel/e2e-chained-tests-serial`. Vitest: MB.183 and MB.184.  |                                                                                                           | `e2e.md:200-222`                                  | T-11, T-12, and T-25 are the remaining cases, not a new mechanism. R-8 points at the existing lint rule.                                |
| Whole-form exemption     | `IngredientForm/index.test.tsx` "holds only whole-form tests"; `:87-93` requires a `FormProvider` harness for one field                                               |                                                                                                           | `layer-ownership.md:87-93`, `:147-152`            | T-22 moves the 6 single-field tests that broke the exemption, and the exemption stays.                                                  |
| Variants file guard      | A 20 s guard was added (`15f46de79`) and reverted (`4c3ee3a8f`): full runs make that file 10 to 50 times slower than alone.                                           |                                                                                                           |                                                   | MC.13 measures in CI, never alone.                                                                                                      |
| `isolate` and pool       | `db` runs `isolate: false` (MB.238). Threads for all but `dom`. Unisolated `dom` failed.                                                                              |                                                                                                           | `db-harness.md:162-170`, `runner-budget.md`       | Nothing proposed; recorded.                                                                                                             |
| Password hasher          | scrypt N=2^14 accepted by the owner on 2026-10-16                                                                                                                     |                                                                                                           | `auth.md:1289-1293`                               | Agrees: no test hasher.                                                                                                                 |
| Workers                  | 4 for the Playwright gate (MB.236), 3 for Vitest. Blacksmith 8-vCPU was dropped on cost.                                                                              |                                                                                                           | `runner-budget.md:7-15`                           | Sharding adds runners, not workers.                                                                                                     |
| Other tried and left out | Video off (7-17%), `FILE_COPY` clone, `fsync=off`, a fourth Vitest worker, `--only-changed`, source maps off, and merging the `checks` legs                           |                                                                                                           | `runner-budget.md`, `ci.md:290-295`, `e2e.md:504` | Not re-proposed.                                                                                                                        |

## Proposed Tasks

**Approved by the owner; minted from `tasks/v1/mc.md`.** They belong in the Z. Cleanup milestone as MC.10 to MC.14: five tasks, 27 h, against a limit of 10 tasks. The estimates are calibrated on these existing tasks, and an existing MC task runs 6 to 16 h.

| Task                           | Estimate |
| ------------------------------ | -------- |
| MB.224                         | 3.5 h    |
| MB.225 (db tests)              | 2.5 h    |
| MB.226                         | 3 h      |
| MB.227                         | 3.5 h    |
| MB.228 (component tests)       | 4 h      |
| MB.229                         | 2.5 h    |
| MB.230 (Playwright duplicates) | 3 h      |
| MB.236 (four workers)          | 1 h      |
| M1.14 (CI workflows)           | 2 h      |
| M11.25 (happy-dom)             | 4.5 h    |

| Id    | Title                                                      | Est.                                                                   | Findings                                | Effect on the 7-minute goal                                                                           |
| ----- | ---------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| MC.10 | Shard the CI Test Jobs                                     | 5 h                                                                    | T-1 to T-5, T-7                         | Gate about 5-6 min per shard (3 shards), stories about 5 min (2), dom about 4 min (2). All estimates. |
| MC.11 | Wait on State in Playwright, Not on Time                   | 4 h                                                                    | T-6, T-8 to T-12                        | Shrinks the slowest gate tests; fixes the two flakes seen.                                            |
| MC.12 | Trim the Playwright Suites to What a Browser Adds          | 6.5 h (R-6 adds 1 h for the dark colour-only pass and the phone scans) | T-13 to T-20                            | About 30-40 gate tests, about 54 scans, and about 6 specs fewer (estimate).                           |
| MC.13 | Speed Up the Slow Vitest Dom Files                         | 6.5 h                                                                  | T-21 to T-23                            | About 80-90 s summed (estimate); `IngredientForm/index` stays over budget by decision.                |
| MC.14 | Pay Database Setup Once and Prove Each Rule Once in Vitest | 5 h                                                                    | T-24 to T-26 (T-27 recorded as cleared) | About 12-18 s summed (estimate); less duplication.                                                    |

The nine-task draft was 28.5 h; consolidating to five saves one setup and one review per merged pair, so the total was 26 h; the owner's two additions above make it 27 h.

Each entry follows `tasks/v1/mc.md`'s format: `**MC.N — Title** · Xh`, a `_Story:_`, "Minted from T-...", and `_Acceptance criteria:_` ending "The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass". A code sweep lands its guard in the same commit, seen failing once, with an empty allowlist (CLAUDE.md, the sweep-task rule).

### What Each Task Contains

- **MC.10** shards Playwright and the `vitest-dom` project in one PR, because they share the comment and the summarise scripts. Criteria:
  - `--shard` with a matrix;
  - the blob reporter plus `merge-reports`;
  - the axe sweep generated per route group and modal group;
  - the shards joined at the end of the run, as today (R-2): `vitest / vitest` already needs every part; the Playwright shards join in the one job that runs `merge-reports` (which a single HTML report needs anyway), and that job fails when any shard failed;
  - shard-unique artifact names;
  - `playwright-coverage` reading every shard;
  - the Playwright comment showing its duration, a slowest-files list, and stories coverage on its own line;
  - `runner-budget.md` refreshed;
  - for Vitest: `vitest.yml:207` and `:221`, `vitest-part`, and `summarize-vitest`; `vitest / vitest` stays the required check;
  - every CI test step under 7 minutes in the PR's own run;
  - `ci.md`'s two rejections of Playwright sharding (:300, :1024-1028) corrected in place: they were made at 56 tests, the gate now has 563, and each shard's repeated cost is weighed in the entry: about 94 s outside the test step (14m49s job minus 795 s step) plus about 81 s of server start inside it, so about 3 min per extra shard, against about 4 min of test time each shard removes;
  - the `vitest-dom` shard follows `runner-budget.md`'s deferred order: re-measure first, and shard only if the test step is still over the budget;
  - R-2 written into `runner-budget.md` by this task.
- **MC.11:**
  - one `hydrated` helper;
  - a guard banning `networkidle` and bare `waitForTimeout`, where the kept waits go through the named helper (R-7, written by this task);
  - the slow causes in `stack-row-skeleton`, `admin-help`, `admin-documents`, `admin-cards`, the 57 s `stories/07-admin` test, and the 46 s `stories/03-ingredient-autosave` test found and fixed, so no test but the axe sweep's (split in MC.10) is over R-3's 30 s;
  - R-3's budget shown in the Playwright comment, and written by this task;
  - the gate's retries set to 1;
  - one bug task per flake found (`spell-quantity-input`, `admin-help`);
  - R-13: the gate comment names each flaky test (`includeFlaky: true` plus `FLAKY_NOTE`) and writes a `::warning` annotation per flaky test; no `failOnFlakyTests`;
  - read-only story tests sharing a seed where `e2e.md` allows;
  - `back-during-navigation` no longer serial;
  - `claude-docs/testing/acceptance.md:43` corrected (it says CI retries once; the gate retries twice until this task sets 1).
- **MC.12:**
  - a shared e2e breakpoint file, with a guard that every `setViewportSize` width comes from it or from the 375 phone constant (check the D-12 overlap with MC.9 after it merges); R-4 written by this task;
  - the width, pin, and merge cuts of T-13 to T-16;
  - R-6 applied: `scanBothThemes` and the sweep's `collectBothThemes` run the full rule set in light and only the colour rules in dark (`AxeBuilder.withRules`); full 375 scans added for the shell's tab bar and each phone sheet; the axe repeats of T-18 and T-19 cut; the sweep's summed seconds recorded before and after; `ci.md`'s "Trimming the double-theme and double-width axe scans" and "Cutting accessibility scans for speed" entries corrected in place; R-6 written into `layer-ownership.md` rule 9 by this task;
  - the gate cuts of T-20.
- **MC.13:** the `pdf.test.ts` reshape (T-21), the field harnesses including the new `SpellSteps` harness (T-22), and fake timers in place of real sleeps (T-23). It confirms `watch-loads.test.ts` tests a test helper before cutting it.
- **MC.14:** check against MC.8 and MC.9's diffs first. It covers T-24 to T-26, including help-reads' positive staff reads.

## Proposed Rules

Each rule names its source. "Repo" means the rule rests on this audit's own measurement, with no outside source. "Unsourced" means the research found nothing for or against. The sources are listed in [Sources](#sources).

### Owner Decisions

Where this table and the rule text below differ, the table wins.

| Rule | Decision                  | Note                                                                                                                                                                                                             |
| ---- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-15 | Approved                  | One sentence beside `testing.md`'s threshold line. Mutation testing named, not proposed.                                                                                                                         |
| R-14 | Approved as a rule 1 line | Helpers under `tests/support/` and `tests/e2e/` are proved by their users; `tests/guards/` excepted. MC.13 confirms `watch-loads.test.ts` tests a test helper before cutting it.                                 |
| R-13 | Approved, softened        | A flake never blocks: no `failOnFlakyTests`. CI retries 1. The gate comment names each flaky test and writes a `::warning`. Bug task per flake.                                                                  |
| R-12 | Approved as a widening    | `testing.md`'s precondition line widens to every absence check. MC.14 adds help-reads' positive staff reads.                                                                                                     |
| R-11 | Not a new rule            | Already `layer-ownership.md` rule 6. Rule 6 is widened to "a form field or one builder step"; MC.13 moves the leftover tests. R-9 likewise extends the file-budget section's existing "seed once per file" line. |
| R-10 | Folded into R-9           | R-9 reads: "Setup a file's tests only read runs once; a test that writes gets its own."                                                                                                                          |
| R-9  | Approved                  | The real password hash stays.                                                                                                                                                                                    |
| R-8  | Recorded                  | Already enforced by `sorrel/e2e-chained-tests-serial`. Its home stays `e2e.md`; the rules list points there instead of restating it.                                                                             |
| R-7  | Approved                  | Both runners. The real waits Vitest keeps (db race guards, 20 ms polls, `pg_sleep`) go through the named helper too.                                                                                             |
| R-6  | Approved, reworked        | Full rules once in light; colour rules only in dark; phone layouts scanned once as their own state; same-state repeats cut.                                                                                      |
| R-5  | Approved                  | Axe sweep themes are outside it.                                                                                                                                                                                 |
| R-4  | Approved                  | The 375 phone width is allowed as the one constant outside the breakpoint list.                                                                                                                                  |
| R-3  | Approved, reworded        | 30 s per test, not per file (`fullyParallel`). MC.11 gains the `07-admin` and autosave story tests.                                                                                                              |
| R-2  | Changed                   | No new aggregator jobs. Shards join in the existing end-of-run merge jobs, as Vitest's parts do now.                                                                                                             |
| R-1  | Approved, changed         | A shard is added once a test step passes 7 minutes. No headroom. The two-consecutive-runs condition and "never raise the timeout" stand.                                                                         |

**Which rules are in live docs.** A live doc must not describe a mechanism the code lacks. M17.10 writes R-1, R-5, R-8 (a pointer), R-9, R-11, R-12, R-14, and R-15 into the live docs. R-2, R-3, R-4, R-6, R-7, and R-13 are written by the task that builds their mechanism (MC.10, MC.11, MC.12); until then this audit is their only home.

### The Rules

- **R-1. Time budget per job.** A CI test step's budget is 7 minutes. A job past 7 minutes in two consecutive runs gets another shard, never a longer timeout. Shards use `--shard` with the blob reporter and `merge-reports`, with `fullyParallel` for per-test balance in Playwright. Vitest splits by file, so the 10 s file budget is what keeps its shards even.
  - Why: a long build slows every developer's feedback; a shard is the lever that does not weaken a test.
  - Sources: [Fowler-CI] ("a ten minute build is perfectly within reason"), [PW-shard], [VT-perf]. The 7 minutes is the owner's number.
- **R-2. Shards join at the end of the run.** No separate aggregator job per sharded job. The end-of-run job that already merges results (the Vitest merge job; the Playwright `merge-reports` job) needs every shard, runs when one fails, and fails when any shard failed. If checks are made required later, that end job is the one to require.
  - Why: a job skipped by a path filter leaves its check "Pending", which blocks the merge.
  - Source: [GH-req].
- **R-3. A 30 s per-test Playwright budget, shown in the comment as Vitest's 10 s file budget is.** The Playwright section lists the slowest tests and files, and a test over 30 s is named as a warning. A named test gets its wait fixed or is split along what it proves; the budget is never raised. It is per test, not per file, because both configs run `fullyParallel` (`tests/e2e/base-config.ts:15`), so the longest single test caps a shard.
  - Sources: [PW-shard] ("keep your test files small and evenly sized"); repo (30 s is this audit's number from CI timings).
- **R-4. A viewport width is set only to cross a breakpoint the code has.** The width comes from the shared breakpoint file, and the test title names the breakpoint. No range sweeps. A regression width carries a comment naming the bug. The 375 phone width is the one constant allowed outside the list.
  - Why: a width between two breakpoints runs the same code as its neighbour.
  - Source: unsourced as a standard. [PW-emulation] shows one desktop and one mobile project; practitioner advice (secondary) is to test at the breakpoint boundary.
- **R-5. A loop over widths, themes, or personas needs a branch in the source for each value.** A loop whose rows run identical code is cut to one row. This extends rule 5's env-matrix line. The axe sweep's themes are outside it.
  - Sources: [Fowler-pyr] (each test is "additional baggage"); repo.
- **R-6. Each axe check runs once per distinct markup and colour state.** It reassesses `ci.md:292` and `:302`.
  1. The sweep scans every route and modal once with the full rule set, in light, at desktop width.
  2. In dark it runs only the colour rules (`color-contrast`, `link-in-text-block`), because a theme switch changes only colour tokens (`data-theme` plus Sass; no markup changes). The dark scan stays because it checks colours in context; `tests/scss/tokens.test.ts` checks only the token pairs.
  3. A phone layout whose markup differs is its own state: the shell's tab bar and each sheet are scanned once, in full, at 375. The sweep scans no phone width today.
  4. Any other spec or story scans only a state the sweep cannot reach (an open menu, an error, a status), and its comment names that state. Same-state repeats are cut (T-18, T-19).
  5. No manual or keyboard check is cut: axe finds about 57% of issues by volume.
  - The saving is not estimated: the time inside `color-contrast` is unmeasured. MC.12 measures the sweep before and after.
  - Sources: [PW-a11y] (the scan is "in its current state"), [Deque].
- **R-7. No fixed sleeps in either runner, and no `networkidle`.** In Playwright, use web-first assertions (assertions that retry until the state arrives). In Vitest, use fake timers (`advanceTimersByTimeAsync`). A wait that is itself the requirement goes through the one named helper, and a guard allows nothing else. The real waits Vitest keeps (database race guards, 20 ms polls, `pg_sleep`) go through the helper too.
  - Sources: [PW-api] (`waitForTimeout` "should only be used for debugging"; `networkidle` is "DISCOURAGED"), [PW-bp], [VT-timers], [Fowler-nd] ("Never use bare sleeps"). Async waits are the largest flaky cause in [Luo] (about 45%, second-hand) and [JS-flaky] (about 20%).
- **R-8. Serial mode only for tests that chain state,** with a one-line comment naming the state passed on.
  - Source: [PW-par] ("Using serial is not recommended"). The five serial files checked all chain state.
  - Already enforced by the lint rule `sorrel/e2e-chained-tests-serial`. Recorded as a rule, not a new mechanism; no comment requirement is added. Its home is `testing/e2e.md`.
- **R-9. Expensive setup runs once per file.** This covers a PDF render, a password hash, a whole-form render, and a real seed. Boundary values are tested on the pure function, not on the expensive output. R-10 is folded in: setup a file's tests only read runs once; a test that writes gets its own.
  - Sources: [Fowler-pyr] ("push your tests as far down... as you can"); repo. For the read-only half, [PW-par] (worker-scoped fixtures reuse one setup per worker); isolation per writing test stays ([PW-bp], "completely isolated"). Already practice in Playwright and Vitest; T-11 and T-25 are the cases left.
- **R-11. A test of one field renders that field in a harness.** The whole form renders only for the save payload, error routing, and field coupling. Not a new rule: it widens `layer-ownership.md` rule 6 to "a form field or one builder step".
  - Sources: [Fowler-pyr]; repo. It sits against Dodds' "mostly integration" (kentcdodds.com/blog/write-tests); the whole-form exemption keeps the integration cases.
- **R-12. Every absence check has a positive check beside it.** A widening of the precondition rule.
  - Sources: [Dodds-impl] (a false positive "may not fail when you break application code"); the repo's precondition rule.
- **R-13. Flaky tests.** A flake never blocks a PR: no `failOnFlakyTests`. CI retries 1 (gate and stories). A single flake stays green; a test failing twice in a row is red. Local runs keep 0 retries (`playwright.config.ts:60`), so a flake already fails locally. The gate comment names each flaky test with `FLAKY_NOTE` (`.github/scripts/lib/failure-list.mjs:7`), as `summarize-stories.mjs:16` does with `includeFlaky: true`, and writes a `::warning` annotation per flaky test. A flaky test named there gets a bug task through `/create-bug-task` when seen. It is never skipped to make it go away.
  - Sources: [SWE-G] ("Rerunning a test is only delaying the need to address the root cause"), [Fowler-nd]. [PW-cfg] documents `failOnFlakyTests`; not used.
- **R-14. A test of a test helper is not written. Its users prove it.** A line under rule 1 for helpers under `tests/support/` and `tests/e2e/`. The files in `tests/guards/` are not helpers.
  - Source: unsourced (repo rule).
- **R-15. Coverage is a floor, not proof.** The 80% threshold finds untested code. The proof that a test guards something is seeing it fail with the guard removed. A coverage drop is never fixed by adding asserts to reach the line. Mutation testing (stryker-mutator.io) is the tool for that proof; it is named, not proposed, because it is out of scope for v1.
  - Sources: [Inoz] (coverage correlates only low to moderately with effectiveness once size is held constant), [Fowler-cov] ("If you make a certain level of coverage a target, people will try to attain it").

### Keep

Named so they are not re-litigated.

- the axe sweep and its guard;
- `signInAs` cookie sign-in;
- the per-file database clone;
- the 10 s Vitest file budget;
- the owning-layer table;
- one contrast check per theme;
- the 375 px no-sideways-scroll check;
- serial mode only for chained state;
- the real password hash;
- the race guards;
- the deliberate `no-preference` overrides;
- `E2E_COVERAGE` on both Playwright suites.

### Stop

- width sweeps;
- theme loops over theme-blind code;
- screenshots nothing compares;
- computed-colour and pixel pins;
- copy assertions;
- re-scanning sweep states;
- per-test truncate of fixtures the test only reads;
- a gate spec repeating a story's flow.

## Where Published Practice Is Weaker Than, or Against, the Repo's Rules

No change is proposed for any of these.

- **Redundancy research is mixed.** [Yoo] reports little fault-detection loss in some studies and severe loss in others. This is why every cut names its keeper and the service refusals are never deleted.
- **Banning copy assertions (rule 2) is stricter than Testing Library,** whose query priority includes text. The exception "when the words are the state" matches the sources.
- **Mocking heavy children in page tests (rule 6) runs against "mock less" (Dodds).** It rests on the repo's own CPU measurement.
- **The per-file database clone and per-slot server are stricter than Vitest's `isolate: false` speed advice.** No source disputes the isolation.
- **"A regression test only for a shipped bug" (rule 3) and "no tests of CI or scripts" (rule 1) are unsourced either way.**

## Sources

The rule codes above cite these. Each URL was verified by the research pass, except as noted.

| Code           | Source                                                                                                 | URL                                                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [PW-api]       | Playwright `Page` API                                                                                  | https://playwright.dev/docs/api/class-page                                                                                                                    |
| [PW-bp]        | Playwright best practices                                                                              | https://playwright.dev/docs/best-practices                                                                                                                    |
| [PW-par]       | Playwright parallelism                                                                                 | https://playwright.dev/docs/test-parallel                                                                                                                     |
| [PW-shard]     | Playwright sharding                                                                                    | https://playwright.dev/docs/test-sharding                                                                                                                     |
| [PW-cfg]       | Playwright `TestConfig`                                                                                | https://playwright.dev/docs/api/class-testconfig                                                                                                              |
| [PW-a11y]      | Playwright accessibility testing                                                                       | https://playwright.dev/docs/accessibility-testing                                                                                                             |
| [PW-emulation] | Playwright emulation                                                                                   | https://playwright.dev/docs/emulation                                                                                                                         |
| [VT-perf]      | Vitest, improving performance                                                                          | https://vitest.dev/guide/improving-performance                                                                                                                |
| [VT-timers]    | Vitest, fake timers                                                                                    | https://vitest.dev/guide/mocking/timers                                                                                                                       |
| [VT-slow]      | Vitest `slowTestThreshold`                                                                             | https://vitest.dev/config/slowtestthreshold                                                                                                                   |
| [Fowler-pyr]   | The Practical Test Pyramid                                                                             | https://martinfowler.com/articles/practical-test-pyramid.html                                                                                                 |
| [Fowler-nd]    | Eradicating Non-Determinism in Tests                                                                   | https://martinfowler.com/articles/nonDeterminism.html                                                                                                         |
| [Fowler-CI]    | Continuous Integration                                                                                 | https://martinfowler.com/articles/continuousIntegration.html                                                                                                  |
| [Fowler-cov]   | TestCoverage                                                                                           | https://martinfowler.com/bliki/TestCoverage.html                                                                                                              |
| [SWE-G]        | Software Engineering at Google, chapter 11                                                             | https://abseil.io/resources/swe-book/html/ch11.html                                                                                                           |
| [TL]           | Testing Library guiding principles and query priority                                                  | https://testing-library.com/docs/guiding-principles and https://testing-library.com/docs/queries/about                                                        |
| [Dodds-impl]   | Testing Implementation Details                                                                         | https://kentcdodds.com/blog/testing-implementation-details                                                                                                    |
| [Deque]        | Automated testing study identifies 57% of digital accessibility issues                                 | https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues                                                      |
| [Inoz]         | Inozemtseva and Holmes, "Coverage Is Not Strongly Correlated with Test Suite Effectiveness", ICSE 2014 | https://www.cs.ubc.ca/~rtholmes/papers/icse_2014_inozemtseva.pdf                                                                                              |
| [Yoo]          | Yoo and Harman, "Regression testing minimization, selection and prioritization: a survey", STVR 2012   | https://coinse.github.io/publications/pdfs/Yoo2010uq.pdf                                                                                                      |
| [GH-req]       | GitHub, troubleshooting required status checks                                                         | https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/troubleshooting-required-status-checks |
| [JS-flaky]     | An empirical study of flaky tests in JavaScript                                                        | https://arxiv.org/abs/2207.01047                                                                                                                              |
| [Luo]          | Luo et al., "An empirical analysis of flaky tests", FSE 2014                                           | Read second-hand: the figures were taken from other sources and the paper itself was not read.                                                                |
