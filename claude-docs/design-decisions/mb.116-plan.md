_The scoping plan approved on 2026-10-10 for MB.116 (#573), kept as approved, with the decisions taken at sign-off appended at the end._

# MB.116 — Design review: the sign-in and account pages (absorbing MB.117)

## Context

MB.114 settled the foundations (palette, `space()`/`type-size()`/`radius()` scales, the button variants, the form-field and notice primitives, `.header`/`.eyebrow`/`.lede`) and merged on 2026-09-30. Each section is now designed by its own review. MB.116 reviews the pages around signing in: `/` (Welcome), `/sign-in` (SignInPanel, with the last-used mark), `/account` (name, address, sign-in methods, Sign Out), `/account/email` (EmailForm) and the 403 not-authorized page. **MB.117, the sign-in methods on `/account`, is the same page, so it folds into this task** (the owner's suggestion, 2026-10-10): its three criteria become MB.116's and its issue is retired as merged. MB.115 (admin) is the neighbouring section; this plan keeps it in view so the two land as one design.

The owner's brief: cohesion across the section, good design and UX, readability, accommodations for blindness (screen readers, keyboard) and colour-blindness (nothing told apart by hue alone); DRY frontend code and styling; pieces built reusable for later sections where reasonable; reasonable browser support; the section's copy reviewed for clarity and consistency; later design-review tasks told what this one leaves them.

**What is wrong today** (verified in source):

- The centred full-height page frame is written five times in the section (`.welcome-page`, `.sign-in-page`, `.email-page`, `.account-page`, `.not-authorized-page`) and once outside it (`.invitation-page`); `/account`'s whole frame lives in `SignInMethods/index.scss` though `src/app/account/page.tsx` owns the markup; `28rem` is restated about seven times; Welcome's and NotAuthorized's columns are identical, as are EmailForm's and InvitationAcceptance's.
- Provider brand hues are inline hex in `SignInPanel/index.scss:123-171`, `SignInPanel/icons.scss:19` and `UserList/index.scss:126-134` (copies). In the light theme the Google button's edge (`#dadce0`) measures 1.13:1 against the parchment page and Microsoft's (`#8c8c8c`) 2.78:1, under WCAG 1.4.11's 3:1, so a white button nearly vanishes on the light page. UserList's provider circle (`.user-list__provider`) is the shape the sign-in-methods rows also want.
- SignInPanel's error is a bespoke box (`0.25rem` radius, `0.8rem` type, no warning triangle) where every other page uses `.notice--error`; its doc claims a `$surface-card` ground it does not set.
- Raw values off the scales: `padding: 2rem 1rem` on four frames; `gap: 1.25rem` and `font-size: 1.125rem` in Welcome; `0.8rem` notes in SignInPanel and SignInMethods; `0.625rem`, `0.75rem`, `0.5rem 0.75rem` gaps in SignInMethods; `max-width: 32rem`/`22rem`/`14.5rem` in sign-in.
- Accessibility defects on `/account`: the section nav's `ul` never clears `typography-base`'s ◆ `li::before`, so a marker hangs against each link; the Sign-In Methods `section` has no `aria-labelledby` (the other two do) because its `h2` lives inside the component; bare `section` margins from `layout-base` stack on the column gap; a failed link's error lands at the top of the section, not beside the provider, and `?error=` does not say which provider failed; the last remaining method shows no control and no reason.
- EmailForm sends with no `aria-busy`/spinner, unlike NameForm's save (the form-save rule: spinner while saving).
- Across the frontend: `<p className="notice notice--error" role="alert">` + `<output className="notice notice--success">` is hand-written in 22 files; a `readFailure()` that unpacks graphql-request's `ClientError` into `{ field | alert }` is copied in 10; the sentence "That didn't work. Please try again." is declared in 11; the "Not available right now." note with its `aria-disabled`/`aria-describedby` wiring is written in SignInPanel and SignInMethods.
- No e2e runs axe on `/account/email` at all, nothing checks sideways scroll at 375px, and the light theme is scanned only on the last-used badge.

**Shape of a section review**, from MB.114's issue (#571): build the proposals as workshop stories → comment "awaiting sign-off" listing what is drawn side by side → the owner reviews in the workshop and the running app (both themes, 375px) and decides → decisions recorded as an issue comment → the signed-off design applied → PR into staging.

## Decisions already taken (owner, 2026-10-10)

- **Add stylelint** to carry "no raw hue outside `_variables.scss`", on the condition it never conflicts with the database carrying colours. It does not: group colours are hexes on `category_groups` rows, reach the page as inline `--chip-dark`/`--chip-light` custom properties set from data, and the seeded pairs are in `src/db/seed/category-groups.ts` (TypeScript). A Sass linter sees none of them; `ChipColorField/index.scss:327`'s hex is in a comment, which `color-no-hex` ignores.
- **Ride-alongs outside the section go in this PR**, named in its body: InvitationAcceptance adopts the page frame; UserList adopts the brand map and the shared provider mark (its Google and Microsoft circle edges darken to the edges that clear 3:1); AdminNav adopts `.link-row`; every copy of the notice markup and the failure reader across the frontend adopts the shared piece (the owner: "review it", not "leave it to MB.115").
- **Stop for sign-off** after the proposals are built (MB.114's shape), with the app and the workshop running so the owner sees them live.
- **MB.117 merges into MB.116.** Mechanics in "Board" below.
- **Testing follows the test-reduction session's final ten rules** (app-d8, 2026-10-10, overriding the repo's current rules where they differ; they land in `claude-docs/testing/layer-ownership.md` when that lane merges): (1) functional requirements only, no tests of the harness, scripts, package.json wiring, another test's helper, or code only Claude agents use (the screenshot script is untested); (2) state, never copy, except where the words are the only rendering of a state (the "Your only sign-in method" reason line qualifies); locators keep exact names; (3) a regression test needs a shipped bug; (4) no presentation in jsdom, story and axe own it, but a real-browser 375px scroll-width measurement and a one-assertion-per-theme token-contrast check are allowed; (5) one row per shared path in a config table; (6) each layer proves only what it adds; (7) migration data tests retire in production; (8) no guard a linter can carry; (9) e2e proves what only a real server can, one axe scan per page; (10) SQL text only as an EXPLAIN precondition. For this task: fold checks into existing specs, one assertion per page template, the light-mode axe once per template, no new test file except the one Sass contrast table.
- **Browser baseline**: Next's default modern targets (`node_modules/next/dist/shared/lib/modern-browserslist-target.js`: Chrome, Edge and Firefox 111, Safari 16.4, "baseline widely available" as of 2025-10-01). Turbopack's Lightning CSS lowers anything newer (it already lowers `light-dark()`, `styling.md:282`). Everything the section uses or adds sits inside it: `:where()`, `:has()`, `@container`, `dvh`, `color-mix()`, unprefixed `mask`, `translate`, `inset-block-start`, `scroll-margin-top`, `forced-colors`, `prefers-contrast`, `prefers-reduced-motion`. This is written into `styling.md`'s Binding rules as the rule every later review checks new CSS against, and the Chromium-only Playwright projects are noted as the reason the owner's own Safari and Firefox look at the dev server is part of each sign-off.

Branch: `feature/mb.116-design-review-sign-in-account` off fresh `origin/staging` (`/app` is on MB.213's branch, fully merged).

## Phase 1 — Grow the foundations, build the proposals, stop for sign-off

### 1a. Primitives and tokens (`src/scss/`), shown on the Foundations page

**`.page-frame`** in `_primitives.scss` (after `.page-header`): the centred full-height frame of a page with no AppShell; `--narrow` caps children at `$narrow-column`; `__section` and `__rule` are a titled section and the hairline between two.

```scss
.page-frame {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: space(6);
  min-height: calc(100dvh - #{$top-inset});
  padding: space(6) space(4);
}
.page-frame > * {
  margin-block: 0;
} // gap alone spaces the column: beats `body section`'s and `.page-header`'s margins
:where(.page-frame) > * {
  width: 100%;
  max-width: $measure;
} // zero specificity, so a component's narrower column still wins in the app
:where(.page-frame--narrow) > * {
  max-width: $narrow-column;
}
.page-frame__section {
  display: flex;
  flex-direction: column;
  gap: space(3);
  scroll-margin-top: calc(#{$top-inset} + #{space(4)});
  > h2 {
    margin: 0;
  }
}
.page-frame__rule {
  border: 0;
  border-top: 1px solid $text-muted;
}
```

Cascade note: in the app, primitives compile as `body .x` (0,1,1) and beat a component's single class; in Ladle they compile as `:where(.ladle-story-frame) .x` (0,1,0) and source order decides. Any primitive rule a component must override is wrapped in `:where()`, so `.sign-in-panel`'s 22rem wins in both. Verify in the app, not only the workshop.

**`.link-row`**: a wrapping row of links that is not a bulleted list (`display:flex; flex-wrap:wrap; gap: space(2) space(5); margin:0; padding:0; list-style:none; li { margin:0 } li::before { content:none }`). `AdminNav`'s `.admin-nav__list` (the same rule) and the account nav adopt it.

**`.provider-mark`** (+ `--google|discord|facebook|microsoft`): a 1.5rem circle on the brand's own ground with its mark inside, lifted from `UserList/index.scss:105-139` and coloured from the brand map. Used by UserList's provider column and the sign-in-methods rows.

**Tokens** in `_variables.scss`: `$narrow-column: 28rem` (the forms' column) under "Motion and layout"; and a "Third-party brand colours" block, a compile-time map with an accessor (not custom properties: the hues do not follow the theme and nothing reads them at runtime; a theme-dependent part is `(dark: …, light: …)` and the accessor returns `light-dark()`, which Lightning CSS lowers to the baseline). Needs `@use 'sass:meta'`.

```scss
$brand-palettes: (
  'google':    (fill: #ffffff, ink: #1f1f1f, edge: #747775, hover: #e8eaed),
  'discord':   (fill: #5865f2, ink: #ffffff, hover: #4752c4),
  'facebook':  (fill: #0866ff, ink: #ffffff, hover: #0653d4),
  'microsoft': (fill: #ffffff, ink: #000000, edge: <owner call, 1d.3>, hover: #e0e0e0),
);
@function brand-color($brand, $part) { … @error on an unknown brand or part, worded as badge-token() … }
```

Consumers: `SignInPanel/index.scss` loops `@each` over the map; `icons.scss` takes `brand-color('facebook','fill')`; `.provider-mark` takes each `edge` and `fill`. SVG fills inside `icons.tsx` are artwork and stay. The "hex literals on purpose" comments (`icons.tsx:9-10`, `index.scss:110-121`, `UserList/index.scss:~108`) point at the map instead. The greyed state stays `.btn[aria-disabled]`'s dashed edge plus the note: unavailable is told apart by shape and words, not hue.

**Measured** (`contrastRatio`, `src/lib/contrast.ts`; recorded in styling.md):

| Pair                                                    | Dark page `$soot`                                             | Light page `$parchment` |
| ------------------------------------------------------- | ------------------------------------------------------------- | ----------------------- |
| Google edge `#dadce0` (today)                           | 13.62                                                         | **1.13 fails**          |
| Google edge `#747775` (Google's current "light" button) | 4.13                                                          | 3.74                    |
| Microsoft edge `#8c8c8c` (today)                        | 5.56                                                          | **2.78 fails**          |
| Microsoft edge `#808080`                                | 4.74                                                          | 3.26                    |
| Microsoft dark button `#2f2f2f` fill, light theme only  | —                                                             | 11.05 (ink 13.39)       |
| Discord / Facebook fill on page                         | 4.06 / 3.88                                                   | 3.80 / 3.98             |
| Discord / Facebook hover fill on page                   | 2.91 / 2.85 (hover is not a 1.4.11 state; focus has the ring) | 5.30 / 5.43             |
| Inks on fills (both themes)                             | Google 16.48 · Discord 4.61 · Facebook 4.82 · Microsoft 21.00 | same                    |
| Focus ring `$text-primary` on page                      | 14.77                                                         | 13.41                   |

### 1b. Shared components (reusable by every later section)

- **`Notice`** (`src/components/Notice/`, doc `claude-docs/components/notice.md`, story): `<Notice kind="error" | "warn" | "success" | "plain">children</Notice>` renders the `.notice` primitive with the role the kind implies — `error` and `warn` as `<p role="alert">`, `success` as `<output>`, `plain` as `<p>` — plus an optional `id` and `className`. The role is what makes a late-arriving message announced, so pairing it with the kind in one place is the point (styling.md, "Form fields"). All 22 hand-written copies adopt it (list: `grep -rl 'className="notice notice--error" role="alert"' src`), the admin pages among them.
- **`readGraphqlFailure(error, fields)`** and **`GENERIC_FAILURE`** in `src/lib/graphql-failure.ts` (client-safe), lifted from `EmailForm/index.tsx:42-52`: `ClientError` → `{ field: { name, message } } | { alert }`, taking the field names the form cares about; `Failure` in `src/lib/types.ts`, the three local twins (`EmailForm/types.ts:19-24`, `NameForm/types.ts:6`, `AdminInvitations/types.ts:21`) deleted. All 10 readers and 11 sentence copies adopt it (`grep -rln "That didn't work. Please try again." src`; `grep -rl ClientError src/components`). Where a reader differs (InviteForm's several fields, IngredientForm's `values.ts`), the shared one takes a field list and the caller maps; a reader that cannot be expressed stays and says why in a comment.
- **`ProviderMark`** (`src/components/ProviderMark/`): the icon inside `.provider-mark`, from `SignInPanel/icons.tsx`'s marks via one `PROVIDER_MARKS: Record<ProviderId, …>` exported from `icons.tsx` (the Facebook variant with and without its chip is a prop). UserList's `PROVIDER_LOGOS` and SignInPanel's `PROVIDER_ICONS` collapse onto it.
- **`UNAVAILABLE_NOTE`** in `src/lib/social-providers.ts` and a `ProviderUnavailableNote({ id })` beside `ProviderMark`, used by SignInPanel and the sign-in-methods row.
- **`scripts/review-screenshots.mjs`**: connects to `PLAYWRIGHT_WS_ENDPOINT`, takes a list of `{ path, name }` and shoots each at 375×812 and 412×915 in both themes (`emulateMedia`) into `.reports/<task>-screenshots/`; a cookie or storage-state file option for signed-in pages. Every later review reuses it; documented in `claude-docs/workshop.md` and `commands.md`.
- **`assertNoSidewaysScroll(page)`** beside `assertNoAccessibilityViolations` in `tests/e2e/axe.ts` (no test of the helper).

### 1c. Pages adopt the pieces

| Page                                              | `main` classes                  | Deleted                                                  | Kept                                                                                                                                                |
| ------------------------------------------------- | ------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/` (`src/app/page.tsx:14`)                       | `page-frame welcome-page`       | `.welcome-page` rule, `.welcome`'s width caps            | `.welcome-page` class as Backdrop's `body:has(.welcome-page)` hook (`Backdrop/index.scss:66-68`); `.welcome` keeps its column, gap on scale         |
| `/sign-in` (`sign-in/page.tsx:24`)                | `page-frame page-frame--narrow` | `.sign-in-page`, `.sign-in-panel__error`                 | `.sign-in-panel` (22rem is its own column)                                                                                                          |
| `/account` (`account/page.tsx:31`)                | `page-frame page-frame--narrow` | every `.account-page*` rule in SignInMethods' stylesheet | header a plain `.page-header`; nav `ul.link-row`; sections `.page-frame__section` with `aria-labelledby`; rules `.page-frame__rule`; intros `.lede` |
| `/account/email` (`account/email/page.tsx:20,38`) | `page-frame page-frame--narrow` | `.email-page`, `.email-page__nav`, `.email-form`'s width | the `h1` becomes a `.header`                                                                                                                        |
| 403 (`forbidden.tsx:8`)                           | `page-frame`                    | `.not-authorized-page`, `.not-authorized`'s widths       |                                                                                                                                                     |
| `/invite/[token]` (`invite/[token]/page.tsx:45`)  | `page-frame page-frame--narrow` | `.invitation-page`, `.invitation-acceptance`'s widths    | ride-along                                                                                                                                          |

No test keys on any of these class names (verified). **Section heads become `.header`** with a `.lede`: SignInPanel, EmailForm's `h1`, NotAuthorized, and `/account`'s three `h2`s. **The page owns all three heads on `/account`**: the "Sign-In Methods" `h2` and intro move from `SignInMethods` into `page.tsx`, so the third section is a named region like the other two.

**The sign-in-methods rows (MB.117's criteria)**: `SignInMethods` keeps its list and notices; each `<li>` is a `ProviderRow` (`src/components/SignInMethods/provider-row.tsx`) in one of three states, each told apart without colour:

- **linked**: `ProviderMark` + label + `Remove X` (`.btn`, since removing a way in is not destroying data; the owner may prefer `.btn--destructive`, drawn both ways); with one method left, no Remove and a `.meta` line "Your only sign-in method" so the row says why (criterion);
- **addable**: mark + label + `Add X` (`.btn`);
- **unavailable**: mark (greyed with the button) + label + `Add X` with `aria-disabled` and the shared unavailable note.

A failed link's error sits in the row it concerns: `handleAdd` sets `errorCallbackURL` to `${ACCOUNT_PATH}?provider=${id}` so the callback lands with `?error=&provider=`; the page reads both (`linkErrorMessage(params.error)`, `isRosterProvider(params.provider)`) and passes `error: { providerId, message }`; the row renders `<Notice kind="error">` beneath its controls, and a message with no known provider falls back to the section-level notice as today. A removal's success stays a section-level `<Notice kind="success">` (the row is gone). Drawn with and without a status word per row (MB.71 chose none; the owner re-decides).

### 1d. Contested calls, drawn side by side in the workshop for the owner

1. **A panel behind the forms or bare?** `/sign-in`, `/account`'s sections and `/account/email` on a `.panel` versus today's bare column; recommendation: bare for `/` and 403 (prose), panel for the three form pages.
2. **The last-used mark**: hanging off the button's corner (today, forcing a `2rem` gap and risking a clip at 375px) versus inline at the end of the label (the `aria-label` already reads "…, last used").
3. **Microsoft's white button in the light theme**: edge `#808080` (3.26:1, one step off Microsoft's grey) versus Microsoft's own dark button (`#2f2f2f`, 11:1) in the light theme only. Google takes its current guidance (`#747775` edge, `#1f1f1f` ink) in both themes.
4. **NotAuthorized's way back** as an outline `.btn` anchor versus the plain link.
5. **Welcome's lede** at body size via `.lede` and the gaps to `space(5)`/`space(6)`.
6. **Rows**: status word or none; Remove outline or destructive; mark or no mark (MB.71's "No provider marks" was the owner's call then).

### 1e. Copy review (the owner: clear and consistent, not out of scope)

A table in the sign-off comment proposing each sentence the section shows, against one register: second person, plain words, one sentence for what happened and one for what to do, "Please try again." only where trying again can help, "sign-in method" everywhere (not "sign-in option", `sign-in.ts:125`), "address" for the email, title case for every label and heading. Sources: `src/lib/sign-in.ts:122-195` (sign-in, link and unlink codes), `src/lib/account-email.ts:11-22`, EmailForm's status lines (`index.tsx:54-61`) and sent notice, NameForm's saved notice, SignInMethods' removed notice, Welcome's three paragraphs, NotAuthorized's reason, and the unavailable note. Where a sentence changes, the one test that asserts it is loosened to the state form in the same PR (the reduction lane's replacements table), never re-asserted as new copy. `GENERIC_FAILURE` is the one fallback sentence for a request that never got an answer.

### 1f. Sub-hour defects fixed (no regression tests)

- SignInPanel's error → `<Notice kind="error">`; EmailForm's submit takes `aria-busy` + `.spinner` + "Sending Confirmation" (mirrors `NameForm/index.tsx:114-124`); SignInMethods' note and gaps on scale; `unlinkErrorMessage` built on `messageLookup` with a comment on its different fallback (`sign-in.ts:193-195` returns the generic for no code, where the factory returns `undefined`); `styling.md:609`'s stale `--secondary` variant → `.btn--destructive`.

### 1g. Stylelint

`stylelint` + `stylelint-config-standard-scss`; `.stylelintrc.json` with `color-no-hex: true`, `color-named: "never"`, an override clearing both for `src/scss/_variables.scss`, and any `standard-scss` rule that fights Prettier or the repo's Sass turned off with the reason in `commands.md`'s row; `"lint:css"` folded into `"lint"` so pre-commit and CI's lint step carry it with no workflow edit. First-run hits before the lanes land: `SignInPanel/index.scss`, `SignInPanel/icons.scss`, `UserList/index.scss` only.

### 1h. Review surface, then stop

- Foundations page gains `#fd-page-frame`, `#fd-link-row`, `#fd-brands` (buttons in every state) and `#fd-provider-mark` sections; `Notice` and `ProviderMark` get stories; every page component's story renders inside the real `page-frame` and gains `PhoneDark`/`PhoneLight` (`meta = { theme, width: 375 }`); the 1d calls are `Proposal…` stories side by side (deleted once signed off).
- `npm run db:reset && npm run dev` (8000) and `npm run workshop` (61000) stay up through the sign-off; `scripts/review-screenshots.mjs` fills `.reports/mb.116-screenshots/` (375 and 412, both themes, each page and state).
- Comment on #573: the calls in 1d, the copy table from 1e, the paths and story names to look at (never a value or token), and a note to look once in Safari for the `light-dark()` lowering. **Stop for the owner's review.**

## Phase 2 — Apply the sign-off

Record the decisions as a comment on #573; delete the losing stories; apply; then tests, docs, board and verification; an agent commits, pushes and opens the PR into staging (`Closes #573`; `Refs #574` for the merged task; ride-alongs, sub-hour fixes, the moved heading and the copy changes named), sets `In Review` with the link.

Lanes (Opus agents, worktrees under `/home/node/worktrees/<name>` with a copied `node_modules` minus `.cache/tsc/tsconfig.tsbuildinfo` and `/app/.env.local`; one lane may use `/app`): (1) primitives, tokens, Foundations, stylelint, `Notice`, `ProviderMark`, screenshot script; (2) SignInPanel, brand map, UserList, icons, InvitationAcceptance; (3) `/account` page, SignInMethods + `ProviderRow`, NameForm, EmailForm, SignOutButton, `graphql-failure`, `sign-in.ts`; (4) Welcome, NotAuthorized, e2e edits, the contrast test, the admin adoptions of `Notice`/`readGraphqlFailure`/`.link-row`, docs and task entries. Vitest wraps in `flock /tmp/sorrel-vitest.lock`, Playwright in `flock /tmp/sorrel-e2e.lock`; `npx tsx -e` is CommonJS; no Python.

## Tests (to the ten rules)

- **`tests/scss/tokens.test.ts`** (the one new file): `compile`/`declarations`/`surfaces()` copied from `chip.test.ts`; `toHex()` rounding each channel to the 8-bit value the browser paints; brand parts read by compiling `v.brand-color(...)`. One `it.each(['dark','light'])` builds a `[{ pair, ratio, floor }]` table — each brand edge-or-fill and `--accent`, `--text-muted`, `--text-primary` against the page at 3; each brand ink against its fill and hover at 4.5 — and asserts once: `expect(table.filter(r => r.ratio < r.floor)).toEqual([])`. Nothing else in it; text-token contrast stays axe's.
- **e2e, edited in place**: `smoke.spec.ts:84-87` gains `assertNoSidewaysScroll` and a light-theme scan (prose template); `account.spec.ts:16-47` gains both (narrow template) and its unverified-account test gains an axe scan and the scroll assertion on `/account/email`; the failed-link test's `?error=access_denied` gains `&provider=microsoft` and asserts the alert is inside Microsoft's row (`getByRole('listitem').filter({ hasText: 'Microsoft' }).getByRole('alert')`), not its sentence; `sign-in.spec.ts:47-50` and `admin.spec.ts:56-75` gain the scroll assertion only.
- **Component tests, only for behaviour the review changes**: SignInMethods' heading assertion (`index.test.tsx:38-39`) moves to `tests/app/account/page.test.tsx` as the named region with a non-empty lede (`/\S/`); SignInMethods gains "with one method left, the row says why it cannot go" as `toHaveAccessibleDescription(/\S/)` or the `.meta` line's presence, and "a failed link's error is in its provider's row"; EmailForm gains "is busy while the send is in flight" on `NameForm/index.test.tsx:67-78`'s shape; `Notice` gets its role-by-kind test (four rows, one shared path). Tests that imported `GENERIC_EMAIL_ERROR`/`GENERIC_NAME_ERROR` import `GENERIC_FAILURE`. No copy assertions, no class names, no snapshots.

## Docs (same PR)

- `styling.md`: "Browser baseline" bullet under Binding rules; "The page frame", "Link rows and provider marks" and "Brand colours" (the map, `brand-color()`, the measured table, why hover is not asserted) sections; "The top inset" and the Welcome/NotAuthorized sentence (lines 58-60, 383-385) rewritten around `.page-frame`; "Designing a section" gains the frame, the link row, `Notice` and the copy register; line 609.
- `claude-docs/components/`: `notice.md`, `provider-mark.md` (new); `welcome`, `sign-in-panel` ("Provider branding" rewritten; the `$surface-card` claim dropped), `email-form`, `name-form` (MB.117→MB.116), `sign-out-button`, `not-authorized`, `sign-in-methods` (heading now the page's; `ProviderRow`; a Styling section; "No provider marks" rewritten to the decision), `invitation-acceptance`, `user-list`, `admin-nav`, and each admin component whose notice/failure markup changed (Styling or Testing line).
- `claude-docs/workshop.md` (Foundations sections, the page-frame story convention, the screenshot script), `commands.md` (`lint:css`, the script), `claude-docs/auth/admin-bootstrap.md` "The account page" if it describes the markup, `claude-docs/testing/e2e.md` (the scroll helper, the per-template light scan).
- `claude-docs/tasks/mb.md`: MB.116's entry corrected to what was built (MB.117 absorbed, the ride-alongs, stylelint) and its estimate; MB.117's entry marked merged into MB.116; **handoff lines in MB.115, MB.118–MB.124** (below); `tasks/mb.md`'s summary table rows; `TASKS.md`'s wave-8 row and `waves/wave-08.md`'s MB.117 mention; `node scripts/task-board.mjs sync` for every edited entry.
- This plan copied to `claude-docs/design-decisions/mb.116-plan.md`.

## Handoffs written into the later reviews' entries

- **MB.115 (admin)**: `.link-row` and `Notice` are already in; `.admin-layout`'s raw `2rem 1rem`/`1.5rem`/`64rem` are its to put on scale or token; the admin forms' `readGraphqlFailure` adoption is done here, so its review reads them for the next copy; a shared `TextField` is the candidate once IngredientForm's react-hook-form `TextField`/`FieldShell` (`IngredientForm/fields.tsx`) and the plain-state forms are compared; the user list's circle edges changed here; the screenshot script.
- **MB.118 (mail)**: the brand map's hexes are the one source if a mail ever shows a provider mark; the copy register.
- **MB.119 (coven)**: `.page-frame--narrow` is the invite page's frame now and the coven create page's; `Notice`.
- **MB.120 (compendium, shared ingredient components)**: `Notice` for `IngredientForm`'s notices, `TextField` lifting with MB.115.
- **MB.122 (navigation)**: the account nav's `.link-row` pattern and `aria-current`; the ThemeToggle's fixed corner over a page heading at 375px is its to settle when the nav exists.
- **MB.124 (error, loading, empty states)**: `Notice`, `GENERIC_FAILURE`, the copy register from 1e, the browser baseline.

## Board

- `status MB.116 "In Progress"` with the branch comment; `estimate MB.116 8` (2h + MB.117's 1h + the shared pieces, stylelint, the adoptions and the copy review; the owner accepts the spec being re-sized).
- MB.117 (#574): retired as merged — title `MB.117 — [RETIRED] Design review: sign-in methods`, closed `not planned`, moved to the `Retired — not done` milestone, removed from Wave 08's first-line id list, a comment "Merged into MB.116, which reviews the whole account page"; its entry in `mb.md` kept with a struck summary row "— **merged into MB.116**". These are `gh` writes the auto-mode classifier may refuse (memory): the orchestrator hands the owner the exact commands if so.
- Comments as work proceeds; `In Review` with the PR link; `Done` is the merge's.

## Verification

1. `npm run pre-commit` (lint now includes stylelint) at each commit.
2. At task end: `npm run test:coverage`, `npm run test:stories`, `npm run workshop:build`, `npm run build`, and the e2e specs touched (`smoke`, `sign-in`, `sign-in-configured-providers`, `account`, `admin`, `invite`, `admin-invitations`) against the remote browser server, serialised on the e2e lock.
3. Re-measure every edge and ink pairing after the sign-off with `node -e` and `contrastRatio`; check the `.form` container query at exactly `$narrow-column` does not stack NameForm's actions on desktop (max-width is inclusive).
4. Walk each page by keyboard in both themes at 375px in the running app: focus ring visible on every brand fill, every provider reachable, the account nav lands each section clear of the top inset, the row-level error announced. The owner looks once in Safari and Firefox on the host.

## Out of scope

What a provider does, the admin section's own design beyond the adoptions named, mail (MB.118), a site header or AppShell, a shared `TextField` (handed to MB.115/MB.120).

---

## Execution detail for the agents (Opus)

Read first: `CLAUDE.md`; `.claude/rules/components.md` and `.claude/rules/testing.md` (load by reading a file under `src/components/`); `claude-docs/styling.md` sections "Binding rules", "Buttons", "Form fields", "Designing a section" (grep the `## ` heading, read to the next; never the whole file); `claude-docs/workshop.md` "`.ladle/`". The ten testing rules above outrank `.claude/rules/testing.md` where they differ. Prose is British ("colour"); identifiers keep code spelling. Every button, heading and field label is title case. No `Co-Authored-By` or "Generated with" lines. Commit after each green `npm run pre-commit`; suites run once at task end.

### 0. Branch and board (orchestrator)

```sh
cd /app && git fetch origin staging && git checkout -b feature/mb.116-design-review-sign-in-account origin/staging
node scripts/task-board.mjs status MB.116 "In Progress"
node scripts/task-board.mjs comment MB.116 "Branch feature/mb.116-design-review-sign-in-account created off origin/staging; work started. MB.117 folds into this task on the owner's call."
```

### 1. Foundations lane

- `_variables.scss`: `@use 'sass:meta'` beside the existing `sass:` uses; `$narrow-column: 28rem;` near `$breakpoint-desktop` (~line 260) with its comment; the brand block after the badge maps (~156): `$brand-palettes` as in 1a and `brand-color($brand, $part)` modelled on `badge-token()`'s `@error` wording, returning `light-dark(map.get($v,'light'), map.get($v,'dark'))` for a map value (match `chip()`'s argument order in `_mixins.scss:69`).
- `_primitives.scss` (inside `primitives-base`): `.page-frame` block after `.page-header` (~299); `.link-row`; `.provider-mark` (+ four modifiers) lifted from `UserList/index.scss:105-139` with `border: 1px solid brand-color(…,'edge')` where an edge exists and `background-color: brand-color(…,'fill')`, the Facebook `> svg { width:100%; height:100% }` rule kept. Each rule's comment says what it is and why not the obvious alternative (the `:where()` wrapper; `> * { margin-block: 0 }`).
- `.ladle/foundations.tsx` / `.scss`: sections `#fd-page-frame` (a `.page-frame` and a `--narrow` holding a `.header`, `.lede`, `__section`, `__rule`; `.fd .page-frame { min-height: 24rem }`), `#fd-link-row`, `#fd-brands` (the four `SignInPanel` buttons from `SOCIAL_PROVIDERS` in available, greyed, hover-described and last-used states), `#fd-provider-mark` (the four marks). Keys only; values come from the maps.
- `src/components/Notice/{index.tsx,index.scss,types.ts,index.stories.tsx}` + `claude-docs/components/notice.md`; `index.scss` is empty bar the `@use` (the primitive styles it) or absent if the guard allows. `src/components/ProviderMark/` likewise, with `PROVIDER_MARKS` exported from `SignInPanel/icons.tsx` (keep the icons there; `ProviderMark` imports them) and `ProviderUnavailableNote` beside it, `UNAVAILABLE_NOTE` in `src/lib/social-providers.ts`.
- Stylelint as in 1g. `scripts/review-screenshots.mjs` as in 1b (`chromium.connect(process.env.PLAYWRIGHT_WS_ENDPOINT)`; app reached as `http://devcontainer:8000`; workshop served with `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=devcontainer npx ladle serve --host 0.0.0.0 --port 61001`).
- `tests/e2e/axe.ts`: `assertNoSidewaysScroll(page)` — `setViewportSize({ width: 375, height: 812 })`, evaluate `scrollWidth`/`clientWidth` on `document.documentElement`, `expect(scrollWidth).toBeLessThanOrEqual(clientWidth)`.

### 2. Sign-in lane

- `src/app/sign-in/page.tsx:24`: `page-frame page-frame--narrow`.
- `SignInPanel/index.tsx`: `.header` with `h1` + `.lede`; `<Notice kind="error">` for `message`; `ProviderUnavailableNote`; `PROVIDER_ICONS` → `PROVIDER_MARKS`; badge per the 1d.2 decision (inline: the `span` stays after the label, the absolute rule goes).
- `SignInPanel/index.scss`: delete `.sign-in-page` (9-21), `.sign-in-panel__error` (54-68), `.sign-in-panel__note` (187-191; the shared note's class is its own); gaps to `space()`; lines 123-171 become `@use 'sass:map'` + `@each $brand, $parts in $brand-palettes { .sign-in-panel__button--#{$brand}.btn { background-color: brand-color($brand,'fill'); color: brand-color($brand,'ink'); @if map.has-key($parts,'edge') { border-color: brand-color($brand,'edge'); } &:hover, &:focus-visible { background-color: brand-color($brand,'hover'); color: brand-color($brand,'ink'); } } }`; the compound-selector comment (110-121) kept, "hex literals" reworded. `icons.scss`: `@use '../../scss/variables' as *;`, `brand-color('facebook','fill')`.
- `UserList/index.scss:105-139` → the `.provider-mark` primitive; `UserList/index.tsx:23-28` renders `<ProviderMark id=… />`; `PROVIDER_LOGOS` deleted.
- `InvitationAcceptance`: `page.tsx:45` → `page-frame page-frame--narrow`; `index.scss` loses `.invitation-page` (5-16) and the width caps; `<Notice>` for its two notices; `GENERIC_ERROR` (`index.tsx:24`) → `GENERIC_FAILURE`; story wrapper (`index.stories.tsx:14`).
- Stories: `SignInPanel/index.stories.tsx` inside the real frame; `PhoneDark`/`PhoneLight`; Phase 1 `ProposalBadgeInline`/`ProposalBadgeCorner`, `ProposalMicrosoftEdge`/`ProposalMicrosoftDark`.
- Docs: `sign-in-panel.md` (38-60, 133+, 148-162), `user-list.md`, `invitation-acceptance.md`.

### 3. Account lane

- `src/app/account/page.tsx`: `main.page-frame.page-frame--narrow`; `div.page-header`; `ul.link-row`; each `section.page-frame__section[aria-labelledby]` opening with `<div className="header"><h2 id=…>…</h2><p className="lede">…</p></div>`; `hr.page-frame__rule`; the third section's `h2`/lede now here; `searchParams` also yields `provider`, passed as `error={message ? { providerId: isRosterProvider(params.provider) ? params.provider : undefined, message } : undefined}` (type in `SignInMethods/types.ts`).
- `SignInMethods/index.tsx`: delete the `h2`/intro (57-60); `handleAdd`'s `errorCallbackURL: \`${ACCOUNT_PATH}?provider=${providerId}\``; rows via `provider-row.tsx` (`ProviderRow({ provider, state: 'linked' | 'addable' | 'unavailable', removable, pending, error, onAdd, onRemove })`); section-level `<Notice kind="error">`only for an error with no known provider;`<Notice kind="success">`for`removed`. `index.scss`: lines 3-93 deleted; `.sign-in-methods__list`/`__item`gaps on scale, the`::before`reset dropped if`.link-row`-style reset is reused (a `ul`of rows is not a link row; keep a local reset with its comment); the row's`.meta`reason and nested notice take`flex-basis: 100%`.
- `NameForm`, `SignOutButton`: `<Notice>`, `GENERIC_FAILURE`, `readGraphqlFailure`. `EmailForm/index.tsx:189-196`: busy state as `NameForm/index.tsx:114-124`; `index.scss` loses `.email-page*` and the width caps; the standalone `h1` in a `.header`. `src/app/account/email/page.tsx:20,38`.
- `src/lib/graphql-failure.ts` + `Failure` in `src/lib/types.ts`; adopters per 1b. `src/lib/sign-in.ts:193-195` as in 1f.
- Tests as in "Tests": `tests/components/SignInMethods/index.test.tsx` (38-39 moved; two new `it`s), `tests/app/account/page.test.tsx` (named region + `/\S/` lede), `tests/components/EmailForm/index.test.tsx` (busy), imports of the generic constants (`EmailForm/index.test.tsx:219`, `SignOutButton/index.test.tsx:45`, `tests/e2e/account.spec.ts:121`).
- Stories: `SignInMethods` `Page` wrapper (18-26) renders the real frame, section and head; `OneLinked`, `TwoLinked`, `WithError` (now in Microsoft's row), `SomeUnavailable`, Phase 1 `ProposalStatusWord`/`ProposalNoStatus`, `ProposalRemoveDestructive`. `NameForm`/`EmailForm` wrappers likewise.
- Docs: `sign-in-methods.md`, `name-form.md:42-45`, `email-form.md:114-124`, `sign-out-button.md:25-29`, `claude-docs/auth/admin-bootstrap.md` "The account page".

### 4. Prose, admin adoptions, e2e, docs lane

- `src/app/page.tsx:14` → `page-frame welcome-page` (comment: Backdrop's hook). `Welcome/index.scss`: `.welcome-page` deleted; `.welcome` column with `gap: space(5)`; lede/gap per 1d.5; `h1` + lede in `.header`. `forbidden.tsx:8` → `page-frame`; `NotAuthorized` likewise, way back per 1d.4.
- Admin adoptions: `AdminNav/index.scss:14-26` → `ul.link-row` (keep `.admin-nav__list` only if a test or doc names it; none does — verify); `<Notice>` in the eight `src/app/admin/*` pages, `AdminInvitations/invite-form.tsx`, `GroupForm`, `GroupedValueForm`, `VocabularyValueForm`, `IngredientForm/index.tsx` + `reference-panel.tsx`, `UserList/{confirmed-action,impersonate-button,pause-control}.tsx`, `ImpersonationBanner`; `readGraphqlFailure`/`GENERIC_FAILURE` in the 10 readers (`IngredientForm/values.ts:65`, `AdminInvitations/invite-form.tsx:24-34`, `UserList/confirmed-action.tsx:15-20`, `pause-control.tsx:56`, `GroupForm/index.tsx:101`, `GroupedValueForm/index.tsx:109`, `VocabularyValueForm/index.tsx:93`). Their tests change only where they import a deleted constant.
- e2e edits and `tests/scss/tokens.test.ts` as in "Tests".
- Docs and task entries as in "Docs" and "Handoffs"; `node scripts/task-board.mjs sync MB.116` (and MB.115, MB.117, MB.118–MB.124 after their edits) from the checkout holding the edit.

### 5. Sign-off and close (orchestrator)

Phase 1 ends with the comment on #573 and a stop. Phase 2: record decisions as a comment; delete `Proposal…` stories; apply; verification; plan copied to `claude-docs/design-decisions/mb.116-plan.md`; `estimate MB.116 8`; MB.117's retirement (commands handed to the owner if refused); the PR agent: `Closes #573` / `Refs #574`, ride-alongs and sub-hour fixes named; `status MB.116 "In Review"` + comment with the PR link.

## Decisions at sign-off (2026-10-11)

The owner's calls on the proposals drawn in 1d and the pieces built around them. The losing stories are deleted; what follows is what shipped.

- **A panel behind the three form pages.** `/sign-in`, `/account`'s sections and `/account/email` sit on a `.panel`; `/` and the 403 page stay bare, being prose.
- **The last-used badge stays in the button's corner**, rather than moving inline at the end of the label.
- **Microsoft keeps its white face with the darker grey edge**, `#808080` in `$brand-palettes`, in both themes. Microsoft's own dark button in the light theme is not adopted.
- **The 403 page's way back is a button**: a `.btn` anchor to `/`, not a plain text link; quiet (`.btn--quiet`), since a way back changes nothing and a secondary action is not green (the owner, 2026-10-11).
- **Welcome's lede is the shared `.lede` at body size**, in the muted ink, as every section head's is.
- **The sign-in-methods rows carry no status word**, Remove is `.btn--destructive`, and each row keeps its provider mark.
- **The unavailable note is at caption size.**
- **`Notice` gains a `quiet` option**: an error or warning on the page from the start renders as an `<output>`, a status, with its kind's look, so it is not announced over what the reader is doing. The user list's unverified-address warning and its paused-state line adopt it, so no notice stays hand-written.
- **`readGraphqlIssues`** joins `readGraphqlFailure` in `src/lib/graphql-failure.ts`: it reads every field error of a refusal at once, for the forms that place each one under its field. GroupForm, GroupedValueForm, VocabularyValueForm and IngredientForm drop their own copies of it.
- **The account page pre-empts a stale session.** Better Auth refuses to remove a sign-in method on a session older than its freshness window, so the page withholds Remove on such a session and offers Sign In Again instead, rather than letting the request fail.
- **The copy register**: speak to the reader as "you"; one sentence for what happened and one for what to do; "sign-in" is the noun and adjective and "sign in" the verb; "email address" on a sentence's first mention and "address" after; title case for every label, button and heading.

## Calls on the applied design (2026-10-11, the owner, in the running app)

- **The only sign-in method's Remove is greyed, not gone**: `aria-disabled`, still in the tab order, with "Your only sign-in method" beneath it as its description, so the reason sits under the control it explains.
- **The sign-in card is bigger**: it fills the narrow column (28rem) rather than its own 22rem, pads itself a step more than `.panel` (`space(6)`) and two steps more below (`space(8)`), is one centred `max-content` column, so the lede and the error wrap at the buttons' width, and its buttons sit a `space(4)` apart, the room the last-used badge needs and no more.
- **The email page's way on is a quiet "Continue to Account" button (`.btn--quiet`) inside the card**, centred, offered only to a verified account; on the confirmed view it sits beside the solid "Continue".
- **A page-frame child is `border-box`**: the 375px width check caught the account sections' panels growing past the column by their padding. The fix is in the primitive, so every padded child keeps its padding inside the column.
- **`assertNoSidewaysScroll` names what overflows** in its failure message, the outermost offenders only.
