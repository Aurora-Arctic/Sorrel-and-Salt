---
paths:
  - 'src/components/**'
  - 'src/scss/**'
  - 'src/app/**/*.tsx'
  - 'src/emails/**'
  - '.storybook/**'
  - 'tests/components/**'
---

# Component and styling rules

The long form of `CLAUDE.md`'s components and styling convention. `CLAUDE.md` wins over this file; `claude-docs/styling.md`, `claude-docs/workshop.md` and `claude-docs/components/` carry the argument.

## Layout

- **A component is a directory**: `src/components/<Name>/` with `index.tsx`, `index.scss` and, where it takes props, a `types.ts` its story imports them from, imported `from '../components/IngredientCard'`. The test is not beside them — it is `tests/components/<Name>/index.test.tsx` (MB.41), importing the component as `@/components/<Name>`.
- **Every standalone component ships an `index.stories.tsx`** in the same directory; the Storybook workshop discovers components by that file. The one exception is a component that renders nothing, `CovenSwitchTargets`: a story of it would draw an empty frame, and its effect shows in the story of the component it informs, the coven switcher. Review catches a missing story, and `workshop:build` one that fails to bundle, on CI's `build` leg, which pre-commit does not run — a gate lives in CI, where skipping the local hook cannot skip it. `.storybook/*.stories.tsx` is the one non-component location. Stories carry no test ids and no snapshots (claude-docs/workshop.md).
- **A form that holds what someone types guards leaving it** (M13.14, story 32): it calls `useDiscardGuard(dirty)` (`src/components/Modal`), or `useLeaveGuard(dirty, ask)` (`src/lib/navigation`) for a question of its own, so Cancel, a tab close, a reload and an in-app link ask before its changes are lost. The spell builder alone saves on close instead of asking, through `useSaveOnClose` (M10.12). The lint rule `sorrel/long-form-guards-leaving` fails a component that draws a `<form>`, renders `FormActions` or calls `useForm` without one, bar its named list (claude-docs/components/modal.md, "Unsaved changes").
- **Every standalone component has its doc**, `claude-docs/components/<name>.md` in lower-kebab-case. A component that ships without it is an incomplete task (claude-docs/README.md).

## Styling

- **Sass is the modern module system only**: `@use '../../scss/variables' as *;`, never `@import`. Shared partials in `src/scss/` are `@use`'d directly by whichever component needs them, never routed through a parent.
- **The browser floor is Baseline Widely Available** (M10.24): a feature that Chrome, Edge, Firefox and Safari have all shipped for 30 months. `package.json`'s `browserslist` (`["baseline widely available"]`) is its one statement, and it rolls forward each month. Below the floor the app degrades and never breaks: a core flow works without any newer feature. A feature past the floor takes one of three shapes, in this order:
  1. **`@supports` with a fallback** — the plugin skips what sits inside `@supports`.
  2. **A pure enhancement**, which loses nothing a person needs. In CSS it takes `// stylelint-disable-next-line plugin/use-baseline -- enhancement: <what is lost>, widely available <date>`, the date from `web-features` (the feature's low date plus 30 months), or `not yet Baseline` when it has none. In JavaScript it sits behind a `typeof` or `in` check on the same line.
  3. **Remove the feature.**
     `npm run lint:css` runs `stylelint-plugin-use-baseline` with `available: "widely"`. It is set to ignore the Sass `@function` rule, which is Sass and not the CSS at-rule of that name, and `light-dark()`, which Lightning CSS lowers for the floor so it never reaches a browser. `tests/guards/browser-floor.test.ts` holds client-reachable TypeScript: its hand-kept list names web APIs past the floor, reads each one's date from `web-features`, and fails with "delete this entry" once the feature is widely available. CI stays Chromium only; the owner's look at the dev server in Safari and Firefox is part of every sign-off (claude-docs/styling.md, "Binding rules").
- **The design will change, one section at a time.** A building task styles no further than the tokens (M0.7), mixins (M0.8) and `_primitives.scss`; each section is designed by its design review once it is built — MB.114 settles the foundations, and MB.115 to MB.124 each follow the last task of their section. A section's styling goes past the tokens only there, and only with the owner's sign-off (claude-docs/styling.md, "Designing a section").
- **Body copy keeps to the reading measure: `$measure`, 66ch** (M5.4) — measured in the text's own font, since `ch` is the width of its "0". `typography-base` caps every `<p>` at it, so prose is readable on any page without asking — a page or layout may be as wide as its content needs (a table, a grid), and its paragraphs still stop at the measure. Never widen a paragraph past it; running text that is not a `<p>` — a long list item, a description — takes `max-width: $measure` itself. A column narrower than the measure, as the forms use, is a component's own choice (claude-docs/styling.md, "Binding rules").
- **No print styles anywhere except the spell recipe view** — the page is MB.6, the print layout is M10.22. `_print.scss` is created by M10.22 and scoped to that one view.
- **A category group's colours are data, not tokens**: `color` are hexes on the row, contrast-checked on write, as DESIGN.md §5 argues; the seeded pairs live only in `src/db/seed/category-groups.ts`, and no Sass token restates them (claude-docs/styling.md, "Category-group colours").

## Destructive controls

- **A thing's Delete or Remove lives in its edit dialog, where it has one**: nowhere on its row or card, and not in its Quick Look, as a bin or as a button beside Edit. A thing with no edit dialog keeps a lone bin that asks before it acts. The rule is about a lone bin on a row or card: a More menu that already holds other choices may still list Delete or Remove among them, asking in place (claude-docs/components/icon-tip.md, "The controls built on it"; claude-docs/components/coven-cards.md).
- **A row's Remove or Revoke is drawn plain** (`btn btn--quiet btn--small`), as the row's other controls are. The red is the confirm's own: the button that carries the act out, in the question that names the thing (claude-docs/components/member-list.md).

## Copy

- **Button labels are title case** — "Sign In", "Send Confirmation", "Send Again in 59s"; a short preposition stays lower, as title case has it ("Continue with Google"). This holds for every button, submit and `.btn` anchor (DESIGN.md §9); a component touched with a sentence-case label is fixed in that PR.
- **Headings are title case too** — every `h1`–`h6`, dialog title and table column heading: "Sign In", "Add Category", "Sign-In Methods" (DESIGN.md §9), and a page's tab title with its heading.
- **Field labels are title case** too — "Email Address", "Name or Email" (DESIGN.md §9).
- **The three nouns are fixed**: compendium, ingredients, grimoire — never "catalog" (`CLAUDE.md`'s Vocabulary). A URL and the screens say _coven_; code and docs say workspace (MB.119).
