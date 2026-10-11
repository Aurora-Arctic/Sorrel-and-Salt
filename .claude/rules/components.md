---
paths:
  - 'src/components/**'
  - 'src/scss/**'
  - 'src/app/**/*.tsx'
  - 'src/emails/**'
  - '.ladle/**'
  - 'tests/components/**'
---

# Component and styling rules

The long form of `CLAUDE.md`'s components and styling convention. `CLAUDE.md` wins over this file; `claude-docs/styling.md`, `claude-docs/workshop.md` and `claude-docs/components/` carry the argument.

## Layout

- **A component is a directory**: `src/components/<Name>/` with `index.tsx`, `index.scss` and, where it takes props, a `types.ts` its story imports them from, imported `from '../components/IngredientCard'`. The test is not beside them — it is `tests/components/<Name>/index.test.tsx` (MB.41), importing the component as `@/components/<Name>`.
- **Every standalone component ships an `index.stories.tsx`** in the same directory — no exceptions; the Ladle workshop discovers components by that file. Review catches a missing story, and `workshop:build` one that fails to bundle, on CI's `build` leg, which pre-commit does not run — a gate lives in CI, where skipping the local hook cannot skip it. `.ladle/*.stories.tsx` is the one non-component location. Stories carry no test ids and no snapshots (claude-docs/workshop.md).
- **Every standalone component has its doc**, `claude-docs/components/<name>.md` in lower-kebab-case. A component that ships without it is an incomplete task (claude-docs/README.md).

## Styling

- **Sass is the modern module system only**: `@use '../../scss/variables' as *;`, never `@import`. Shared partials in `src/scss/` are `@use`'d directly by whichever component needs them, never routed through a parent.
- **The design will change, one section at a time.** A building task styles no further than the tokens (M0.7), mixins (M0.8) and `_primitives.scss`; each section is designed by its design review once it is built — MB.114 settles the foundations, and MB.115 to MB.124 each follow the last task of their section. A section's styling goes past the tokens only there, and only with the owner's sign-off (claude-docs/styling.md, "Designing a section").
- **Body copy keeps to the reading measure: `$measure`, 66ch** (M5.4) — measured in the text's own font, since `ch` is the width of its "0". `typography-base` caps every `<p>` at it, so prose is readable on any page without asking — a page or layout may be as wide as its content needs (a table, a grid), and its paragraphs still stop at the measure. Never widen a paragraph past it; running text that is not a `<p>` — a long list item, a description — takes `max-width: $measure` itself. A column narrower than the measure, as the forms use, is a component's own choice (claude-docs/styling.md, "Binding rules").
- **No print styles anywhere except the spell recipe view** — the page is MB.6, the print layout is M10.22. `_print.scss` is created by M10.22 and scoped to that one view.
- **A category group's colours are data, not tokens**: `colorDark` and `colorLight` are hexes on the row, contrast-checked on write, as DESIGN.md §5 argues; the seeded pairs live only in `src/db/seed/category-groups.ts`, and no Sass token restates them (claude-docs/styling.md, "Category-group colours").

## Copy

- **Button labels are title case** — "Sign In", "Send Confirmation", "Send Again in 59s"; a short preposition stays lower, as title case has it ("Continue with Google"). This holds for every button, submit and `.btn` anchor (DESIGN.md §9); a component touched with a sentence-case label is fixed in that PR.
- **Headings are title case too** — every `h1`–`h6`, dialog title and table column heading: "Sign In", "Add Category", "Sign-In Methods" (DESIGN.md §9), and a page's tab title with its heading.
- **Field labels are title case** too — "Email Address", "Name or Email" (DESIGN.md §9).
- **The three nouns are fixed**: compendium, ingredients, grimoire — never "catalog" (`CLAUDE.md`'s Vocabulary). Only a URL says _coven_.
