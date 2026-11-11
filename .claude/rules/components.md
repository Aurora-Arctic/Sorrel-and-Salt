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

- **A component is a directory**: `src/components/<Name>/` with `index.tsx`, `index.scss` and, where it takes props, a `types.ts` its story imports them from, imported `from '../components/IngredientCard'`. The test is not beside them: it is `tests/components/<Name>/index.test.tsx`, importing the component as `@/components/<Name>`.
- **Every standalone component ships an `index.stories.tsx`** in the same directory; the Storybook workshop discovers components by that file. The exception is a component that renders nothing, of which there are two, `CovenSwitchTargets` and `CovenFacts`: a story of either would draw an empty frame, and their effects show in the stories of the components they inform, the coven switcher and the coven home. The other exception is the two server help widgets, `InvitationRefusals` and `RolePermissionTable` in `src/components/HelpWidget/`: each reads a server-only module, which the workshop cannot bundle, so the directory's story draws only its two client widgets, and the two are checked in `tests/e2e/help-widgets.spec.ts`. Review catches a missing story, and `workshop:build` one that fails to bundle, on CI's `build` leg, which pre-commit does not run — a gate lives in CI, where skipping the local hook cannot skip it. `.storybook/*.stories.tsx` is the one non-component location. Stories carry no test ids and no snapshots (claude-docs/workshop.md).
- **A form that holds what someone types guards leaving it** (story 32): it calls `useDiscardGuard(dirty)` (`src/components/Modal`), or `useLeaveGuard(dirty, ask)` (`src/lib/navigation`) for a question of its own, so Cancel, a tab close, a reload and an in-app link ask before its changes are lost. The spell builder alone saves on close instead of asking, through `useSaveOnClose`. The lint rule `sorrel/long-form-guards-leaving` fails a component that draws a `<form>`, renders `FormActions` or calls `useForm` without one, bar its named list (claude-docs/components/modal.md, "Unsaved changes").
- **Every standalone component has its doc**, `claude-docs/components/<name>.md` in lower-kebab-case; a component without one is an incomplete task (claude-docs/README.md).

## Styling

- **Sass is the modern module system only**: `@use '../../scss/variables' as *;`, never `@import`. Shared partials in `src/scss/` are `@use`'d directly by whichever component needs them, never routed through a parent.
- **The browser floor is Baseline Widely Available**: a feature that Chrome, Edge, Firefox and Safari have all shipped for 30 months. `package.json`'s `browserslist` (`["baseline widely available"]`) is its one statement, and it rolls forward each month. Below the floor the app degrades and never breaks: a core flow works without any newer feature. A feature past the floor takes one of three shapes, in this order:
  1. **`@supports` with a fallback** — the plugin skips what sits inside `@supports`.
  2. **A pure enhancement**, which loses nothing a person needs. In CSS it takes `// stylelint-disable-next-line plugin/use-baseline -- enhancement: <what is lost>, widely available <date>`, the date from `web-features` (the feature's low date plus 30 months), or `not yet Baseline` when it has none. In JavaScript it sits behind a `typeof` or `in` check on the same line.
  3. **Remove the feature.**
     `npm run lint:css` runs `stylelint-plugin-use-baseline` with `available: "widely"`. It is set to ignore the Sass `@function` rule, which is Sass and not the CSS at-rule of that name, and `light-dark()`, which Lightning CSS lowers for the floor so it never reaches a browser. `tests/guards/browser-floor.test.ts` holds client-reachable TypeScript: its hand-kept list names web APIs past the floor, reads each one's date from `web-features`, and fails with "delete this entry" once the feature is widely available. CI stays Chromium only; the owner's look at the dev server in Safari and Firefox is part of every sign-off (claude-docs/styling.md, "Binding rules").
- **A task styles its components as the design needs.** It uses the existing tokens, mixins and `_primitives.scss` where they fit, and adds new tokens, primitives, icons or SVGs to `src/scss/` (and the workshop's `Foundations` page) where they do not, after checking that no existing component, primitive or token already does the job: new design is welcome, a second copy of existing functionality is not. The owner's look in the browser, light and dark, at 375px, in Safari and Firefox, is the sign-off (claude-docs/styling.md, "Designing a section").
- **Body copy keeps to the reading measure: `$measure`, 66ch**, measured in the text's own font, since `ch` is the width of its "0". `typography-base` caps every `<p>` at it, so prose is readable on any page without asking — a page or layout may be as wide as its content needs (a table, a grid), and its paragraphs still stop at the measure. Never widen a paragraph past it; running text that is not a `<p>` — a long list item, a description — takes `max-width: $measure` itself. A column narrower than the measure, as the forms use, is a component's own choice (claude-docs/styling.md, "Binding rules").
- **No print styles anywhere except the spell recipe view.** `_print.scss` is scoped to that one view.
- **A category group's colours are data, not tokens**: `color` are hexes on the row, contrast-checked on write, as DESIGN.md §5 argues; the seeded pairs live only in `src/db/seed/category-groups.ts`, and no Sass token restates them (claude-docs/styling.md, "Category-group colours").

## Shared pieces

Each job below has one shared piece, and a component or page uses it, never a copy of its own. Where a guard is named, a test in `tests/guards/` fails a copy.

- **Page metadata**: `publicPageMetadata` for a public page, `pageTitle` for a signed-in one (`src/lib/page-metadata.ts`). Guard: `page-metadata`.
- **A missing row becomes a 404** through `orNotFound` (`src/lib/or-not-found.ts`). Guard: `not-found`.
- **A list page read from the URL**: `readNumberedPage` or `readCursorPage` (`src/lib/numbered-page.ts`). Guard: `pagination`.
- **Failure text**: `failureMessage` (`src/lib/graphql-failure.ts`). A component never turns a GraphQL error code into a sentence itself. The sign-in sentences are in `src/lib/auth-messages.ts`. Guards: `failure-message`, `auth-messages`.
- **Closing on a press outside**: `useDismiss` (`src/lib/use-dismiss.ts`). Guard: `dismissal`.
- **Reduced motion and the 400 ms fade limit**: `prefersReducedMotion` and `FADE_LIMIT_MS` (`src/lib/motion.ts`). Guard: `reduced-motion`.
- **Matching typed text**: `fold` (`src/lib/text.ts`). Guard: `text-folding`.
- **Showing a quantity**: `formatQuantity` (`src/lib/quantity.ts`).
- **Joining class names**: `cx` (`src/lib/class-names.ts`). Lint rule: `sorrel/class-names-joined-through-cx`.
- **Plural words, "has text", and option labels**: `plural` and `hasText` (`src/lib/text.ts`), `labelOf` (`src/lib/options.ts`).
- **An untitled spell's name**: `spellNameOf` (`src/components/SpellCard/untitled.ts`). Lint rule: `sorrel/spell-name-through-spell-name-of`.
- **Downloading a file**: `saveFile` (`src/lib/save-file.ts`).
- **A drag handle**: `GripHandle` (`src/components/GripHandle/`). Guard: `sortable-wiring`.
- **A page and its skeleton**: `PanelSection`, `NarrowPanelPage`, `HelpFrontShell`, `HelpArticlePage`, `DocumentPageSkeleton` and the title constants (`ADD_INGREDIENT_TITLE`, `NEW_SPELL_TITLE`, the spell section titles in `SpellRecipe/sections.ts`) are written once and used by both. Guard: `page-pieces`.
- **A breakpoint**: the mixins in `src/scss/_mixins.scss` (`phone-down`, `above-phone`, `tablet-down`, `above-tablet`, `width-from`, `width-to`), never a hand-written `@media` width query. Guard: `breakpoints`.

## Destructive controls

- **A thing's Delete or Remove lives in its edit dialog, where it has one**: nowhere on its row or card, and not in its Quick Look, as a bin or as a button beside Edit. A thing with no edit dialog keeps a lone bin that asks before it acts. The rule is about a lone bin on a row or card: a More menu that already holds other choices may still list Delete or Remove among them, asking in place (claude-docs/components/icon-tip.md, "Contracts"; claude-docs/components/coven-cards.md).
- **A row's Remove or Revoke is drawn plain** (`btn btn--quiet btn--small`), as the row's other controls are. The red is the confirm's own: the button that carries the act out, in the question that names the thing (claude-docs/components/member-list.md). Red also marks a high-risk control, and only four exist: Impersonate, on the row, in the user modal and on its confirm; Pause Admin Changes, on Pause, on Resume and on its confirm; Revoke Batch on the invitation cards table, a whole red column like Impersonate's (`row-action-column`) with a red confirm, since a batch's revoke cannot be undone and reaches many cards at once; and Email Every Account, on the button and its confirm, since a mailing reaches every account and cannot be called back.

## Copy

- **Button labels are title case** — "Sign In", "Send Confirmation", "Send Again in 59s"; a short preposition stays lower, as title case has it ("Continue with Google"). This holds for every button, submit and `.btn` anchor (DESIGN.md §9); a component touched with a sentence-case label is fixed in that PR.
- **Headings are title case too** — every `h1`–`h6`, dialog title and table column heading: "Sign In", "Add Category", "Sign-In Methods" (DESIGN.md §9), and a page's tab title with its heading. One exception: an FAQ question is a question, so it is sentence case wherever it shows (claude-docs/components/help-pages.md).
- **Field labels are title case** too — "Email Address", "Name or Email" (DESIGN.md §9).
- **The three nouns are fixed**: compendium, ingredients, grimoire — never "catalog" (`CLAUDE.md`'s Vocabulary). A URL and the screens say _coven_; code and docs say workspace.

## Form inputs

How a typed input is built and checked. `claude-docs/components/field.md` holds the contracts of the components named here; the thirteen rules below say what every form follows. Lint rules named here are in `lint/source-sweeps.js`, each with its allowance list, and fail `npm run lint`.

1. **R1. Every typed input is built on the Field set** (`TextField`, `TextAreaField`, `PlainTextField`, `DateField`, `Combobox`). A raw `<input>` or `<textarea>` that takes text appears only inside `src/components/Field/`, the Combobox and `PasswordField` (a member of the Field set), bar five named exceptions: Number of Sheets in the card mint form (its total line takes the error’s place, and Field has no slot for that), the chip colour hex box (it needs the form's own id and the contrast ratio's description), Locator (its row links to its own control id), the help search (a plain GET form), and the hidden honeypot fields. Checkbox, radio, hidden and file inputs are not text. Enforced by `sorrel/inputs-use-field`, which holds the exception list.
2. **R2. An amount is never `type="number"`.** It is a text input with `inputMode="decimal"` using the shared `quantity` rule. A bounded whole number, such as Number of Sheets, may keep `type="number"` with `min` and `max`. Enforced by `sorrel/no-number-input`, which holds the list of whole-number fields.
3. **R3. Each format rule is written once.** Every length limit and every email, hex colour, link, quantity and date rule is exported from the module that owns it and imported by the service, the server schema and the form. A form never restates a rule its server has; it imports the server's schema or its parts. Enforced by `sorrel/schema-limits-are-named`, which refuses a bare number in a zod `.max()` or `.min()` (`.min(0)` and `.min(1)`, meaning not negative and not empty, pass), so each limit is a named constant; review catches a rule copied into a form.
4. **R4. Length limits are soft, with an error past the limit.** No text control carries `maxLength`. A limit shows through Field's `limit` prop as a character count, and the schema carries `.max(LIMIT, { error: limitMessage(LIMIT) })`, so going over is refused on Save and by the server. A fixed-length code (the two-factor code) keeps a hard `maxLength`, because an extra character is always a typo. A hard `maxLength` silently cuts pasted text, a screen reader does not announce that typing stopped, and the person cannot paste and then trim. Enforced by `sorrel/no-max-length-attribute`, which holds the fixed-length code files.
5. **R5. Tidy what is typed on blur; a mask is rare and deliberate.** Field's default `tidy` runs on blur with the server's own transform, and a custom `format` is the server's transform, never a copy. An amount shows thousands commas and saves without them; a comma is never a decimal mark. A mask (formatting while typing) is used only on a field the owner has approved, only through the one shared mask mechanism (Field's `mask` prop, or `useMask` for the chip colour hex box, which is not a Field; the `FieldMask` type in `src/lib/formats.ts`, `applyMask` and `useMask` in `src/components/Field/mask.ts`; the phone mask is `phoneMask` in `src/lib/phone-number.ts`), and it must not move the caret, break paste, refuse deletion of a character it added, or block characters silently; the saved value is the server's tidy. The approved masks are Business Cards' phone number, US first, and the chip colour hex box (`hexMask` in `src/lib/contrast.ts`). Masks often move the caret, break paste, block deletion and force one format, and most people type a different format from the example. Enforced by Field's default and by review.
6. **R6. Errors follow one pattern.** A field is checked when the person leaves it, re-checked as they type once it has shown an error, and an empty required field is flagged only on Save. Every react-hook-form form renders `FormErrorSummary` and sets `shouldFocusError: false`; a plain-state form gets the same timing by passing the rule to `PlainTextField`'s `check`, and gives each Save error through its field, which announces it. Enforced by `sorrel/use-form-renders-error-summary` for the summary, which fails a component that calls `useForm` without it, bar its named list.
7. **R7. An error message says what to do and gives an example** ("Enter an amount as a number, like 2.5"). A one-sentence message has no full stop. The form and the server show the same words because they share one schema. Enforced by review only.
8. **R8. A placeholder is empty or a sample of one or two words.** A rule about the value goes in the field's hint, never only in the placeholder. The articles "a", "an" and "the" are not counted, so "Add a name" is two words. Enforced by `sorrel/placeholder-is-short`, which refuses a JSX `placeholder` string over two words.
9. **R9. Attributes match the kind of field.** Names, identifiers and addresses have spell-check off; prose has it on. Addresses have `autoCapitalize="none"`. Email uses `type="email"`, phone `type="tel"`, a link `inputMode="url"`. Combobox takes the same attributes as the text fields. Autofill is specific, so a password manager fills credentials only into credential fields:
   - Field defaults to `autoComplete="off"`; a token is set only by choice, from the specific token list, never `"on"`.
   - Sign-in: the address uses `username` (or `email` where that is the sign-in identifier) and the password `current-password`; confirming a sensitive change uses `current-password`; a two-factor code uses `one-time-code`.
   - Setting or changing a password uses `new-password`.
   - A new email address uses `off`, not `email`, which would fill the old one.
   - No field outside sign-in and credential confirmation uses `username` or `current-password`.
   - A field for the person's own details carries its token (name, email, tel) for WCAG 1.3.5; a field for someone else's details has autofill off, with a comment saying why.
   - A non-credential field a password manager may mistake for one (an invitee's email, a search box) carries the managers' documented ignore attributes, only those a vendor's own documentation names.

   Enforced by Field's defaults and by review.

10. **R10. A date uses `DateField`**, with `min` and `max` from the shared day helpers such as `latestDay()`. A date is never a text field checked with a regex. Enforced by R1's lint rule.
11. **R11. A field that accepts only listed values is a select or a combobox restricted to the list.** A field that suggests values but accepts any text says so in its hint. Enforced by review only.
12. **R12. A link field accepts only what the page renders.** The editor's link dialog, the link plugin and the page renderer share one rule, `src/lib/link-address.ts`. An email address gains `mailto:` (the shared email rule decides), a bare host gains `https://`, and `http://` becomes `https://`. Enforced by R3.
13. **R13. Each new field is proved by three tests.** Its value is tidied when the person leaves it; a bad value is refused on Save, with the summary taking focus where the form has one; the server refuses the same value. Enforced by review, through `.claude/rules/testing.md`.
