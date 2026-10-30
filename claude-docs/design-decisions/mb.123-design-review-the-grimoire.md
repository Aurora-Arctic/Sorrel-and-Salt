# MB.123 — Design review: the grimoire

**Status:** decided and built; the owner has run no full test suite yet (Q0) and runs `/design-sync` at the end · **Date:** 2026-10-29 to 2026-10-30

The approved plan, as it ran, is stored beside this record as [`mb.123-plan.md`](mb.123-plan.md). This record wins where the two differ.

## 1. Context

MB.123 reviews the grimoire as built: the card list, the spell builder with its step editor, the Record a Working dialog, and the recipe page with its print layout ([`tasks/mb.md`](../tasks/mb.md), MB.123). The review ran in two stages. First, read-only Opus lanes audited the list, the builder, the recipe page and the whole site's shared pieces, researched published guidance on 14 topics, and photographed 188 screens in an isolated database. Then build lanes, one per area, made the changes in their own git worktrees, and the main session merged each lane's head into the review branch `feature/mb.123-design-review-the-grimoire`.

The owner chose per decision on a private sign-off page (Q0 and D1 to D42), not in a chat thread. Where the owner answered a decision twice, the later answer is the one recorded here. A separate agent updated the Storybook stories; the owner runs `/design-sync`.

Sources are numbered notes in section 6. A decision with no note has "no external source; owner's call".

## 2. Decisions

**Q0. Run the full test suites at the end?** Owner: option c, not yet. The owner then said to run individual tests only until told otherwise. Built: lanes ran only the Vitest files and Playwright specs they touched, once each. No full suite (`test:coverage`, `test:stories`, `e2e`) has run on this branch. No external source; owner's call.

**D1. Two solid green buttons on the grimoire page: keep both?** Owner: "Why is this an issue now? This happens elsewhere too", then "leave it". Not built. The admin compendium also has green add buttons, so this belongs to the whole-site review (MB.124). No external source; owner's call.

**D2. How much should a spell card show?** Owner: cut the intent clamp and the foot line down, but keep the Draft badge. Built: the intent is clamped to three lines, and the foot reads "Edited 5 minutes ago · Made 3 times", with "Made once" or "Made N times" in sentence case. The Draft badge is unchanged. Sources: [1], [3].

**D3. Cauldron and jar icons: one colour or two?** Owner: option b, keep both green. Not built. No external source; owner's call.

**D4. The verbs New, Add and Create: unify them?** Owner: option c, keep as they are. Not built. No external source; owner's call.

**D5. Card hover.** Owner: option a. Built: every burn value is a `$burn-*` token at the end of `_variables.scss`, and the four hover animations run three rounds and stop (`forwards`). Test: `tests/components/SpellCard/smoulder.test.ts`. Not built: `SpellPreview`'s own animations still run `infinite`. Source: [2].

**D6. Plural filter names.** Owner: option a. Built: "Moon Phases", "Days of the Week", "Coven Members". `FacetCombobox/typeahead.tsx` no longer passes a pluralised noun. Sources: [18], [19].

**D7. Load the Record a Working data when the dialog opens?** Owner: option a. Built: `SpellCard/record-working.tsx` runs one `RecordWorkingSetup` query on open, through a new GraphQL field `Query.workspace(id: ID!): Workspace!` backed by the `workspaceById` service (`src/modules/coven/services/workspace-by-id.ts`). Limit: the dialog reads only the first 100 members. No external source; owner's call.

**D8. Save footers.** Owner: option a, and Add Ingredient loses its Cancel button. Built: "Save Stock" and "Save Working"; no Cancel on the ingredient form, the spell builder or Annotate. Cancel stays on Record a Working and Edit Stock. The recovery Keep button and the conflict Reload Latest button are small outline buttons. Source: [14].

**D9. Confirm questions: bold name, no quotes?** Owner: option a. Built: `DeleteSpellWords` (exported from `SpellRecipe/delete-spell.tsx`) for the grimoire, and the same shape in the Edit Ingredient delete question. Not built: the admin group forms (`GroupForm`, `GroupedValueForm`) still quote names. Source: [5].

**D10. Hide the Category Match panel when it is empty?** Owner: option b, keep the sentence. Not built. No external source; owner's call.

**D11. Where does the visibility switch live?** Owner: option b, the builder footer beside Mark Complete, labelled "Shared". Built: `VISIBILITY_LABELS.workspace` is "Shared"; `VisibilitySwitch` gained `label` and `brief` props. Source: [11].

**D12. Mark Complete on a shared draft asks first?** Owner: option a. Built: the question appears before a shared draft is completed, because completing locks it from going private. Source: [5], [6].

**D13. Are the section names final?** Owner: option a. Not built. No external source; owner's call.

**D14. Name of the side column.** Owner: option b, "The Cupboard". Built. The first recipe-lane brief wrongly said "no change"; the lane built it after the correction. No external source; owner's call.

**D15. The inventory word.** Owner: option a. Built: "In the Cupboard". Not changed: the wording in `AddIcon/` and `IngredientEntry/` ("Add to My Ingredients", "Your Cupboard"). No external source; owner's call.

**D16. Record a Working buttons and the row bin.** Owner: option c, then revised: keep both buttons and remove the row bin. Built: Delete Working is in the Edit Working dialog only. Sources: [7], [8].

**D17. Quick Look eye on the side column only?** Owner: option a. Built. The spell Quick Look modal keeps its step eye, since it has no side column. Source: [4].

**D18. Bare verbs in menus.** Owner: option a. Built: Duplicate, Print and Delete; the dialog is titled "Delete Spell"; the completion dialog title is "Complete Working". Sources: [9], [10].

**D19. Spell Quick Look head.** Owner: as now, plus badges. Built: Draft and Private badges through `SpellMarks`. D37 then removed the head's bin, so the head holds Edit only. Sources: [12], [13].

**D20. Warning and note placement.** Owner: option a. Built. Sources: [15], [16].

**D21. Words of the completion step.** Owner: option a. Built: "needs 3 g · have none · short by 3 g", and buttons "Mark Complete" and "Keep as Draft". A shortfall is told in words, not by colour alone. Sources: [17], [20].

**D22. "Steps", not "Instructions".** Owner: option a. Built. No external source; owner's call.

**D23. Printed head.** Owner: option a. Built: badges in the head, no "Edited" line. Test: `tests/e2e/spell-print.spec.ts`. Source: [21].

**D24. Phone jump menu after the intent.** Owner: option a. Built with `display: contents` and `order`. Left open: the menu is visually after the intent but still first in DOM order, so keyboard order differs from visual order. Fixing it needs a restructure or rendering the menu twice. No external source; owner's call.

**D25. Decorative drawings.** The owner first asked to see what it would look like. Built as an experiment with 16 screenshots. The owner then said: change nothing, look later, no new task. It stays as built (commit fd7550f2d) and is left for the owner to review. No external source; owner's call.

**D26. Label "Taken From the Jars".** Owner: option a. Built. No external source; owner's call.

**D27. Page heads.** Owner: option a. Public pages keep an eyebrow and a lede; app lists stay plain; all are drawn by `PageHeader`. Built: 13 files converted and dead selectors removed. A guard fails any `<h1` in `src/**/*.tsx` (section 3). No external source; owner's call.

**D28. Run knip in CI?** Owner: option a, non-blocking, with a comment. Built: knip 6.44.0 (knip 5 needs TypeScript below 7 and the repo is on 7.0.2), `knip.json`, the script `lint:unused`, and a CI leg "Unused Code (Non-Blocking)" (section 3). It reported 78 findings; clearing them is not part of D28. Not proved in CI, because no PR exists yet. No external source; owner's call.

**D29. `CovenSwitchTargets` has no story.** Owner: option a. Built: it is named as the one component without a story in `.claude/rules/components.md` and `claude-docs/workshop.md`. No external source; owner's call.

**D30. Empty Spells tab line for a viewer.** Owner: option a. Built, and the same for the Drafts tab. Source: [22].

**D31. Step control names.** Owner: option a, keep. Not built. No external source; owner's call.

**D32. Open-step badges.** The owner first said to keep both badges, then chose option a: one badge per row, Toxic wins, the note beneath. Built through `SafetyMark`. Sources: [17], [12].

**D33. "See Entry".** Owner: option a. Built. Source: [23].

**D34. Icon strokes at 24 and 32 units.** Owner: option b, keep. Not built. No external source; owner's call.

**D35. The Complete flask icon.** Owner: option b, stroke 1.5. Built. Source: [23].

**D36. DateField disabled opacity.** Owner: option a. Built: the token `$opacity-disabled`, 0.55. Raw rems elsewhere in `DateField` are left as they were. No external source; owner's call.

**D37. Delete on cards and Quick Look.** Owner: option a. Built: no bin or Delete on a card or a Quick Look where an edit dialog holds it. A More menu that already holds other choices may still list Delete or Remove. Story 25 now deletes through the Edit Ingredient dialog. `menu-button.md` and M9.10 in `tasks/m9.md` were amended. Sources: [7], [8].

**D38. Coven-creation Revoke.** Owner: option b, only in the user modal. Built. Source: [8].

**D39. Removing a sign-in method.** Owner: option a, it asks first. Built. Source: [5].

**D40. Row Remove and Revoke.** Owner: option a, drawn plain; the confirm keeps `btn--destructive`. Built, plus the member Remove column made neutral and the user modal's Revoke made plain. Sources: [8], [5].

**D41. Impersonate.** Made plain first (4689e3ea1), then the owner chose red again and the change was reverted (064c7aba3). Built: the rule gained a high-risk clause (section 3). Source: [8].

**D42. Pause Admin Changes.** Owner: stays red. Not built. Source: [8].

### Rule-driven changes (no owner question)

These followed from rules already in force.

- `readableVariantParent` deleted. The docs were wrong: M12.24 had replaced its caller.
- Dead types and `@babel/parser` removed from the removal list.
- `ModalButton` takes `ref` and `onOpen`.
- The `Skeleton` `line` shape honours `count`.
- The wide dialog size removed.
- The axe check moved to Playwright.
- Line icons drawn at stroke 1.5.
- Stylelint token rules (section 3).
- A sub-hour fix, named without an `MB` id: the coven Overview now lists Grimoire.
- The card's last-edit tip can be hovered (WCAG 1.4.13).
- `tests/db/graphql-query-scopes.test.ts` and `graphql-workspace-ids.test.ts` probe six grimoire fields.

## 3. Rules changed

- **Destructive controls.** `.claude/rules/components.md`, section "Destructive controls": Delete and Remove live in the edit dialog, not on a card (a lone bin is the carve-out); a row's Remove or Revoke is drawn plain (`btn btn--quiet btn--small`) and the red belongs to the confirm; red also marks a high-risk control that destroys nothing, and only two exist: Impersonate (row, user modal, confirm) and Pause Admin Changes (Pause, Resume, confirm). The same clause is in `claude-docs/styling.md`. The `CovenSwitchTargets` story exemption is in the same file.
- **Page heads.** `claude-docs/styling.md`, "A page head is a PageHeader, always", and `claude-docs/components/page-header.md`. The guard is `tests/guards/page-heads.test.ts`; its one named exemption is the hidden "Loading" heading in `SectionBody/index.tsx` and `AppShell/main-body.tsx`.
- **Stylelint.** `.stylelintrc.json` gained `declaration-property-value-allowed-list` (font-family, font, font-size, z-index) and `declaration-property-value-disallowed-list` (number-first colour functions). `_variables.scss` is cleared. Docs: `claude-docs/styling.md` and `claude-docs/commands.md`.
- **knip in CI.** `.github/workflows/checks.yml` has an `unused` leg, labelled "Unused Code (Non-Blocking)", that comments on the PR (`pr-comment`, minimize mode) and uses `continue-on-error`. `checks / unused` must never be a required check. Docs: `claude-docs/commands.md` and `claude-docs/ci/reusable-checks.md`. The lint filter in `pr-gate.yml` now includes `knip.json`.

## 4. Not built, and why

- D1, D3, D4, D10, D13, D31, D34, D42: the owner chose to keep what exists.
- D25: the owner will look later.
- `SpellPreview` animations still run `infinite`, and it passes raw rim values to `card.ember-rim()`.
- The builder's discard question names no thing.
- The admin group forms still quote names (D9).
- Low-priority labels from the sweep (S13).
- "Add to My Ingredients" and "Your Cupboard" in `AddIcon/` and `IngredientEntry/` (D15).
- The builder's inventory eye is 21px.
- Raw `1.5rem` in the `SpellPreview` glow and `DateField`.
- knip's 78 findings.

### Built after the review proper, on 2026-10-30

The owner asked for three findings to be fixed in the review rather than filed.

- **The recipe page's reading order matches its phone layout.** The On This Page menu is rendered after the intent and category chips, and The Cupboard side column before Workings, so a keyboard and a screen reader meet them in the order a sighted reader sees them (WCAG 2.2 SC 2.4.3). From a tablet up the grid places them by explicit row instead of the `order` rules that used to move them. Two Playwright tests at 375px prove the Tab order, in `tests/e2e/spell-recipe-layout.spec.ts`.
- **The Record a Working participant box searches the server.** `Workspace.members` takes an optional `query`, narrowed by name in SQL under the membership check, and the box asks `/api/graphql` as the user types from the card and from the recipe page alike, so no roster is fetched up front and no cap exists. An empty box suggests nobody until text is typed.
- **Contents-list links are drawn in body ink** on the admin and coven overviews whether or not visited, so the two pages read the same regardless of browser history.

## 5. Follow-ups

The owner chose on 2026-10-30 to build the two stylesheet findings inside this review rather than mint tasks for them.

- **One shared `ConfirmDialog`** for the five hand-written confirm modals (R39 and S30): not a task of its own. MB.124 already owns one shared row of confirm and safe buttons, and its entry in `tasks/mb.md` now names the five dialogs.
- **Split the builder panels' styles** (R44): built. Category Match's and In the Cupboard's rules moved unchanged into `src/components/SpellBuilder/panels.scss`, which the builder's stylesheet and `SpellRecipe/aside.tsx` both import; the aside no longer imports the builder's whole stylesheet. The rendered CSS was compared rule by rule before and after and is the same set. The recipe page still loads the builder's CSS through the Edit dialog it mounts, so the change removes a wrong import and saves that page no bytes.
- **One mixin for the Recipe Card's step styles** (R47): withdrawn. The audit's premise did not hold: the step rules exist once, in `SpellRecipe/index.scss`; `_recipe-columns.scss` and `SpellPreview/index.scss` lay out the steps section and have never held a step-row rule; the preview renders `SpellRecipeBody`, which imports that stylesheet, so nothing can drift. The only other step rule is the paper font size in `_print.scss`, which is deliberate. `spell-preview.md` now says so.
- **Left as found, for the owner:** a dead `@container spell-column` rule for `.spell-inventory .jar-line__name` in `panels.scss` (no ancestor on the recipe page is that container, and the builder no longer renders In the Cupboard); knip's 78 findings; `DateField`'s raw rems. None is minted.

Board syncs owed: MB.123 (estimate and entry) and M9.10 (amended by D37).

## 6. Sources

1. Page Laubheimer, "Cards: UI-Component Definition," Nielsen Norman Group, November 6, 2016, https://www.nngroup.com/articles/cards-component/ (accessed October 30, 2026).
2. Aurora Harley, "Timing Guidelines for Exposing Hidden Content," Nielsen Norman Group, January 11, 2015, https://www.nngroup.com/articles/timing-exposing-content/ (accessed October 30, 2026).
3. Jakob Nielsen, "Progressive Disclosure," Nielsen Norman Group, December 3, 2006, https://www.nngroup.com/articles/progressive-disclosure/ (accessed October 30, 2026).
4. Mark Crowley, "Provide 'Quick Views' for Visually Driven Products (50% Don't)," Baymard Institute, August 9, 2022, https://baymard.com/blog/mobile-desktop-quick-views (accessed October 30, 2026).
5. Jakob Nielsen, "Confirmation Dialogs Can Prevent User Errors: If Not Overused," Nielsen Norman Group, February 18, 2018, last reviewed August 7, 2026, https://www.nngroup.com/articles/confirmation-dialog/ (accessed October 30, 2026).
6. Page Laubheimer, "Preventing User Errors: Avoiding Conscious Mistakes," Nielsen Norman Group, September 7, 2015, https://www.nngroup.com/articles/user-mistakes/ (accessed October 30, 2026).
7. Kate Kaplan, "Designing Effective Contextual Menus: 10 Guidelines," Nielsen Norman Group, November 28, 2025, https://www.nngroup.com/articles/contextual-menus-guidelines/ (accessed October 30, 2026).
8. Government Digital Service, "Button," GOV.UK Design System, n.d. (latest change listed July 2026), https://design-system.service.gov.uk/components/button/ (accessed October 30, 2026).
9. Apple, "Menus," Human Interface Guidelines, Apple Developer, change log to June 8, 2026, https://developer.apple.com/design/human-interface-guidelines/menus (accessed October 30, 2026).
10. Apple, "Buttons," Human Interface Guidelines, Apple Developer, change log to December 16, 2025, https://developer.apple.com/design/human-interface-guidelines/buttons (accessed October 30, 2026).
11. GitHub, "All Repositories Are Labeled Public, Private, or Internal," GitHub Changelog, October 11, 2021, https://github.blog/changelog/2021-10-11-all-repositories-are-labeled-public-private-or-internal/ (accessed October 30, 2026).
12. Government Digital Service, "Tag," GOV.UK Design System, n.d. (latest change listed February 2026), https://design-system.service.gov.uk/components/tag/ (accessed October 30, 2026).
13. IBM, "Status Indicators," Carbon Design System, last updated August 12, 2026, https://carbondesignsystem.com/patterns/status-indicator-pattern/ (accessed October 30, 2026).
14. GitHub, "Saving," Primer Design System, n.d., https://primer.style/ui-patterns/saving (accessed October 30, 2026).
15. Government Digital Service, "Warning Text," GOV.UK Design System, n.d. (latest change listed October 2024), https://design-system.service.gov.uk/components/warning-text/ (accessed October 30, 2026).
16. Kim Flaherty, "Indicators, Validations, and Notifications: Pick the Correct Communication Option," Nielsen Norman Group, January 17, 2024, https://www.nngroup.com/articles/indicators-validations-notifications/ (accessed October 30, 2026).
17. W3C Web Accessibility Initiative, "Understanding Success Criterion 1.4.1: Use of Color," W3C, updated September 16, 2025, https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html (accessed October 30, 2026).
18. Microsoft, "Capitalization," Microsoft Writing Style Guide, Microsoft Learn, August 26, 2024, https://learn.microsoft.com/en-us/style-guide/capitalization (accessed October 30, 2026).
19. Apple, "Writing," Human Interface Guidelines, Apple Developer, updated December 16, 2025, https://developer.apple.com/design/human-interface-guidelines/writing (accessed October 30, 2026).
20. Government Digital Service, "Check Answers," GOV.UK Design System, n.d., https://design-system.service.gov.uk/patterns/check-answers/ (accessed October 30, 2026).
21. Rachel Andrew, "A Guide to the State of Print Stylesheets in 2018," Smashing Magazine, May 1, 2018, https://www.smashingmagazine.com/2018/05/print-stylesheets-in-2018/ (accessed October 30, 2026).
22. Kate Kaplan, "Designing Empty States in Complex Applications: 3 Guidelines," Nielsen Norman Group, September 19, 2021, https://www.nngroup.com/articles/empty-state-interface-design/ (accessed October 30, 2026).
23. Aurora Harley, "Icon Usability," Nielsen Norman Group, July 27, 2014, https://www.nngroup.com/articles/icon-usability/ (accessed October 30, 2026).

The full research, with 14 topics, is in the review's working notes (`research.md`, not committed).
