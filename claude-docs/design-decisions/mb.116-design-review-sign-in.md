# MB.116 — Design review: the sign-in and account pages (absorbing MB.117)

**Status:** decided and built. Only the decisions, the reasons and what they rule out are kept here.

## Decisions already taken (owner, 2026-10-10)

- **Add stylelint** to carry "no raw hue outside `_variables.scss`", on the condition it never conflicts with the database carrying colours. It does not: group colours are hexes on `category_groups` rows, reach the page as inline `--chip-dark`/`--chip-light` custom properties set from data, and the seeded pairs are in `src/db/seed/category-groups.ts` (TypeScript). A Sass linter sees none of them; `ChipColorField/index.scss:327`'s hex is in a comment, which `color-no-hex` ignores.
- **Ride-alongs outside the section go in this PR**, named in its body: InvitationAcceptance adopts the page frame; UserList adopts the brand map and the shared provider mark (its Google and Microsoft circle edges darken to the edges that clear 3:1); AdminNav adopts `.link-row`; every copy of the notice markup and the failure reader across the frontend adopts the shared piece (the owner: "review it", not "leave it to MB.115").
- **Stop for sign-off** after the proposals are built (MB.114's shape), with the app and the workshop running so the owner sees them live.
- **MB.117 merges into MB.116.** Mechanics in "Board" below.
- **Testing follows the test-reduction session's final ten rules** (app-d8, 2026-10-10, overriding the repo's current rules where they differ; they land in `claude-docs/testing/layer-ownership.md` when that lane merges): (1) functional requirements only, no tests of the harness, scripts, package.json wiring, another test's helper, or code only Claude agents use (the screenshot script is untested); (2) state, never copy, except where the words are the only rendering of a state (the "Your only sign-in method" reason line qualifies); locators keep exact names; (3) a regression test needs a shipped bug; (4) no presentation in jsdom, story and axe own it, but a real-browser 375px scroll-width measurement and a one-assertion-per-theme token-contrast check are allowed; (5) one row per shared path in a config table; (6) each layer proves only what it adds; (7) migration data tests retire in production; (8) no guard a linter can carry; (9) e2e proves what only a real server can, one axe scan per page; (10) SQL text only as an EXPLAIN precondition. For this task: fold checks into existing specs, one assertion per page template, the light-mode axe once per template, no new test file except the one Sass contrast table.
- **Browser baseline**: Next's default modern targets (`node_modules/next/dist/shared/lib/modern-browserslist-target.js`: Chrome, Edge and Firefox 111, Safari 16.4, "baseline widely available" as of 2025-10-01). Turbopack's Lightning CSS lowers anything newer (it already lowers `light-dark()`, `styling.md:282`). Everything the section uses or adds sits inside it: `:where()`, `:has()`, `@container`, `dvh`, `color-mix()`, unprefixed `mask`, `translate`, `inset-block-start`, `scroll-margin-top`, `forced-colors`, `prefers-contrast`, `prefers-reduced-motion`. This is written into `styling.md`'s Binding rules as the rule every later review checks new CSS against, and the Chromium-only Playwright projects are noted as the reason the owner's own Safari and Firefox look at the dev server is part of each sign-off.

Branch: `feature/mb.116-design-review-sign-in-account` off fresh `origin/staging` (`/app` is on MB.213's branch, fully merged).

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
