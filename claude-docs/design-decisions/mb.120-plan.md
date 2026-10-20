# MB.120 — Design review: the public compendium and shared ingredient components (#577)

## Context

MB.120 is the section review of the site's one public surface: the public frame's landmarks (MB.83), `IngredientSearch` with its chips, OR toggle and filters (M8.10–M8.13), `IngredientCard` (M8.14), `SafetyNote` and the toxic mark (M8.13a), the compendium page and its pager (M8.18, MB.105), the entry page (M8.19), the Add Ingredient dialog (M8.16) and the New and Updated markers (MB.106). It is reviewed signed out and signed in, in both themes, at desktop and at 375px, as the task entry in `claude-docs/tasks/mb.md` sets out. MB.121 keeps M9.12's dialog, M8.17's edit flow, the local-or-compendium chip and the stock badges, reviewed on the coven page.

**Owner's direction (2026-10-20, planning):**

- The review follows good UX principles and accessibility, and checks design consistency and cohesion across the section and with what MB.115 (Field, Modal, tabs, filter rows) and MB.119 (headings, notices, the coven noun) settled.
- **The base is M9.12's branch** `feature/m9.12-add-from-compendium` (PR #1157 into staging, In Review, head `cc98c0ff`): it rewrites most of the section (IngredientEntry, IngredientCard, CompendiumCards, SafetyNote, EntryMarks, Modal, IconTip, MenuButton, the compendium and entry routes). The first build step merges it into the task branch; the PR targets that branch until #1157 merges, then staging.

Branch `feature/mb.120-design-review-compendium` off `origin/staging` (`4dc7593d`) in worktree `/home/node/worktrees/mb120` with copied `node_modules` and `/app/.env.local`; board In Progress with the start comment. `/app` holds M9.12's checkout and the owner's review copy: never edited from this task.

## What the survey found (2026-10-20, on M9.12's head)

**Scope corrections to the task entry:**

- `IngredientForm` has no read-only mode in the code; the "reviewed read-only" wording (from MB.115's handoff) is stale and the entry is corrected. The form is reviewed inside the Add Ingredient dialog and the admin modals only.
- The Add Ingredient dialog is `AppShell/add-ingredient-button.tsx` + `add-ingredient-menu.tsx`, rendered by the shell bar, so it exists on `/compendium` only signed in. A curator's Compendium destination goes to `/admin/compendium?new`.
- M9.12 and M12.5 put new controls on the section that the entry does not name and that MB.121 does not claim: the plus (`AddIcon`, with spinner, check and coven picker), Quick Look (`?entry=` route modal, `IngredientEntry/details*.tsx`, `summary*`), the card's three dots (`CompendiumCards/card-more.tsx`), the entry page's pencil and shelf. They are on the public pages, so they are in scope here.
- No `loading`, `error` or `not-found` file exists for either compendium route; `src/app/{error,not-found}.tsx` are the fallbacks.
- Seven docs have no Styling section: facet-panel, category-chips, ingredient-card, ingredient-card-list, compendium-cards, card-density-switch, entry-marks (menu-button also lacks one). `AddIcon` has no scss, story or doc.
- `CompendiumCards` has no scss and imports `CompendiumList/index.scss`; `CardDensitySwitch`'s rules live in `IngredientCard/index.scss:257` and `IngredientCardList/index.scss:30`.
- "Until the section's design review" markers in scope: `PublicFrame/index.scss:6`, `IngredientSearch/index.scss:4`, `IngredientCard/index.scss:9`, `IngredientEntry/index.scss:5`, `_variables.scss:207,237`, `IngredientForm/fields.tsx:40-41`, `field.md:29`.

**Tests in place:** e2e `public-compendium` (15, with axe and 375px), `compendium-entry` (3), `public-frame` (5), `compendium-add`, `compendium-entry-cupboard`, `ingredient-details-modal`, `tip-placement`; stories 14, 15, 16, 64 (`02-compendium`), 63 (`09-public`), 28–34 (`04-modals`).

## What the audit found (verified in the code, 2026-10-20)

Numbers are the audit's; each was checked in `/app` on `cc98c0ff`.

**UX**

1. The compendium page's header is a bare `<h1>`, with no eyebrow and no lede, where the coven pages (MB.119) carry both — `src/app/(public)/compendium/page.tsx:231`.
2. The entry page's back link is `/compendium` with no query (`[slug]/page.tsx:98`). **Not a defect on a second look:** from the list a card opens Quick Look, which keeps the search, and the page is reached from Quick Look's "See in Compendium" or from outside; the browser's history holds the filtered list for the first, and the link is the way in for the second. Nothing minted.
3. Four phrasings for "you hold this": "In Your Cupboard" (`IngredientEntry/held-mark.tsx:14`), "In All Covens" (`CompendiumCards/held-mark.tsx:8`), "in My Ingredients" (`AddIcon/index.tsx:24`), "See in My Ingredients" (`details-dialog.tsx:95`).
4. "Open Source" opens a new tab with no hint, where `duplicates.tsx` (~:497) has the pattern — `references.tsx:189-191`.
5. "On this page" is sentence case — `IngredientEntry/index.tsx:398`.
6. At phone width the sticky search row stacks three lines deep and takes a third of the screen — `_primitives.scss:504-508`, `IngredientSearch/index.scss:30-47`.

**Accessibility**

7. Every plus is named "Add to My Ingredients" with no entry name, so a list of cards reads as identical buttons — `AddIcon/index.tsx:181` and the menu form `:145`.
8. The held check is named "In All Covens" with no entry name — `CompendiumCards/held-mark.tsx:8,20`.
9. `MenuButton` sets `disabled` while busy, dropping focus to `body`; `AddIcon`'s lone plus (`:174-175`) and the menu items (`MenuButton/index.tsx:214-216`) already use `aria-disabled` — `MenuButton/index.tsx:253`.
10. The duplicates warning turns blocking by colour alone, its words unchanged — `duplicates.tsx:536`, `:547-551`, `:462`.
11. `<output>` holds block content and hand-written `notice notice--error` classes rather than a Notice — `duplicates.tsx:528-536`. **Mint** (53) for the block Notice; the interim is in Lane 5.
12. The public nav marks no current page (`aria-current` and style), where AppShell's `site-nav.tsx:28` and `index.scss:128-131` do — `PublicFrame/index.tsx:34`, `index.scss:69-87`.
13. The shell's current-page mark is box-shadow plus weight, lost under forced colours.
14. Only `_primitives.scss` uses the `forced-colors` mixin. **Mint** (52) for the pass; Lane 1 covers the current-page mark only.
15. `scroll-padding-top` assumes a one-line row, so at phone a focused control lands under the stuck row (WCAG 2.4.11) — `IngredientSearch/index.scss:69-77`.
16. The recency mark uses `badge-token('new','fill')` as text colour; its contrast is unproven — `EntryMarks/index.scss:45`, `_variables.scss:214`.
17. `FilterForm`'s `<form aria-label>` inside `<search>` is two landmarks for one region — `FilterForm/index.tsx:160-167`.
18. PublicFrame's main has no loading skeleton where AppShell's does (`AppShell/index.tsx:90-91` vs `PublicFrame/index.tsx:46`). **Mint** (51).

**Consistency**

19. The brand heading face is hand-written with a raw `1.375rem` in both frames — `PublicFrame/index.scss:39-56`, `AppShell/index.scss:66-79`; `heading-face` exists (`_mixins.scss:175-179`).
20. The inset focus ring (`outline-offset: -2px`) is hand-written in nine stylesheets; `focus-ring` (`_mixins.scss:159-162`) takes no inset parameter.
21. The public nav link lacks `theme-transition`.
22. `SafetyNote`'s bar is a raw 4px rather than `$rule-heavy`, with a `-webkit-text-stroke: 0.6px` — `SafetyNote/index.scss:12`, `:20-25`.
23. The card drawer holds raw values — `IngredientCard/index.scss:65-67,85-89,101-103,140,195`, `_compact.scss:68`.
24. Raw sizes in `IngredientCardList/index.scss:31`, `CompendiumList/index.scss:38,69-70`, `FacetPanel/index.scss:66,238-239,287,339,345,438`, `FacetCombobox/index.scss:12`, `CategoryChips/index.scss:103`, `Modal/index.scss:399,541`, `MenuButton/index.scss:26`.
25. Entry page raw values — `IngredientEntry/index.scss:11,108,136,200,230,240-241,294-295,624`, `summary.scss:61`, `EntryMarks/index.scss:38,64,69`, IconTip's 2px offsets `:53-95`; `0.72em` four times wants one small-inline-text token.
26. `.recency-mark__icon` is declared twice — `EntryMarks/index.scss:52-56` and `:67-70`.
27. `FacetPanel`'s `WIDE = '(min-width: 56rem)'` is hand-written with a dangling JSDoc — `FacetPanel/index.tsx:41,47`.
28. `RECENCY_AT = 'corner' as 'corner' | 'row'` is a sample toggle left in — `IngredientCard/index.tsx:26`.
29. `entry-marks.md:41` is stale: Quick Look draws EntryMarks (`details-dialog.tsx:74`).
30. `fields.tsx:36-41`'s comment is wrong: `CupboardEntryForm/index.tsx:18` imports ListField and MultiSelectField.
31. `CompendiumCards/index.tsx:21-22` says "In My Ingredients" where the mark reads "In All Covens"; no own scss (`:15`).
32. Docs lacking Styling (and facet-panel, ingredient-card, entry-marks also Stories and Testing): facet-panel, ingredient-card, entry-marks, category-chips, ingredient-card-list, compendium-cards, card-density-switch, menu-button.
33. `AddIcon` has no story, doc or scss.
34. Four "until the section's design review" comments and `_variables.scss:207,237` to retire.

**Phone (375)**

35. The card grid holds (`IngredientCardList/index.scss:12`). 37. The pager holds. 38. The facet dialog holds. 39. The measure is applied.
36. Citation URLs are plain text and `.ingredient-entry__reference` has no `overflow-wrap`, so a long URL scrolls sideways — `src/lib/citation.ts:96,150`, `IngredientEntry/index.scss:501-510`.
40. `compendium-entry.spec.ts` has no 375 check.
41. The sticky stack (6, 15) is the list page's one phone defect.

**Not defects** (42–49, left as they are): one safety badge, Toxic over Caution (owner, 2026-10-20); the facet panel holds changes until shut (M12.4); the tip takes no pointer; the held check's press opens the tip, no hover wash, up to six tab stops a card; the recency half-step and eye glyph; SafetyNote's heading at 4.28:1 as large text; Prev/Next; 1px edges plain; PendingLink and modal focus settled.

**To mint, not build here** (51–55; 50 withdrawn, see item 2): public loading skeleton; forced-colours pass over the section; block Notice; generic form fields (recommend against); CardDensitySwitch on the public page.

## Phase 1 — Build the foundations and the proposals, then stop for sign-off

Lane worktrees `/home/node/worktrees/mb120-<lane>` off the task branch, `node_modules` copied, `.env.local` copied, `tsconfig.tsbuildinfo` removed. Each lane commits each green step after `npm run pre-commit` and messages main with its hashes; main merges them into `mb120`. Lanes touch the board no further than the task's In Progress. A contested call ships as a `Proposal*` story in the workshop, defaults to the recommendation, and is settled at sign-off. **Sonnet for every lane except Lane 2 and Lane 4 on Opus**: each carries accessible-name and focus-management changes that a test must prove (CLAUDE.md's "Opus for a lane that writes tests").

**Step 0 (main):** merge `feature/m9.12-add-from-compendium` (`cc98c0ff`) into `feature/mb.120-design-review-compendium`; `npm run codegen` if the SDL moved; one `test:coverage` to set the baseline. `estimate MB.120 10` and the board comment naming the plan.

**Wave A — Lane 1, foundations and the frame** (Sonnet). Files: `src/scss/_variables.scss`, `_mixins.scss`, `PublicFrame/*`, `AppShell/index.scss`, `(public)/compendium/page.tsx`, `tests/e2e/public-frame.spec.ts`, `claude-docs/styling.md`, `components/public-frame.md`.
- `focus-ring` gains an inset parameter (20); a brand-size token and `heading-face` replace both frames' hand-written faces (19); a small-inline-text token (25); drawer and safety-bar tokens as proposed (22, 23) — tokens only, consumers in Wave B.
- Public nav: `aria-current="page"` and a current rule drawn with `$rule-heavy` so it survives forced colours, in both frames (12, 13); `theme-transition` (21).
- Compendium page head with eyebrow and lede (1), as `ProposalCompendiumHead`; `ProposalCurrentPage`.
- Wave B starts once Lane 1's tokens land, so no lane invents its own.

**Wave B — four lanes in parallel.**

- **Lane 2, the entry page** (Opus). `IngredientEntry/index.tsx|index.scss|summary.scss|references.tsx|details-dialog.tsx|held-mark.tsx`, `SafetyNote/index.scss`, `EntryMarks/index.scss`, `src/lib/citation.ts`, their docs, `tests/e2e/compendium-entry.spec.ts`. Items 3 (entry side), 4, 5, 16 (prove or re-token), 22, 25, 26, 29, 36, 40 (adds the 375 check). Stories `ProposalSafetyBar`, `ProposalSourceLabel`.
- **Lane 3, the list, cards and filters** (Sonnet). `IngredientCard/*`, `IngredientCardList/index.scss`, `CompendiumList/index.scss`, `IngredientSearch/index.scss`, `FacetPanel/*`, `FacetCombobox/index.scss`, `CategoryChips/index.scss`, `FilterForm/index.tsx`, their docs, `tests/e2e/public-compendium.spec.ts`. Items 6, 15, 17, 23, 24, 27, 28, 32 (its docs). Stories `ProposalStickyPhone`, `ProposalDrawerTokens`.
- **Lane 4, card controls and menus** (Opus). `AddIcon/*` (new story, doc, scss), `CompendiumCards/*`, `IngredientEntry/plus-mark.tsx`, `MenuButton/*`, `IconTip/index.scss`, `Modal/index.scss`, `tests/e2e/compendium-add.spec.ts`, `compendium-entry-cupboard.spec.ts`, `tip-placement.spec.ts`, `tests/components/MenuButton`, `AddIcon`. Items 3 (card side), 7, 8, 9, 24 (Modal, MenuButton), 31, 33, menu-button doc. Story `ProposalHeldWording`. Regression tests: plus and check carry the entry name; busy MenuButton keeps focus.
- **Lane 5, the form** (Sonnet). `IngredientForm/duplicates.tsx`, `fields.tsx`, its stories and doc, `tests/components/IngredientForm`. Items 10, 11 (interim: the sentence changes when blocking, and the region's classes come from one place), 30. Story `ProposalDuplicatesNotice`.

**Camera and sign-off (main).** Playwright shots on the lane build: both pages × signed out and in × light and dark × 1280 and 375 (16), plus 375 extras (sticky row focused, facet dialog, long citation) and a forced-colours pair, under `.reports/mb120/`. A board comment names the plan and the contested calls. **Stop for the owner's sign-off** in both themes and on the phone; no PR until asked.

## Phase 2 — Apply the sign-off

Settle each contested call as the owner says, delete the `Proposal*` stories, retire the six markers (34), write the Styling sections (32) as built, correct the task entry's "read-only" wording and the comments in 30 and 31, mint 51–55 as M12.n tasks placed after the wave's done work, and copy this plan to `claude-docs/design-decisions/mb.120-plan.md` with "Where the build departed" and "Decisions taken at sign-off". `sync MB.120`. The PR targets `feature/m9.12-add-from-compendium` until #1157 merges, then staging.

## Verification

Once, at the end of the lane run: `npm run test:coverage`; the seven e2e specs named above; `npm run test:stories`; `NEXT_DIST_DIR=.next-check npm run build` (then delete the dir and `git checkout -- tsconfig.json`); `npm run lint:css`; axe through the specs on both pages, both themes, both frames; `git diff cc98c0ff -- 'src/**/*.scss' | grep -E '^\+.*[0-9](px|rem|em)'` shows no raw value added outside `_variables.scss`. Logs to `.reports/mb120/<name>.log` with `exit $?` printed.

## Out of scope

M15.7 and MB.121's components; items 51–55; moving IngredientForm's fields; category-group colours; print.

## Contested calls for the owner

1. **Page head**: eyebrow and lede on `/compendium`, as the coven pages have (recommend yes).
2. **Back link**: withdrawn (item 2); stays as it is.
3. **One noun for "you hold this"**: recommend "In Your Covens" on the card, the entry page and the menu mark; "In Your Cupboard" stays only if the owner prefers it everywhere.
4. **Source label**: "Open Source" → "Open the Source", with the new-tab hint from `duplicates.tsx` (recommend).
5. **Safety bar**: `$rule-heavy` with no text stroke (recommend), or a safety-bar token keeping the 4px.
6. **Phone sticky row**: (a) only the search box sticks, filters scroll (recommend); (b) nothing sticks under the narrow column; (c) a one-line row with the filters behind the Filters button.
7. **Duplicates notice**: the interim wording change now and the block Notice minted (recommend), or the Notice in this PR.
8. **Form fields**: stay in `IngredientForm/fields.tsx` (recommend) or move to generic fields (mint 54 as "recommend against").
9. **Drawer**: the proposed drawer tokens, and `RECENCY_AT` fixed at `corner` (recommend).
10. **Plus and check names**: carry the entry name in the accessible name (recommend); whether the visible tip says it too (recommend not).
11. **Forced colours**: the current-page mark now, the full pass minted (recommend).

## Where the build departed

- **The sticky phone row is two lines**, not option (a): the search box on the first line, then Filters and Clear All on the second, with the Filters button filling its line. The whole stack sticks.
- **The safety bar keeps the Caution heading's text stroke.**
- **Item 2 was withdrawn**, and task 50 with it.
- **The held noun is Cupboard** (option D), not In Your Covens.
- **The tips carry the entry name**, as the accessible names do.

## Decisions taken at sign-off

The owner, 2026-10-20, one call per item:

1. **Page head**: approved.
2. **Withdrawn.**
3. **Held wording**: option D, Cupboard, in four phrasings: "In Every Cupboard" on the card's check, "In Your Cupboard" on the entry shelf, "<coven>, in its cupboard" in the menu, and "See in Your Cupboard" in Quick Look. The Quick Look list is headed "In Your Cupboards".
4. **Source link**: "Open the Source", with a hidden hint that it opens in a new tab.
5. **Safety bar**: `$rule-heavy`, with the Caution heading's text stroke kept.
6. **Sticky phone row**: two lines, the Filters button filling its line.
7. **Duplicates notice**: the interim wording now, and the block Notice minted.
8. **Form fields**: they stay in `IngredientForm/fields.tsx`; generic form fields are minted as "recommend against".
9. **Drawer**: the proposed drawer tokens, with `RECENCY_AT` fixed at `corner`.
10. **Plus and check names**: the entry name goes in both the accessible name and the visible tip.
11. **Forced colours**: the current-page border mark now; the full forced-colours pass over the section is minted into Wave 14.

Tasks 51–55 to be minted (ids pending): the public loading skeleton, the forced-colours pass over the section, the block Notice, generic form fields (recommend against), and CardDensitySwitch on the public page.
