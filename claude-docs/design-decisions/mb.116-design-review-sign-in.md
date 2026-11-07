# Design review: the sign-in and account pages

**Status:** decided. Live home: `claude-docs/components/sign-in-panel.md`, `claude-docs/components/sign-in-methods.md`, `claude-docs/components/notice.md` and `claude-docs/styling.md`.

## Decision

- **stylelint carries "no raw hue outside `_variables.scss`".** It never conflicts with the database holding colours: group colours are hexes on `category_groups` rows that reach the page as inline `--chip-dark`/`--chip-light` custom properties, and the seeded pairs live in TypeScript, which a Sass linter does not read.
- **A panel sits behind the three form pages** (`/sign-in`, `/account`'s sections, `/account/email`); `/` and the 403 page stay bare, being prose.
- **The last-used badge stays in the button's corner.**
- **Microsoft keeps its white face with the darker grey edge**, `#808080` in `$brand-palettes`, in both themes.
- **The 403 page's way back is a quiet `.btn` anchor to `/`** (`.btn--quiet`): it changes nothing, and a secondary action is not green.
- **Welcome's lede is the shared `.lede`** at body size in the muted ink, as every section head's is.
- **The sign-in-methods rows carry no status word**, Remove is `.btn--destructive`, and each row keeps its provider mark.
- **`Notice` has a `quiet` option** so an error or warning on the page from the start renders as an `<output>` status and is not announced over what the reader is doing. No notice markup stays hand-written.
- **`readGraphqlIssues`** sits beside `readGraphqlFailure` in `src/lib/graphql-failure.ts` and reads every field error of a refusal at once for forms that place each under its field.
- **The account page pre-empts a stale session.** Better Auth refuses to remove a sign-in method on a session older than its freshness window, so the page withholds Remove and offers Sign In Again.
- **Browser floor** is Baseline Widely Available (`claude-docs/styling.md`, Binding rules); the Chromium-only Playwright projects are why a Safari and Firefox look at the dev server is part of each sign-off.
- **Copy register:** speak to the reader as "you"; one sentence for what happened and one for what to do; "sign-in" is the noun and adjective, "sign in" the verb; "email address" on first mention and "address" after; Title Case for every label, button and heading.

## Why

A shared piece (frame, brand map, provider mark, notice, failure reader) replaces every hand-written copy so a later review changes one place.

## Rules out

- Moving the last-used badge inline.
- Microsoft's own dark button in the light theme.
- A status word on each sign-in-methods row.
- Letting a stale-session removal fail at the request.
