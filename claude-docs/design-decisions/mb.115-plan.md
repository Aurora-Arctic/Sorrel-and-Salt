<!-- The approved scoping plan for MB.115, the admin area's design review, approved 2026-10-11 and executed as Opus lanes in worktrees. Stored beside the records it touches; this file is how the work was scoped and is not maintained after the PR lands. The live summaries are claude-docs/styling.md and each admin component's doc under claude-docs/components/. The owner's two sign-off decisions are appended at the end, and the redesign the owner asked for after signing off is recorded in the MB.115 entry in claude-docs/tasks/mb.md ("Amended during MB.115"), with its own plans in mb.115-search-plan.md and mb.115-filter-plan.md. -->

# MB.115 — Design review: the admin area

## Context

MB.114 settled the foundations; MB.116 (merged in #824) added `.page-frame`, `.link-row`, `.provider-mark`, the brand map, `Notice` (with `quiet`), `readGraphqlFailure`/`readGraphqlIssues`/`GENERIC_FAILURE`, `scripts/review-screenshots.mjs` and `assertNoSidewaysScroll`, and already made the admin area's notice and failure-reader adoptions. MB.115 is the next section review, with the same shape and the same additional requirements as MB.116: the owner's brief (cohesion, UX, readability, screen-reader and keyboard access, nothing told apart by hue alone, DRY frontend code, reusable pieces, the browser baseline, a copy review, handoffs to later reviews), the ten testing rules, Opus agents in worktree lanes, a stop for sign-off, and the PR only on the owner's word.

The section is everything under `src/app/admin/` and what it renders: the layout and `AdminNav`; `/admin`; the compendium page with `IngredientForm` in its add/edit modal; the grouped value pages (categories, forms, deities) and group pages (category groups, form groups, deity traditions) with `GroupForm` and `ChipColorField`; the flat vocabularies (planets, zodiac signs); `/admin/users` with `UserList`, its controls and `AdminInvitations`; `/admin/privilege-changes`; and the impersonation banner's touch layout. Two requirements are this section's own: **the user list gets a design of its own**, and **the phone design is signed off separately**, on a touch screen at 375px and 412px.

**Three corrections to the task entry** (verified on `origin/staging` at a753628d; the PR corrects the entry and says so):

1. `CategoryForm` and `IngredientFormValueForm` no longer exist: MB.132 made them `GroupedValueForm` (`kind: category | form | deity`) and `GroupedValueList`. The remaining twins are `VocabularyValueForm`/`VocabularyValueList` (planets, signs) against the grouped pair: same `Required`, `fieldAria`, `fieldError`, `send`, `confirmDelete`, rename note and actions, only the group field missing, the stylesheet a renamed copy.
2. The user list's Impersonate column is not out of sight at 375px: `UserList/index.scss:201-218` makes it `position: sticky; right: 0` (MB.63), and the other columns scroll sideways beneath it inside `.data-table-frame` (`overflow-x: auto`). Still a hidden sideways scroll, and the covered cells are hidden.
3. The Form box left the ingredient row in MB.221/222: `FormField` (`IngredientForm/suggestions.tsx:374-397`) now renders inside each variant's `VariantFieldset` (`variants.tsx:226`). The MB.169 tooltip is `Combobox`'s qualifier tip: `useTip` opens on the input's focus (`Combobox/index.tsx:328-331`), closes on blur, also opens on the qualifier's hover; `.combobox__qualifier-tip` is `position: absolute; left: 0; bottom: 100%` (`index.scss:172-185`), so it covers the label. The detail is already in the input's `aria-describedby`.

**What is wrong today** (verified in source on staging):

- `.admin-layout` lives in `AdminNav/index.scss:4-13` with raw `gap: 1.5rem`, `max-width: 64rem`, `padding: 2rem 1rem`; three stories reuse the class as their frame. `AdminNav` (`index.tsx`, a server component, 11 links in `RESOURCES`) has no `aria-current` and no `.admin-nav` rule; its links wrap into four or five rows at 375px.
- Every admin page is a bare `<main>`. `/admin` is an h1 and a stale paragraph. `/admin/privilege-changes` has a bare h1 with no `.page-header`. The grouped trio (`categories`, `forms`, `deities`, ~170 lines each) and the group trio (`category-groups`, `form-groups`, `deity-traditions`, ~140 each) are noun-swapped copies; only planets and zodiac signs share a module (`vocabulary-page.tsx`). Repeated per page: the cursor read (10 files), prev/next href builders (10), `resolveNumberedPage` in `cache()` (9), `.page-header` + Add link (9), `adding`/`editSlug` (8), the "No X has that address" `Notice` (8), `readEdited` try/`NotFound` (8), `XSearchParams` types (9). Eight `*-dialog.tsx` wrappers copy `useRouter` + `close = () => { router.replace(closeHref); router.refresh() }`; `vocabulary-dialog.tsx:25` passes `onDone={close}` and skips the fade the other seven have.
- Lists: every table is `.data-table-frame > table.data-table` with no phone layout; `UserList` and `PrivilegeLedger` have seven `nowrap` columns. Five hand-written filter forms copy the `__search` rule verbatim (UserList:50-55, GroupedValueList:18-23, CompendiumList:18-23, VocabularyValueList:18-23, PrivilegeLedger:13-18); three navigate softly with a spinner, two (`UserList/filter.tsx`, `PrivilegeLedger/filter.tsx`) use `window.location.assign` with none. Six `href.ts` files copy `pair()`. The list-root column rule is written four times. `AdminInvitations` imports `../UserList/index.scss`.
- Forms: `IngredientForm/fields.tsx` holds a good react-hook-form shell (`FieldError` :42, `useField` :57, `FieldShell` :87, `TextField` :133, `SelectField` :237, generic over the form's values), yet `GroupedValueForm`, `VocabularyValueForm` and `GroupForm`, also react-hook-form, hand-write `div.field > label + input + p.field__error` with their own `fieldAria`/`fieldError` (:277/281, :173/177, :294/298). `Required` is written five times, each with its own `__required { color: $secondary }`. The plain-state forms (invite-form, `ConfirmedAction`'s Reason, NameForm, EmailForm) hand-write the same block: 15 blocks in all, plus 9 more label+control pairs in the filters. The spinner-button markup is written 23 times across `src/components`. `InfoTip/use-tip.ts` is a near-copy of `Combobox/tip.ts` (lacking only `canOpen`). `HEX_COLOR` (`src/lib/contrast.ts:25`) is copied at `GroupForm/index.tsx:164` and `ChipColorField/index.tsx:29` (MB.209's handoff). `ChipColorField` hand-writes `p.notice--error` (:341) and `output.notice--warn` (:348).
- Destructive actions: every Delete and every Revoke confirms and says what happens. Pause/Resume Admin Changes (`pause-control.tsx`) does not confirm, the owner's MB.63 call ("pausing takes nothing away", `user-list.md:205`). Impersonate (`impersonate-button.tsx:34-42`) does not confirm and, while pending, only sets `disabled`: no `aria-busy`, no spinner, focus lost.
- Raw sizes: `UserList/index.scss` 12 (`1.25em` ×2, `1.5rem` ×4, `1rem` ×4, `1px`, `18rem`); `Modal/index.scss` (`32rem`, `48rem`, `2.5rem` ×2, `2rem`); `ImpersonationBanner` (`3px`, `3.9rem`); `ChipColorField` ~18; `Combobox` ~25; `InfoTip` ~5; `IngredientForm` ~5. Recurring roles: a `1.5rem` icon box, a `1rem` glyph, a `min(18rem, calc(100vw - space(6)))` tip width. No hex anywhere (stylelint holds); nothing bans a raw length.
- Tests and stories: `assertNoSidewaysScroll` runs only on the 403 test (`admin.spec.ts:64`); only `admin/privilege-changes.spec.ts` scans both themes; no e2e covers impersonation; Foundations has no `.data-table`, `.pager` or filter section; no admin story has `PhoneDark`/`PhoneLight`; every admin doc's Styling section defers to MB.115, and every admin SCSS header says "Layout only, until … (MB.115)".

**Shape of a section review** (`mb.116-plan.md:22`): proposals as workshop stories → an "awaiting sign-off" comment → the owner decides in the workshop and the running app → decisions recorded as a comment → applied → PR into staging on the owner's word.

## Decisions already taken (owner, 2026-10-11)

- **Branch** `feature/mb.115-design-review-admin` off fresh `origin/staging` (MB.223 is merged; it changed no frontend file). Issue #572. Work in `/app` for one lane (its current branch, MB.116's, is merged).
- **All the DRY work folds into this task, re-estimated from 4h to 16h**, as MB.116 did: the page trios become shared page modules on `vocabulary-page.tsx`'s model; one shared field shell and `TextField`; one filter form; one route-modal wrapper; one busy button; one `useTip`; `VocabularyValueForm`/`VocabularyValueList` fold into the grouped pair. Merging lands before styling, since styling three copies is triple work.
- **One stop for sign-off, recorded twice**: one "awaiting sign-off" comment in a desktop part and a phone part (375px and 412px screenshots, both themes, touch emulation); the owner's desktop and phone decisions are recorded as two separate comments.
- **Testing follows the ten rules** (`claude-docs/testing/layer-ownership.md`, "What a test may assert"): functional requirements only, never scripts or the workshop; state, never copy, locators keep exact names; a regression test needs a shipped bug; no presentation in jsdom (the real-browser 375px scroll-width measurement and the one-assertion-per-theme contrast table are the allowed exceptions); one row per shared path; each layer proves only what it adds; no guard lint can carry; e2e proves what only a server can, one axe scan per page. For this task: fold checks into existing specs, one scroll check and one dark scan per page template, `tests/scss/tokens.test.ts` gains rows not a sibling, merged components merge their test files.
- **Browser baseline** (`styling.md`, "Binding rules"): Next's modern targets; Lightning CSS lowers `light-dark()`. Everything below (`@container`, `:has()`, `color-mix()`, `position: sticky`, `attr()`) sits inside it. The owner looks once in Safari and Firefox on the host.
- **Writing**: prose British, identifiers in code spelling, title case for every label, button, heading and column heading, no `Co-Authored-By` lines. Commit after each green `npm run pre-commit`; suites once at task end. **The PR waits for the owner's word** (a design-review task is the exception to the lane-run PR agent). The PR body ends with `node .claude/skills/project-progress/tally.mjs --ref origin/staging` after a `---` rule.

## Phase 1 — Merge, grow the foundations, build the proposals, stop

### 1a. Tokens and primitives (`src/scss/`), shown on Foundations

**Tokens** in `_variables.scss` under "Motion and layout" (~:318-334), each with a comment naming its role and former home. All tokens land in Wave A; a Wave B lane needing another asks the orchestrator, who adds it in `/app`, and the lane merges the feature branch. No Wave B lane edits `_variables.scss`.

| Token                     | Value                                               | Replaces                                                    |
| ------------------------- | --------------------------------------------------- | ----------------------------------------------------------- |
| `$wide-column`            | 64rem, or the width signed off (1d.10)              | `.admin-layout`'s `64rem`                                   |
| `$dialog-column`, `-wide` | 32rem, 48rem                                        | `Modal/index.scss:20,88`                                    |
| `$icon-size`              | 1.5rem                                              | UserList ×4, InfoTip, Combobox icon boxes                   |
| `$glyph-size`             | 1rem                                                | UserList ×4, InfoTip glyphs                                 |
| `$tip-width`              | 18rem, as `min($tip-width, calc(100vw - space(6)))` | UserList:317, InfoTip                                       |
| `$close-target`           | 2.5rem                                              | Modal :110-111 (the × target)                               |
| `$table-stack-width`      | 40rem (proposed)                                    | the container width under which `.data-table--stack` stacks |
| `$rule-heavy`             | 3px                                                 | the banner's rule (the owner's MB.53 call)                  |

**Primitives** in `_primitives.scss`, each with a comment saying what it is and why not the obvious alternative; any width a component must override sits in `:where()` (MB.116's cascade note: primitives compile as `body .x` in the app and `:where(.ladle-story-frame) .x` in Ladle; verify in the app, not only the workshop).

- **`.admin-layout`**, moved from `AdminNav/index.scss` and deleted there: `gap: space(5)`, `padding: space(6) space(4)`, `max-width: $wide-column`, `box-sizing: border-box`. The class name stays (the layout and three stories use it as their frame).
- **`.link-row a[aria-current='page']`**: the current-page marker, told apart without hue (weight and an offset underline; restyled per 1d.4). MB.122 inherits it.
- **`.data-table-frame { container-type: inline-size }`** and **`.data-table--stack`** under `@container (max-width: #{$table-stack-width})`: rows become cards (`tr` grid, `td` block, `thead` visually hidden, `td::before { content: attr(data-label); content: attr(data-label) / '' }` with the plain declaration as Safari 16.4's fallback; cards on `$surface-card`, `radius('surface')`, `space(3)` padding, banding off; a `td[data-label='']` action cell loses its label and goes full width). **Risk**: `display` on table parts drops table semantics in WebKit, so every stacking table carries explicit `role="table|rowgroup|row|columnheader|cell"` (no jsdom query changes: `getByRole('cell')` already matches `td`).
- **`.filter-row`**: the `__search` rule written five times; under 28rem of its own width the query field goes full width and the rest wraps.
- **`.list-frame`**: the list root (`flex column; gap: space(5); > p { margin: 0 }`), written four times.
- **`.field__label-row`**, **`.field__required`**: from `IngredientForm/index.scss`'s `__label-row`/`__required`; retire five `__required` rules.
- **`.form__confirm`** (an inline delete confirmation standing where the buttons were) and **`.form__aside`** (Delete pushed to the far end); the existing `.form` container query already stacks them.
- **`.page-header`** becomes a size container; under 28rem the action wraps beneath the h1 at its natural width (1d.8).

**Foundations** (`.ladle/foundations.tsx`/`.scss`): new sections `#fd-data-table` (banded; a stacked one inside a 375px box), `#fd-pager`, `#fd-filter-row`, `#fd-page-header` (desktop and 375px); `#fd-link-row` gains the current marker; `#fd-fields` gains the required mark and label row with an InfoTip. Keys and classes only, never values.

**`.ladle/navigation.ts`** gains `usePathname()` returning `'/admin/users'` (it stubs `useRouter` today), so AdminNav's story shows the marker; documented in `workshop.md`.

**`scripts/review-screenshots.mjs`**: contexts take `hasTouch: true, isMobile: true` so `(hover: none)` holds and the banner takes its in-flow layout; header comment and `workshop.md` updated. No test (rule 1).

### 1b. Shared components (reusable by every later section)

- **`src/components/Field/`** (`index.tsx`, `text-field.tsx`, `select-field.tsx`, `types.ts`, story, doc `field.md`): one shell, two entry paths. The shell (`FieldShell`, `FieldError`, `Required`, and `fieldDescription({ id, hint, note, describedBy, error, invalid })` returning the ids plus `aria-describedby`/`aria-invalid`, the logic of `useField` at `fields.tsx:57-85`) knows no form library. The react-hook-form path lifts `TextField<V>` and `SelectField<V>` from `fields.tsx:133-183, :237-273`, reading `useFormContext`; the admin forms wrap their fields in `<FormProvider>`. The plain-state forms (NameForm, EmailForm, invite-form, `ConfirmedAction`'s Reason, GroupForm's move-to select) render `<FieldShell>` around their own control: one shell, not a second `TextField`. `SuggestField`, `MultiSelectField` and `ListField` stay in `IngredientForm/fields.tsx` (MB.120's), importing the shell from `../Field`; their props types move to `Field/types.ts`.
- **`src/components/BusyButton/`** (`busy`, `busyLabel`, every button attribute): renders `aria-busy`, the `.spinner` and the label swap. Adopted by every spinner button (`git grep -n 'className="spinner"' -- src`) bar `Pager/end-content.tsx`, an anchor. The adopters outside the section (EmailForm, NameForm, SignInMethods, SignOutButton, InvitationAcceptance) are ride-alongs named in the PR.
- **One `useTip`**: `InfoTip/use-tip.ts` takes an optional `canOpen = () => true`; `Combobox/tip.ts` is deleted and `Combobox/index.tsx:15`, `entry.tsx:7` import `../InfoTip/use-tip`. Combobox tests pass unchanged.
- **`src/components/FilterForm/`** (client): `<search><form className="filter-row" method="get" action aria-label onSubmit>{children}<BusyButton>Filter</BusyButton></form></search>`; props `label`, `action`, `href()`, `disabled` (the caller's "nothing changed"), `navigation: 'soft' | 'full'` (`useTransition` + `router.push`, or `window.location.assign`); the spinner shows in both modes (a sub-hour gain for UserList and PrivilegeLedger). The five filters keep their own field state and supply the children.
- **`RouteModal`** (`src/components/Modal/route-modal.tsx`, exported from `Modal`): `closeHref`, `title`, `size`, `children: (done) => ReactNode`; `close` is `router.replace(closeHref); router.refresh()`, `done` the fade. Retires the eight wrappers' plumbing and fixes the planets fade by construction. Documented in `modal.md`; the Modal's raw sizes go to tokens here.
- **`src/components/PageHeader/`** (`title`, `action?`): the `.page-header` with h1 written nine times; server-safe; story and doc.
- **`src/lib/list-href.ts`**: `listHref(path, params)` where `true` is a bare flag (`new`, `awaiting`); the six `href.ts` files become thin typed wrappers.
- **`src/app/admin/list-page.ts`** (server): `readListPlace(params)` → `{ query, after, before, editSlug, adding }`; `pagerHrefs(pageInfo, build)`; `readOrMissing(fn)` turning `NotFound` into `undefined`. Beside it `missing-notice.tsx`, the "No X has that address" `Notice` written once.

### 1c. Pages and components adopt the pieces (before any styling)

| Route(s)                                          | New module                                                                                                                                                                                      | Deleted                                                                                                             |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| categories, forms, deities, planets, zodiac-signs | `src/app/admin/value-page.tsx` with a `value-kinds.ts` registry (per kind: list, count, get-by-slug, optional group reader, from `@/modules/vocabulary`) and `value-dialog.tsx` on `RouteModal` | `vocabulary-page.tsx`, `vocabulary-dialog.tsx`, `category-/form-/deity-dialog.tsx`, the route bodies and `types.ts` |
| category-groups, form-groups, deity-traditions    | `src/app/admin/group-page.tsx`, `group-dialog.tsx`                                                                                                                                              | the two `group-dialog.tsx`, `tradition-dialog.tsx`, three bodies and their `types.ts`                               |
| compendium                                        | keeps its page on `list-page.ts`, `PageHeader`, `RouteModal size="wide"`                                                                                                                        | `compendium-dialog.tsx`'s router lines                                                                              |
| users, privilege-changes                          | on `list-page.ts` and `PageHeader` (privilege-changes gains its header)                                                                                                                         | —                                                                                                                   |

Each route's `page.tsx` stays (Next needs it; it carries `metadata`) and returns `ValuePage({ kind, searchParams })` as `planets/page.tsx` does today. Route types consolidate in `src/app/admin/types.ts`.

**Components.** `GroupedValueForm` absorbs `VocabularyValueForm`: `KINDS` gains `planet` and `zodiacSign` with no `group` spec; the group field renders only when the spec has one; the directory keeps its name (8 importers, docs, tests) and its doc says "grouped, or flat where the kind has no group". `GroupedValueList` absorbs `VocabularyValueList` the same way (`VOCABULARY_COPY` folds into its `KINDS`), so `value-page.tsx` serves five routes. Everything adopts Field, BusyButton, FilterForm, `.list-frame`, `.filter-row`, `.form__confirm`/`__aside`, `.field__required`, `HEX_COLOR` (GroupForm, ChipColorField) and `listHref`; afterwards each admin `index.scss` holds only what is its own.

### 1d. Contested calls, drawn side by side as `Proposal…` stories

Each at desktop and as `PhoneDark`/`PhoneLight` (`meta = { theme, width: 375 }`). Alternative markup is story-only static markup, never a component prop, so no dead path ships. Losing stories are deleted after sign-off.

1. **The user list at phone width** (the named criterion). **A (recommended)**: CSS-only cards via `.data-table--stack`, `<table>` semantics and DOM kept with explicit roles; each card: name + history link as its title line, Email with its mark, Role with Grant/Revoke, Coven Creation with Approve/Revoke, Sign-In Methods, Signed Up, Impersonate full width at the foot; the sticky column becomes `static` under the stack rule. **B**: a per-row `<details>` disclosure (changes the DOM, breaks the row/cell index tests in the 833-line `UserList` test and `admin.spec.ts:143-155`, hides facts behind a tap). **C**: a two-tier row with a `colspan` control row beneath (doubles rows, breaks banding and the index tests). The other admin tables take the same modifier, so the section has one phone design.
2. **The user list at desktop** ("a design of its own"). **A (recommended)**: the seven columns in MB.59's order, restyled: read-only facts (Signed Up, methods) muted at caption size, controls at the end of their cell, the Impersonate column losing its 6% tint but keeping its red rule and wax button (danger by shape and words, not hue), rows at `space(3)` padding. **B**: Name and Email merge into one User column (frees width; changes the column count and breaks the index tests and the e2e row text).
3. **The MB.169 tooltip.** **A**: today (above, left-aligned, open while focused). **B**: above, right-aligned to the qualifier (`right: 0; left: auto; max-width: 60%`) so the label stays clear. **C**: as A or B but closing at the first keystroke and when the listbox opens; focus or hover reopens; Escape closes. **D**: below the box, closing when the list opens (collides with the listbox). Recommend **B + C**. Hover-only is not offered (WCAG 2.1.1); the detail stays in `aria-describedby` whichever wins.
4. **AdminNav at 375px.** **A (recommended, minimal)**: a wrapping `.link-row` with a `space(2) space(4)` gap and the current marker. **B**: one scrollable row (a hidden sideways scroll, against the criterion's spirit). **C**: grouped rows (Compendium · Vocabularies · People). **D**: a `<select>` jump menu (needs JavaScript; not recommended). The collapse is MB.122's. The marker drawn two ways: underline + weight (recommended) or a `$surface-card` pill.
5. **Confirmations.** Impersonate: **A** today, no confirmation; **B (recommended)**: `ConfirmedAction` "Impersonate User" saying you will see and act as them until Stop Impersonating at the top of the page; the action stays `.btn--destructive`. Pause: **A (recommended)** today, the owner's MB.63 call; **B**: `ConfirmedAction` saying who it stops. Flag: Pause B reverses an earlier owner call.
6. **Table rows**: banded (today, the owner's M5.6 call, recommended) or hairline rules. Cards at phone width either way.
7. **The filter at phone width**: stacked `.filter-row` (recommended) or collapsed behind a Filter disclosure showing the active filter.
8. **The Add button in `.page-header` at 375px**: wraps beneath the h1 at its natural width (recommended) or full width.
9. **The `/admin` index**: **A** today's h1 and stale paragraph; **B (recommended)**: a lede and a table of contents in three titled groups (Compendium; Vocabularies; People), each link with a one-line description. `admin.spec.ts:87-104` measures a paragraph at 66ch, so a `<p>` stays.
10. **The admin column width**: 64rem (today) or 80rem; measure the user list at 1280px with dev data and recommend the smallest width at which its seven columns do not scroll in their frame.
11. **The modal at phone width**: inset with `$modal-gap` (today, the owner's M5.5 call, recommended) or a full-height sheet.
12. **The Reason fields** (ConfirmedAction, invite): the hint as an InfoTip with label "Reason (Optional)" (recommended, `styling.md`'s hint rule) or the visible `.field__hint` kept.

### 1e. Copy review (a table in the sign-off comment)

Every sentence proposed against MB.116's register ("you"; one sentence for what happened and one for what to do; "Please try again." only where retrying helps; "email address" then "address"; title case for every label, button and heading). Sources: the empty states (GroupedValueList's `No ${noun} matches.`/`No ${plural} yet.` and the folded flat kinds, GroupList, CompendiumList, PrivilegeLedger, UserList "No users match.", AdminInvitations); the "No X has that address — it may have been renamed or deleted." notice (now one); the delete confirmations (`KINDS` `deleteNote`/`renameNote`, GroupForm's three-step move-then-delete, IngredientForm's confirm); `ConfirmedAction`'s questions and warnings (`role-control.tsx`, `creation-control.tsx`, `warning.ts`, AdminInvitations' Revoke); pause and impersonation (`pause-control.tsx`'s notice, `src/lib/primary-admin.ts`'s refusals, Impersonate's failure line, the banner's sentences); filter labels, select options, every column heading, every button label; the invite form's labels, hint, notices; ChipColorField's two notices; the `/admin` index; the page `metadata` titles. Where a label or button changes, its locators change in the same PR; no test is written for new copy.

### 1f. Sub-hour defects fixed (no regression tests, rule 3)

The planets/signs dialog fade (gone with `RouteModal`); Impersonate's pending state (`BusyButton`, `aria-busy`, spinner, "Impersonating", `aria-disabled` so focus stays); `HEX_COLOR` at `GroupForm/index.tsx:164` and `ChipColorField/index.tsx:29`; ChipColorField's warning `<output>` → `<Notice kind="warn" quiet>` (the error `<p>` at :341 stays hand-written with a comment: it is the field's described error, and `Notice`'s `error` kind would add `role="alert"` and read it twice); the stale `/admin` copy; privilege-changes' `PageHeader`; the full-load filters' spinner; `AdminInvitations` dropping the `../UserList/index.scss` import.

### 1g. Review surface, then stop

- **Stories**: every admin component gains `PhoneDark`/`PhoneLight` inside `.admin-layout` (forms stay `iframed`); Field, BusyButton, FilterForm, PageHeader get stories; the 1d proposals are `Proposal…` stories named in the comment.
- **Running services**: `npm run db:reset && npm run dev` with `ENABLE_IMPERSONATION` set as `.env.local` has it (never printed) on 8000; `npm run workshop` on 61000; a served copy for the camera: `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=devcontainer npx ladle serve --host 0.0.0.0 --port 61001`.
- **Signed-in storage state** for the admin pages: a throwaway script in the session scratchpad (never committed, never printing `DATABASE_URL`, `BETTER_AUTH_SECRET` or a token), run with `npx tsx <file>.mts`, modelled on `tests/e2e/session.ts`'s inserts and cookie signing against the dev database named by `/app/.env.local`: a fixture admin and a fixture user, a session for each, and a user session with `impersonated_by` set to the admin, each written as a Playwright storage-state file under `.reports/` (gitignored) holding the `better-auth.session_token` cookie for host `devcontainer`. Deleted at task end.
- **Screenshots**: `node scripts/review-screenshots.mjs --out .reports/mb.115-screenshots --storage-state .reports/<admin-state>.json --pages <file>`: `/admin`; `/admin/compendium`, `?new`, `?edit=<seeded slug>`; each value page plain, `?new`, `?edit=`; each group page `?edit=` (the colour picker); `/admin/users`; `/admin/privilege-changes`; the proposal stories by `?story=`. A second run with the impersonating state on `/` and `/account` for the banner's touch layout.
- **The comment on #572**, "awaiting sign-off", in two headed parts: **Desktop** (the 1d calls with story names, the copy table, the routes to open) and **Phone** (the screenshot names at 375 and 412 in both themes, every admin page and the banner, the phone proposals). Paths, story names and decisions, never values or tokens; a note to look once in Safari and Firefox. **Stop.**

## Phase 2 — Apply the sign-off

1. Record the owner's decisions as two comments on #572: "Desktop sign-off" and "Phone sign-off".
2. Delete the losing `Proposal…` stories; apply the decisions in the same lanes.
3. Tests, docs, board and verification below.
4. Commit and push. **The PR waits for the owner's word.** Body: `Closes #572`; the shared pieces by name (Field, BusyButton, FilterForm, RouteModal, PageHeader, one `useTip`, `listHref`, `list-page.ts`, `value-page.tsx`, `group-page.tsx`, the primitives and tokens); the folds; the ride-alongs (NameForm, EmailForm, SignInMethods, SignOutButton, InvitationAcceptance on BusyButton/FieldShell; the screenshot script's touch emulation); the sub-hour fixes; the entry corrections; the tally after `---`. Then `status MB.115 "In Review"` and a comment with the link.

## Lanes (Opus agents, `model: "opus"`)

Worktrees at `/home/node/worktrees/<name>` (`git worktree add -b <branch> … feature/mb.115-design-review-admin`), `cp -a /app/node_modules` minus `node_modules/.cache/tsc/tsconfig.tsbuildinfo`, `/app/.env.local` copied in. Lane 1 uses `/app`. Vitest under `flock /tmp/sorrel-vitest.lock`, Playwright under `flock /tmp/sorrel-e2e.lock`; `npx tsx -e` is CommonJS; no Python. Each lane commits after each green pre-commit and reports to the orchestrator; it never commits to a finished branch again.

| Lane                     | Where              | Wave                  | Owns (files no other lane edits)                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------ | ------------------ | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Foundations            | `/app`             | A, then on call       | `_variables.scss`, `_primitives.scss`, `.ladle/*`, `scripts/review-screenshots.mjs`, `styling.md`, `workshop.md`, `tests/scss/tokens.test.ts` (Phase 2)                                                                                                                                                                                                                          |
| 2 Shared                 | `mb115-shared`     | A                     | `Field/`, `BusyButton/`, `FilterForm/`, `PageHeader/`, `Modal/`, `InfoTip/use-tip.ts`, `Combobox/tip.ts` + `entry.tsx` + the import line in `Combobox/index.tsx`, `IngredientForm/fields.tsx` and `types.ts` (the lift only), `src/lib/list-href.ts`, `src/app/admin/{list-page.ts,missing-notice.tsx}`, NameForm, EmailForm, SignInMethods, SignOutButton, InvitationAcceptance |
| 3 Values                 | `mb115-values`     | B                     | `GroupedValueForm/`, `VocabularyValueForm/` (deleted), `GroupedValueList/`, `VocabularyValueList/` (deleted), `GroupForm/`, `GroupList/`, `ChipColorField/`, the eight value and group routes, `value-page.tsx`, `value-kinds.ts`, `value-dialog.tsx`, `group-page.tsx`, `group-dialog.tsx`, `src/app/admin/types.ts`, their tests and docs                                      |
| 4 People                 | `mb115-people`     | B                     | `UserList/`, `AdminInvitations/`, `PrivilegeLedger/`, `ImpersonationBanner/`, `users/`, `privilege-changes/`, their tests and docs                                                                                                                                                                                                                                               |
| 5 Compendium, nav, close | `mb115-compendium` | B, then Phase 2 close | `AdminNav/`, `src/app/admin/{page,layout}.tsx`, `compendium/`, `CompendiumList/`, `IngredientForm/` (bar the Wave A lift), `Combobox/` (bar the import), `InfoTip/` (bar `use-tip`), every `tests/e2e/admin*.spec.ts`, `claude-docs/testing/e2e.md`, `claude-docs/tasks/mb.md`, the plan copy                                                                                    |

**Order.** Wave A: lanes 1 and 2 in parallel (disjoint files; lane 2's shell uses class names lane 1 defines and is unstyled until the merge). The orchestrator merges both into the feature branch once green. Wave B worktrees branch from that merged branch, so every adopter starts with the shared pieces in place. During Wave B lane 1 stays available in `/app` for token or primitive requests; Wave B lanes `git merge` the feature branch when told a request landed. The orchestrator merges each Wave B lane as it goes green, then produces the storage states and screenshots and posts the stop comment. Phase 2 reuses the worktrees after each merges the feature branch; lane 5 edits the e2e specs last, after lanes 3 and 4 merge, since `admin.spec.ts` covers all three lanes' pages.

## Tests (to the ten rules)

- **`tests/scss/tokens.test.ts`** gains rows only, plus a `mixed(a, b, weight)` helper (per-channel sRGB mix rounded to 8 bits, matching `color-mix(in srgb)`): `--text-primary`, `--text-muted`, `--accent`, `--secondary` on `--surface-card` at 4.5 (banded rows, cards, the banner, small wax buttons in rows); `--secondary` on the page at 4.5; the banner's `$secondary` rule on the page at 3; if the Impersonate tint survives 1d.2, `--secondary` on `mixed(secondary 6%, page)` and on `mixed(…, card)`; any pairing a signed-off design adds. Still one assertion per theme.
- **e2e, edited in place** (lane 5, Phase 2): `admin.spec.ts:68` (layout template) gains `assertNoSidewaysScroll`, a dark scan, and after a click to Users `getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Users' })` has `aria-current="page"`; `admin.spec.ts:123` (users template) gains the scroll check, a dark scan, and **at 375px every `getByRole('cell')` of the users table has a bounding box inside `[0, 375]`** (functional; only a real browser can measure it; fails on today's sticky overlay); `admin.spec.ts:341` (value-list template) the scroll check and a dark scan; `admin-compendium.spec.ts:58` (already 375px) the scroll check; `admin/privilege-changes.spec.ts:48` the scroll check. The class-name hovers at `admin.spec.ts:158-171` change only if a class is renamed (prefer not). No trimming of existing scans.
- **Component tests, only where behaviour or structure changes**: AdminNav gains one `it` with `usePathname` mocked (`aria-current` on the current entry only); UserList gains "Impersonate is busy while pending" and, if 1d.5B, the modal flow replacing the direct call; Combobox, per 1d.3C, "the tooltip is shown on focus and gone after a keystroke" by role; GroupedValueForm gains the flat kinds as `it.each` rows (rule 5) and `tests/components/VocabularyValueForm/` goes, likewise the lists; `tests/app/admin/{categories,forms,deities}/page.test.tsx` + `vocabulary-page.test.tsx` → `value-page.test.tsx`, the three group tests → `group-page.test.tsx` (one kind carries the shape; each other kind asserts only its path and service; net minus five files); `IngredientForm/compendium.test.tsx:185`'s class selector becomes a role query (rule 4). FilterForm, BusyButton, Field, PageHeader and RouteModal get no file of their own; adopters cover them. Nothing for the screenshot script, the stubs or Foundations.

## Docs (same PR)

- `styling.md`: "Binding rules" (the new tokens' roles); "Buttons" (the admin-tables paragraph rewritten to banded-or-not plus stacking; a `BusyButton` sentence); new "The admin layout" and "Tables at phone width" (`.data-table--stack`, explicit roles, `attr() / ''`); "Form fields" (`.field__label-row`, `.field__required`, `.form__confirm`, `.form__aside`, `.filter-row`, Field); "Link rows" (the current marker); "Designing a section" (Field, FilterForm, RouteModal, BusyButton, PageHeader, the stacking table); "The top inset" (the banner sign-off).
- `claude-docs/components/`: new `field.md`, `busy-button.md`, `filter-form.md`, `page-header.md`; `modal.md` (RouteModal, tokens), `info-tip.md` and `combobox.md` (one `useTip`, the tooltip decision); delete `vocabulary-value-form.md` and `vocabulary-value-list.md` and repoint links (`git grep -l vocabulary-value- claude-docs`); rewrite every admin doc's Styling/Stories/Testing: admin-nav, user-list, impersonation-banner, admin-invitations, ingredient-form (:501, :853), grouped-value-form, grouped-value-list, group-form, group-list, chip-color-field, compendium-list, privilege-ledger, pager, combobox.
- `workshop.md` (touch emulation, the `usePathname` stub, the Foundations sections); `testing/e2e.md` (the per-template list: admin layout, users, value list). Each admin SCSS header's "Layout only, until … (MB.115)" becomes what the file now holds.
- `claude-docs/tasks/mb.md`: the MB.115 entry corrected (the three corrections, the folded DRY work, the shared pieces, the plan link, the two-part sign-off) and `· 16h`; handoff lines into MB.119–MB.124; `node scripts/task-board.mjs sync` for every edited entry, from the checkout holding the edit. This plan copied to `claude-docs/design-decisions/mb.115-plan.md`.

## Handoffs written into the later reviews' entries

- **MB.119 (coven)**: Field, BusyButton, FilterForm, PageHeader, `.data-table--stack`, `listHref` for the invitation and member lists.
- **MB.120 (compendium)**: IngredientForm read-only and public; `SuggestField`/`MultiSelectField`/`ListField` still in `IngredientForm/fields.tsx` on the shared shell; the `duplicates.tsx` warning; the qualifier tooltip decision applies wherever `FormField` renders.
- **MB.121, MB.123**: the stacking table, FilterForm, Pager and BusyButton for any list.
- **MB.122 (navigation)**: `.link-row a[aria-current='page']` and AdminNav's `usePathname` pattern; the collapse of an 11-link nav at phone width; the `usePathname` stub.
- **MB.124**: `Notice`, the empty-state inventory and copy register; `.data-table`, `.pager`, `.filter-row` on Foundations; BusyButton as the one busy state; a `$layers` map for z-indices (left raw here); `th scope="row"` on each table's first cell (held back: it changes `getAllByRole('cell')` counts).

## Board

1. `node scripts/task-board.mjs status MB.115 "In Progress"`; a comment naming the branch and that the DRY folds are taken in on the owner's call.
2. `estimate MB.115 16`; the entry heading `· 16h`.
3. Entry corrections and handoffs as in Docs; `sync MB.115 MB.119 MB.120 MB.121 MB.122 MB.123 MB.124`.
4. Comments as work proceeds, naming paths never values; the two sign-off comments; `In Review` with the PR link once the owner gives the word; `Done` is the merge's. A `gh` write the auto-mode classifier refuses is handed to the owner as the exact command.

## Verification

1. `npm run pre-commit` before each commit (lint includes stylelint). Codegen runs in lane 3 when `graphql()` documents move into `GroupedValueForm`/`GroupedValueList`; commit `src/gql/`.
2. At task end, once: `npm run test:coverage`, `npm run test:stories`, `npm run workshop:build`, `npm run build`, and `flock /tmp/sorrel-e2e.lock env ENABLE_IMPERSONATION= BETTER_AUTH_SECRET=… npx playwright test tests/e2e/admin.spec.ts tests/e2e/admin-compendium.spec.ts tests/e2e/admin-invitations.spec.ts tests/e2e/admin/privilege-changes.spec.ts tests/e2e/account.spec.ts tests/e2e/invite.spec.ts` (the last two cover the BusyButton ride-alongs), after `npm run build` with ports 8001+ and 8100 free.
3. Re-measure every new pairing with `contrastRatio` (`src/lib/contrast.ts`) against the tokens test, and the stacked cards' edge on the page.
4. Check the `.form`, `.page-header` and table-stack container queries at exactly their thresholds (max-width is inclusive).
5. Walk every page by keyboard in both themes at 375px and desktop: focus ring visible on banded rows and cards; every user's controls reachable; the locked-control tip (`position: fixed`, placed by script) and the history and crown tips not clipped inside a `container-type` frame; the tooltip decision reads the detail while typing; the banner's Stop reachable on touch. The owner looks once in Safari and Firefox.

## Out of scope

IngredientForm read-only and the public compendium (MB.120); the nav collapse and a site header (MB.122); the `duplicates.tsx` warning; a z-index layer map and row headers (MB.124); backend and GraphQL changes; `Pager`'s behaviour; editing `mb.206-plan.md` (a record); tests of scripts, stubs or the workshop.

---

## Execution detail for the agents (Opus)

**Read first**: `CLAUDE.md`; `.claude/rules/components.md` and `.claude/rules/testing.md` (load by reading a file under `src/components/`); `claude-docs/styling.md` sections "Binding rules", "Buttons", "Form fields", "The page frame", "Designing a section" (grep the `## ` heading, read to the next; never the whole file); `claude-docs/testing/layer-ownership.md` "What a test may assert" (outranks `testing.md` where they differ); `claude-docs/workshop.md` "`.ladle/`" and "Review screenshots". Never read `claude-docs/archive/`. British prose; code spelling in identifiers; title case for every button, heading, column heading and label; no `Co-Authored-By`. Commit after each green `npm run pre-commit`; report to the orchestrator per step; suites once at task end.

### 0. Branch and board (orchestrator)

```sh
cd /app && git fetch origin staging && git checkout -b feature/mb.115-design-review-admin origin/staging
node scripts/task-board.mjs status MB.115 "In Progress"
node scripts/task-board.mjs comment MB.115 "Branch feature/mb.115-design-review-admin created off origin/staging; work started. The frontend DRY work folds into this task on the owner's call, and the estimate is re-set."
```

### 1. Foundations lane (`/app`, Wave A, ~2.5h)

- `_variables.scss`: the 1a tokens under "Motion and layout" after `$control-height` (~:334), each commented with its role and former home.
- `_primitives.scss`: `.admin-layout` after `.page-frame__rule` (~:370), from `AdminNav/index.scss:4-13` on scale; the `.link-row` marker after `.link-row` (~:379); `.data-table-frame { overflow-x: auto; container-type: inline-size }` (:436); `.data-table--stack` and its `@container` block after `.data-table` (:443-470), documenting the sticky reset UserList compounds; `.filter-row` and `.list-frame` after `.pager`; `.field__label-row` and `.field__required` after `.field__label` (:587); `.form__confirm` and `.form__aside` after `.form__actions` (:565); `.page-header`'s size container and narrow rule (:299-314). Overridable widths in `:where()`.
- Delete `AdminNav/index.scss` (lane 5 removes the import).
- `.ladle/foundations.tsx`/`.scss`: `#fd-data-table`, `#fd-pager`, `#fd-filter-row`, `#fd-page-header` after `#fd-link-row` (:492); additions to `#fd-fields` (:441) and `#fd-link-row`. `.ladle/navigation.ts`: `usePathname()` with a comment.
- `scripts/review-screenshots.mjs`: `browser.newContext({ viewport, hasTouch: true, isMobile: true, …storageState })` with its reason in the header comment.
- Docs: `styling.md` sections named in Docs; `workshop.md`.
- Phase 2: `tokens.test.ts` rows and `mixed()`; `styling.md` finished to the decisions.

### 2. Shared lane (`mb115-shared`, Wave A, ~3h)

- `src/components/Field/`: `index.tsx` exports `FieldShell`, `FieldError`, `Required`, `fieldDescription`, and re-exports `TextField`, `SelectField`. The shell's markup is `fields.tsx:87-131` with the classes `field__label-row` and `field__required`; the asterisk `aria-hidden`, `aria-required` on the control. `text-field.tsx` and `select-field.tsx` lifted from `fields.tsx:133-183, :237-273`, `useField` re-expressed over `fieldDescription`. Keep `SuggestField`, `MultiSelectField`, `ListField` in `fields.tsx` importing from `../Field`; repoint the importers (`git grep -n "from './fields'" -- src/components/IngredientForm`); move the props types to `Field/types.ts`. Story (TextField Default, Required, WithHint, WithNote, WithError, Multiline, Disabled in a `FormProvider`; a plain `FieldShell`); doc `field.md`.
- `src/components/BusyButton/`: index, types, story, doc; adopt in EmailForm, NameForm, SignInMethods, SignOutButton, InvitationAcceptance (their busy tests stay). Plain `FieldShell` adopters: NameForm (:70-85), EmailForm (:169-184).
- `InfoTip/use-tip.ts`: `useTip(canOpen = () => true)`; delete `Combobox/tip.ts`; repoint `Combobox/index.tsx:15`, `entry.tsx:7`; Combobox tests pass unchanged.
- `src/components/FilterForm/` (soft path modelled on `CompendiumList/filter.tsx:99-107`, full on `UserList/filter.tsx:22-32`); `src/components/PageHeader/`; `Modal/route-modal.tsx` exported from `Modal/index.tsx`, `Modal/index.scss:20, 88, 110-117` to tokens, `modal.md` updated. Stories and docs.
- `src/lib/list-href.ts`; `src/app/admin/list-page.ts` and `missing-notice.tsx`, modelled on `vocabulary-page.tsx:76-120`. Adopt nothing in admin (Wave B's).

### 3. Values lane (`mb115-values`, Wave B, ~3.5h)

- Fold `VocabularyValueForm/index.tsx` into `GroupedValueForm/index.tsx`: `KINDS` gains `planet` and `zodiacSign` (documents, `deleteNote`, `renameNote`, resolver from VocabularyValueForm; no `group`); the group `SelectField` renders only when `spec.group` exists; `<FormProvider>` + `TextField name="name" autoComplete="off" required` and `TextField name="description" multiline required` replace :363-389; `BusyButton` for Save (:327-336) and Delete (:298-307); `.form__confirm`/`.form__aside` replace the local classes. Delete `VocabularyValueForm/`, its test and doc. Run codegen.
- Fold `VocabularyValueList/` into `GroupedValueList/` (`KINDS` takes `title`/`label` from `vocabularies.ts`; group column and select only where the kind has a group); `FilterForm`; `.list-frame`; `.data-table data-table--stack` with roles and `data-label`; `href.ts` on `listHref`.
- `src/app/admin/value-page.tsx` + `value-kinds.ts` (readers per kind, including `readGroups` from `categories/page.tsx:48-60` and siblings) + `value-dialog.tsx`; the five route `page.tsx` files call it. `group-page.tsx` + `group-dialog.tsx`; the three route files call it. Delete the old dialogs and route `types.ts` files.
- GroupForm: Field adoption (:183 `Required`, :294-298 helpers, the move-to select :349-369 via `FieldShell`); `HEX_COLOR` at :164; BusyButton; `index.scss` loses `__actions`, `__delete`, `__confirm`, `__required`. ChipColorField: `HEX_COLOR` at :29; `<Notice kind="warn" quiet>` at :348; a comment at :341; raw values to tokens or commented picker geometry. GroupList: stacking and `.list-frame`.
- Tests as in Tests (merged forms and lists; two page test files), each merge its own commit. Stories: PhoneDark/PhoneLight on every list and form; proposals 1d.6, 1d.7, 1d.8 on `GroupedValueList`'s story. Docs: grouped-value-form, grouped-value-list, group-form, group-list, chip-color-field.

### 4. People lane (`mb115-people`, Wave B, ~3.5h)

- `UserList/index.tsx`: a `COLUMNS` const feeding the `th`s (:199-209) and each `td`'s `data-label`; explicit table roles; `filter.tsx` → `FilterForm navigation="full"`; `.list-frame`. `index.scss`: raw values to tokens (`1.25em` ×2 at :63-64 → `$glyph-size` or a commented ratio; `1.5rem` → `$icon-size`; `1rem` → `$glyph-size`; `18rem` → `$tip-width`; `1px` stays as a hairline with a comment); `__search` (:50-55) deleted; the sticky column (:201-218) reset under the stack rule; the desktop restyle per 1d.2.
- `impersonate-button.tsx:34-42`: BusyButton with `aria-disabled` while pending; with 1d.5B a `ConfirmedAction`. `confirmed-action.tsx`: Reason via FieldShell (:106-110), BusyButton. `pause-control.tsx`: BusyButton. `history-link`, `locked-control`, `primary-admin-mark` keep their `../InfoTip/use-tip` import.
- AdminInvitations: drop the `../UserList/index.scss` import; stacking; `invite-form.tsx` adopts Field (:94-125) and BusyButton. PrivilegeLedger: `FilterForm navigation="full"`, stacking, `listHref`. ImpersonationBanner: `index.scss:9` → `$rule-heavy`, `:16` → a token or a comment on the ThemeToggle corner it mirrors, the `0px` fallback commented, `z-index` kept with a comment; stories PhoneDark/PhoneLight (signed off by touch screenshots).
- `users/page.tsx:97-104`, `privilege-changes/page.tsx:130-131`: `list-page.ts` and `PageHeader`.
- Proposals 1d.1 (A, B, C at phone), 1d.2 (A, B), 1d.5 (Impersonate A/B, Pause A/B), 1d.12 on the UserList and AdminInvitations stories. Tests: UserList (busy Impersonate; the confirmation if adopted); `tests/app/admin/users/page.test.tsx` only for the plumbing it imports. Docs: user-list, admin-invitations, privilege-ledger, impersonation-banner.

### 5. Compendium, nav and close lane (`mb115-compendium`, Wave B then Phase 2 close, ~3.5h)

- AdminNav: `index.tsx` keeps `RESOURCES` (:11-25) and renders a client `nav-links.tsx` (`usePathname`; match `pathname === href || pathname.startsWith(href + '/')` so `/admin/categories` does not mark Category Groups); remove the scss import; story Default + proposals 1d.4; `admin-nav.md` (drop "No current-page marker yet"); test as in Tests.
- `src/app/admin/page.tsx` per 1d.9, keeping a lede `<p>` for `admin.spec.ts:87-104`.
- `compendium/page.tsx`: `list-page.ts`, `PageHeader`, `RouteModal size="wide"`, `compendium-dialog.tsx` thinned. CompendiumList: FilterForm (soft), stacking, `.list-frame`, `listHref`.
- IngredientForm: `index.scss` loses `__label-row`/`__required` and its confirm classes (→ `.form__confirm`, :440); BusyButton for the four spinners in `index.tsx` and one in `reference-panel.tsx`; `compendium.test.tsx:185` → a role query.
- Combobox: proposals 1d.3 A–D on its story (a `FormField`-like qualifier with a long detail); after sign-off `index.tsx:328-339` (close on printable `onKeyDown` and when `isOpen` turns true) and `index.scss:172-185` (anchor right); raw values to tokens; test per Tests. InfoTip: raw values to tokens.
- Phase 2 close, after lanes 3 and 4 merge: the e2e edits per Tests; `testing/e2e.md`; `tasks/mb.md` (the MB.115 entry corrected, `· 16h`, handoffs into MB.119–MB.124); `sync`; the plan copied to `claude-docs/design-decisions/mb.115-plan.md` with "Decisions at sign-off (desktop)" and "(phone)" appended.

### 6. Sign-off and close (orchestrator)

Phase 1 ends with the storage states, the screenshots, the two-part comment on #572 and a stop. Phase 2: record the two decision comments; the lanes apply and delete the losing stories; verification; `estimate MB.115 16`; delete the storage-state files; commit and push; wait for the owner's word; open the PR (body as in Phase 2); `status MB.115 "In Review"` and the link.

### Risks to watch

- **Table semantics under `display` changes**: explicit roles on every stacking table; check in Safari during the owner's look (`attr() / ''` falls back to a doubled label in Safari 16.4, acceptable).
- **The 833-line UserList test**: only 1d.1A and 1d.2A leave its DOM and column indices intact; B or C, or the merged column, cost 1–2h of test rework, stated in the sign-off comment beside the call.
- **`position: sticky` inside `overflow-x: auto`** works only while the frame scrolls; under the stack rule it must be `static`. `container-type: inline-size` adds no layout containment, but check the `position: fixed` tips still land.
- **`.admin-layout` moving to primitives**: three stories rely on the class; primitives load globally in Ladle (`.ladle/primitives.scss`); verify the story frame once `AdminNav/index.scss` is gone.
- **Codegen**: moving `graphql()` documents regenerates `src/gql`; run it in lane 3 before committing.
- **The `/admin` measure test**: a redesigned index keeps a `<p>` in `main`.
- **Peers**: `/home/node/worktrees/cs-scope` (MB.239) and others belong to other sessions; never touch them, and re-check `git log` on the feature branch before pushing.

---

## Sign-off decisions

### Desktop

**Desktop sign-off.** The owner's decisions on the desktop part, made on the review page and settled in chat.

#### Calls

1. **The user list at desktop**: A, the seven columns restyled (`ProposalDesktopColumnsA`).
2. **The admin column width**: `$wide-column` widens to 80rem for the whole admin area.
3. **Table rows**: banded (`ProposalRowsBanded`).
4. **Impersonate**: confirms first (`ProposalImpersonateConfirmB`).
5. **Pause Admin Changes**: confirms first (`ProposalPauseConfirmB`), against the recommendation. This reverses the MB.63 call that pausing needs no confirmation, so its record gains a note in this PR.
6. **The Reason fields**: the hint goes in an InfoTip, and the label stays "Reason". A field is optional unless it is marked required, so no label says "(Optional)". Option B's stories never passed the hint text in, which is why B showed no line; the live user list does show it, and that line goes now.
7. **The qualifier tooltip**: right-aligned, closing at the first keystroke and when the list opens (`ProposalTipRight` with `ProposalTipCloseOnTyping`).
8. **AdminNav's current-page marker**: weight and an offset underline (`ProposalNavWrap`). MB.122 reviews the nav as a whole.
9. **The `/admin` index**: a table of contents (`ProposalIndexContents`), each list grouped with its group list: Compendium; Categories (Categories, Category Groups); Forms (Forms, Form Groups); Deities (Deities, Deity Traditions); Astrology (Planets, Zodiac Signs); People (Users, Privilege Changes).

#### Copy

The proposed copy, except:

- **Compendium list and user list, no match**: the sentence names the filters in use.
- **Missing-address notice**: "No category has that address. It may have been renamed or deleted, so search for it in the list.", with each page's own noun.
- **Category delete**: "Covens' ingredients and spells filed under it stay in their lists, but can no longer be filtered by it." Deleting a category removes nothing of a coven's: an entry keeps its link and stops reading the category.
- **Zodiac sign buttons**: the long form, Add Zodiac Sign, Save Zodiac Sign, Delete Zodiac Sign.
- **The held-back labels** change with their e2e locators.
- **Reason label**: stays "Reason" (see call 6).

#### Smaller questions

- 1px stays a plain edge, with no hairline token.
- Stop Impersonating gains a busy state in Phase 2, as a sub-hour fix.
- Row headers stay with MB.124.

Not yet checked by hand: Safari, Firefox, and the impersonation banner on the host.

### Phone

**Phone sign-off.** The owner's decisions on the phone part, made on the review page and settled in chat.

1. **The user list at phone width**: cards (`ProposalPhoneCardsA`).
2. **AdminNav at 375px**: a menu that opens a grouped list of links, grouped as the `/admin` index is (desktop call 9). It replaces the wrapping row at phone width. The owner picked the jump menu; it is built as a disclosure of real links instead of the drawn select, so it navigates without JavaScript and is announced as navigation. MB.122 may revisit it.
3. **The filter at phone width**: stacked (`ProposalFilterStacked`).
4. **The Add button at 375px**: full width (`ProposalAddFullWidth`), against the recommendation.
5. **The modal at phone width**: inset (`ProposalModalInsetDark` and `Light`).
6. **The tooltip and the index on a phone** follow desktop calls 7 and 9.

Not yet checked by touch: every control in a card, the tips against the table frame, the colour picker in the group modal, the stacked filter's busy button, and the banner's Stop with the page scrolled.

## DRY audit and consolidation (2026-10-12)

An audit of the branch for repetition (Sass, components and admin pages, tests,
stories and docs) found the same shapes written out by hand across the lanes.

**The owner's call (2026-10-12):** everything the audit found folds into
MB.115. It is not split into new tasks, and **no lint guard** is added against
the pattern: the findings are recorded here for the next section review to brief
against. Behaviour does not change anywhere. The acceptance criterion "No
component or Sass partial in the section is a copy of another; a shared piece is
one component, named in the PR body" is read literally.

### The pattern behind the findings

The dominant failure was not copy-paste between lanes. It was **a lane creating
the shared piece and the next file, or another lane, not using it**: the
`icon-button` mixin was used in 2 of 8 places; `joinAnd` and `plural` in
`src/lib/text.ts` were rewritten 3 and 5 times; `PagePosition`, `PagerHrefs`,
`PagerCursor` and `GroupColors` were declared again; `discard-guard.tsx` was
copied by hand once; `$motion-short` was typed out as `150ms` beside a comment
naming the combobox. Two inconsistencies you could see fell out of it: "Coven
Creation" against "Coven creation" in the privilege filter and its table (B18),
and the InfoTip focus sentence in `styling.md` (C22). The TabbedPage skeleton
also stood at the wrong heights because it typed `2.5rem` and `10rem` instead
of `$control-height` and `$filter-choice-width`: it was shorter than the
control it stood in for.

### Findings and what replaced them

One line each: the id, what repeated, how many copies, and the shared piece
that replaced it, or "left" with the reason.

**A. Sass**

| #   | What repeated                                                             | Copies | Replaced by                                                                                         |
| --- | ------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| A1  | A square icon button written by hand beside the `icon-button` mixin       | 6      | `icon-button` with `$radius` and `$cursor`, and `icon-button-remove`                                |
| A2  | A tip bubble placed above its anchor, with the capped width               | 6      | `tip-above($align, $layer, $capped)`                                                                |
| A3  | A list with its bullets removed                                           | 6+     | `list-reset`                                                                                        |
| A4  | A column stack with `gap: space(5)`                                       | 5      | `.list-frame` on the TabbedPage panel, skeleton and AdminInvitations root; `stack($step)`           |
| A5  | Text cut off with an ellipsis                                             | 5      | `truncate`                                                                                          |
| A6  | The visually hidden clip                                                  | 4      | `visually-hidden`, which the class includes                                                         |
| A7  | The phone-width page action spanning the line                             | 4      | The `.page-header` action child grows; three component rules deleted                                |
| A8  | The greyed busy state, and the `0.55` literal in 7 places                 | 3 + 7  | `busy-faded` and `$opacity-disabled`                                                                |
| A9  | A button with its box stripped                                            | 3      | `button-reset`                                                                                      |
| A10 | The fade-in on arrival, two keyframes                                     | 2      | `arrived` and the one `list-frame-fade-in` keyframe                                                 |
| A11 | Table row tweaks: roomy centred rows, no-wrap rows                        | 2 + 2  | `.data-table--roomy` and `.data-table--nowrap` (`data-table-roomy`, `data-table-nowrap`)            |
| A12 | UserList rebuilding the card-action grid                                  | 1      | `data-table__card-action` on the Impersonate cell                                                   |
| A13 | A chevron that turns over when open                                       | 2      | `disclosure-chevron`                                                                                |
| A14 | Smaller pairs (tip wrapper, floating panel, skeleton, confirm stack, ...) | 2 each | `tip-anchor`, `floating-panel`, `field-box`, and one home each                                      |
| A15 | Literals that repeat a token (`150ms`, `2px`, `28rem`, `color-mix` x2)    | many   | `$motion-short`, `$rule-medium`, `$narrow-column`, `$fill-quiet`, `$hairline`; `$tip-fade` moved in |
| A16 | `(prefers-color-scheme)` and `(forced-colors)` queries with no mixin      | 4      | `color-scheme-light` and `forced-colors` beside `reduced-motion`                                    |
| A17 | `$breakpoint-desktop`, unused                                             | 1      | Deleted                                                                                             |
| A18 | Raw `z-index` layers                                                      | 10+    | Left: MB.124 owns the site-wide layer map; named in the PR body                                     |

**B. Components and admin pages**

| #   | What repeated                                                               | Copies | Replaced by                                                                                                                               |
| --- | --------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | The admin page title `'X — Admin — Sorrel & Salt'`                          | 12     | `title.template` in `src/app/admin/layout.tsx`                                                                                            |
| B2  | Draft state in the filters                                                  | 6      | Closed, nothing built: the filters apply on change through `useApplyFilter()`, so no draft state is left to extract                       |
| B3  | The text search field                                                       | 6      | `SearchField` (`src/components/Field/search-field.tsx`), adopted in all six filters                                                       |
| B4  | The data table scaffold                                                     | 6      | `StackTable` (`src/components/DataTable/`)                                                                                                |
| B5  | Tab layouts and `@action/default.tsx` differing by a key                    | 5 + 5  | `tabbedLayout(key)` in `src/app/admin/tabbed-layout.tsx` and one `no-action.tsx`                                                          |
| B6  | `n === 1 ? one : many`                                                      | 5      | `plural` from `src/lib/text.ts`                                                                                                           |
| B7  | Capitalise the first letter                                                 | 4      | `capitalise` in `src/lib/text.ts`                                                                                                         |
| B8  | The server-issue loop                                                       | 4      | `placeServerIssues` in `src/lib/graphql-failure.ts`                                                                                       |
| B9  | The Save, Cancel, Delete row                                                | 4      | `FormActions` (`src/components/Field/`)                                                                                                   |
| B10 | A page path typed twice                                                     | 4      | Each `href.ts` exports its path                                                                                                           |
| B11 | `PagePosition`, `PagerHrefs`, `PagerCursor` declared again                  | 4/6/2  | The existing types imported                                                                                                               |
| B12 | The Delete question, its precedence and its refusal alert                   | 3 + 2  | `ConfirmQuestion` (`src/components/Modal/`)                                                                                               |
| B13 | `and()` as `joinAnd`, and the "No X match" builders                         | 3      | `joinAnd` and `noMatchText` in `src/lib/text.ts`, one empty-state wording                                                                 |
| B14 | The three pages' edit-place and Add action code                             | 3      | The edit-place helper and `AddAction` in `src/app/admin/list-page.tsx`                                                                    |
| B15 | Kind copy tables kept in 3 to 5 places                                      | 3-5    | One kind table per vocabulary family; `allGroups` imported                                                                                |
| B16 | The reference GraphQL selection                                             | 3      | `fragment ReferenceRow`                                                                                                                   |
| B17 | The nomenclature label lookup                                               | 3      | `labelOf` from `IngredientForm/options.ts`                                                                                                |
| B18 | Enum option lists re-typed, labels drifted                                  | 3      | One `{value, label}[]` per enum                                                                                                           |
| B19 | The hydration-fallback type-ahead                                           | 2      | `FilterSelectField` (`src/components/Field/filter-select-field.tsx`), a native select until hydrated, then the type-ahead                 |
| B20 | IngredientForm summaries two ways, `fold`/`texts` twice                     | 2-3    | `variantSummary` built from the `summaries.tsx` helpers, one `FIELD_NOUNS`, `useFoldIds` and `FoldFlag`; `fold` and `texts` exported once |
| B21 | Runtime arrays repeating type unions                                        | 2 each | `as const` arrays that derive the unions                                                                                                  |
| B22 | `'new' \| { edit }` and its encoding                                        | 3      | `ListDialog` and `dialogParams` in `src/lib/list-href.ts`                                                                                 |
| B23 | `colorDark?/colorLight?` spelled out                                        | 5      | `Partial<GroupColors>`                                                                                                                    |
| B24 | The Reason field                                                            | 2      | `ReasonField` (`src/components/Field/`)                                                                                                   |
| B25 | Types declared inside `.tsx` files                                          | ~8     | Each component's `types.ts`                                                                                                               |
| B26 | `oneOf` search-param guard, `single(x)?.trim()`, "paused and not primary"   | 3-4    | `oneOf` in `src/lib/search-params.ts`; `lock.ts` as the one source                                                                        |
| B27 | `RemoveIcon` equal to the combobox's `ClearIcon`                            | 2      | `RemoveIcon` re-exports it                                                                                                                |
| B28 | `GroupForm` create/update branches, the chip-or-plain cell                  | 2      | `GroupForm` on `defineKind`; `GroupChip` (`src/components/DataTable/`)                                                                    |
| B29 | Older hover tips hand-writing `useTip`: history link, crown, locked control | 3      | Left: `IconTip`'s placement would visibly differ, so they stay on `useTip`                                                                |
| B30 | The `outer ?? value` provider in `ListBody` and `TabPanel`                  | 2      | Left: the two go-logics differ, so a shared provider would hide the difference                                                            |
| B31 | `GroupAction` and `ValueAction`                                             | 2      | Left as thin wrappers over `AddAction`                                                                                                    |
| B32 | `FieldName` types                                                           | 2      | Left in two forms: each is derived from a value in its own file                                                                           |

**C. Tests, stories and docs**

| #   | What repeated                                                 | Copies | Replaced by                                                                                                                         |
| --- | ------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| C1  | The jsdom `<dialog>` stub                                     | 9      | `tests/support/setup-dom.ts`                                                                                                        |
| C2  | The IngredientForm test harness rebuilt per file              | 2-7    | `tests/support/ingredient-form.tsx`, `tests/support/interact.tsx` (`press`, `choose`, `type`), additions to `ingredient-lookups.ts` |
| C3  | The list filter test rows                                     | 3-5    | `FILTER_ROWS` and `drawnOnServer()` in `tests/support/filter-form.tsx`; per-list rows stay in each test                             |
| C4  | AdminInvitations re-implementing `expectGuardedWaysOut`       | 1      | The helper called, with an optional `cancel` getter                                                                                 |
| C5  | Type-ahead option narrowing asserted outside its owner        | 3      | The two narrowing tests dropped; Combobox's type-ahead test owns it                                                                 |
| C6  | `hrefs(links)` filter; a block re-asserting the Combobox test | 2      | Left in part: kept where a test asserted wiring the owner's test did not; the duplicated Combobox block dropped                     |
| C7  | The admin frame wrapper in stories                            | 9      | `.ladle/admin-frame.tsx` (`AdminFrame`, `AdminTabbedFrame`)                                                                         |
| C8  | Fixture data in stories                                       | 3-5    | `.ladle/fixtures.ts`                                                                                                                |
| C9  | "Press a button by its text" effect                           | 3      | `.ladle/press.ts` (`press`, `usePressOnMount`)                                                                                      |
| C10 | Phone Dark and Light story pairs                              | 38     | Left: repo convention that pre-dates the branch                                                                                     |
| C11 | The unsaved-changes question                                  | 6      | `modal.md`, "Unsaved changes"; form docs keep a line and a link                                                                     |
| C12 | The filter's "disabled while it matches" rule                 | 6      | `filter-form.md`, "Contracts"; list docs keep a line and a link                                                                     |
| C13 | "Under 28rem every row stacks"                                | 5      | `styling.md`, "A narrow form stacks its buttons"                                                                                    |
| C14 | The `.filter-row` layout                                      | 4      | `filter-form.md`, "Styling"; `styling.md` keeps a line and a link                                                                   |
| C15 | The type-ahead width rule                                     | 3      | `filter-form.md`, "Styling", "A choice takes one width"                                                                             |
| C16 | Soft and full navigation with the `pageshow` rule             | 4      | `list-frame.md`, "Contracts"; see filter section for the filter and user-list docs                                                  |
| C17 | The page-header action spanning the line                      | 3      | `page-header.md`, "Styling"                                                                                                         |
| C18 | The ConfirmOverlay visuals                                    | 2      | `modal.md`, "Asking over the form"; `styling.md` keeps the tokens                                                                   |
| C19 | The placeholder rule                                          | 3; 5   | `field.md`, "Contracts"; "keeps its placeholder after the chips" in `combobox.md`                                                   |
| C20 | "A field is optional unless it carries the required mark"     | 4      | `field.md`, "Contracts"                                                                                                             |
| C21 | `aria-invalid` draws the error edge                           | 2      | `styling.md`, "Form fields"; `field.md` keeps a clause and a link                                                                   |
| C22 | The InfoTip hint rule, and the contradicting focus sentence   | 4      | `info-tip.md`, "Behaviour"; the `styling.md` sentence corrected to match the code and its test                                      |
| C23 | Chips inside the control, Backspace takes the last            | 3      | `combobox.md`; `ingredient-form.md` keeps its `aria-label` naming                                                                   |
| C24 | `value-page.test.tsx` described twice                         | 2      | `grouped-value-list.md`, "Testing"                                                                                                  |

### The shared pieces, by location

- **Sass**, `src/scss/_mixins.scss`: `list-reset`, `truncate`, `visually-hidden`,
  `button-reset`, `busy-faded`, `tip-above`, `disclosure-chevron`,
  `icon-button` (with `$radius`, `$cursor`), `icon-button-remove`, `arrived`,
  `data-table-roomy`, `data-table-nowrap`, `color-scheme-light`, `forced-colors`.
  Tokens in `_variables.scss`: `$opacity-disabled`, `$fill-quiet`, `$hairline`,
  `$tip-fade`. `_primitives.scss`: `.data-table--roomy`, `.data-table--nowrap`,
  `.spoken-separator`, one fade keyframe.
- **`src/lib`**: `text.ts` (`capitalise`, `noMatchText`, with `joinAnd` and
  `plural` now imported); `search-params.ts` (`oneOf`); `hydrated.ts`
  (`useHydrated`); `list-href.ts` (`ListDialog`, `dialogParams`);
  `graphql-failure.ts` (`placeServerIssues`).
- **`src/components/Modal/`**: `ConfirmQuestion`, beside `DiscardQuestion`.
- **`src/components/Field/`**: `FormActions`, `ReasonField`, `SearchField`.
- **`src/components/DataTable/`**: `StackTable`, `GroupChip`.
- **`src/components/IngredientForm/`**: `FIELD_NOUNS` in `values.ts`,
  `useFoldIds` and `FoldFlag`, `labelOf` in `options.ts`, `RemoveIcon`.
- **`src/app/admin/`**: `layout.tsx` (`title.template`), `tabbed-layout.tsx`
  (`tabbedLayout`), `no-action.tsx`, `list-page.tsx` (the edit-place helper,
  `AddAction`).
- **Filter pieces**: `SearchField` and `FilterSelectField` in `src/components/Field/`; `useApplyFilter()` from `src/components/FilterForm`; `USERS_PATH`, `PRIVILEGE_CHANGES_PATH`, `INVITATIONS_PATH` and `COMPENDIUM_PATH` from each `href.ts`; `ROLE_LABELS` and `PRIVILEGE_LABELS` from `UserList/roles.ts` and `PrivilegeLedger/privileges.ts`; `tests/support/filter-form.tsx`.
- **Tests**: `tests/support/setup-dom.ts`, `interact.tsx`,
  `ingredient-form.tsx`, additions to `msw/ingredient-lookups.ts`.
- **Workshop**: `.ladle/admin-frame.tsx`, `fixtures.ts`, `press.ts`, `types.ts`.

The three corrections people could see: the TabbedPage skeleton's heights, the
"Coven Creation" label, and the InfoTip focus sentence.

### Filter section

The filter lanes had already redesigned the filters when the audit's filter findings were worked, which settled most of them. B2 closed with nothing built: each filter's fields apply on change through `useApplyFilter()`, and only the search text keeps state, so no draft state was left to extract. B3 was met by adopting `SearchField` in all six filters. B19 became `FilterSelectField`, replacing the five hand-drawn filter selects and the FilterForm story's. The filters import their path (`USERS_PATH`, `PRIVILEGE_CHANGES_PATH`, `INVITATIONS_PATH`, `COMPENDIUM_PATH`) and their labels from the list's own files (B10, B18), and `oneOf` replaces CompendiumList's hand guard. C3 is `FILTER_ROWS` and `drawnOnServer()`; C5 dropped the two narrowing tests.
