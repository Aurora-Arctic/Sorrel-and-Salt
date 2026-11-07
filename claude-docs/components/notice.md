# Notice

`src/components/Notice/` is a sentence about the whole view rather than one field, on the `.notice` primitive ([`styling.md`](../styling.md), "Form fields"): a form's root error, a warning, a caution, a sent confirmation.

Facts the props (`NoticeProps`) cannot say: `inRegion` is for a notice inside a live region that is always in the page. `result` gives the notice `tabIndex=-1` and `data-result`, for `useResultFocus` to focus. `id` is for a control that names the notice in its `aria-describedby`. A `className` from the caller is for layout only, never a colour. A link in the children stays in the notice's text colour, underlined.

How a click outside a form says its result and its failure is [`click-feedback.md`](click-feedback.md) ([`ui.md`, "Feedback from a click outside a form"](../design-decisions/ui.md#feedback-from-a-click-outside-a-form)). A failure inside a dialog, such as the owner-exit dialog of `LeaveWorkspaceButton`, stays in the dialog as a plain `Notice`.

## Contracts

- **The kind picks the role, and nothing else does.** A message that arrives after the page did is announced only because of its role, so the role travels with the look: `error`, `warn` and `caution` are alerts; `success` is an `<output>`, which carries the status role itself and takes no `role` attribute; `plain` has none.

- **`block` holds what a sentence cannot**: a sentence in its own `<p>` with a list, links and buttons beneath it, as the ingredient form's duplicates warning does. A `<p>` cannot hold a list or a button, nor an `<output>` anything but phrasing content, so it draws a `<div>` with the same classes and the role written out: `role="alert"` for an error, warning or caution, `role="status"` for a success or a quiet one, none for plain.
- **Inside a live region, a notice takes no role** (`inRegion`). A region that a notice arrives in must already be in the page to be heard, so a component whose notice comes and goes keeps the region there, empty, and draws the notice inside it. The region announces what arrives in it. A role on the notice as well would make a second live region inside the first, which a screen reader may announce twice. The look still follows the kind, so a held save can turn a warning to an error. The region is a `<div role="status">` with an `aria-label`, rather than an `<output>`, when the notice is a block one.
  - The notice is not itself the region because the region outlives the notice: empty, it would still draw its bar and tint.
  - The duplicates warning and the ingredient form's skipped-copy notice both work this way ([`ingredient-form.md`](ingredient-form.md), "The duplicate warning" and "Copying from the ingredient").
- **A warning is an alert too**: it leads with the error's triangle and asks for attention, even though it does not block. **A caution** is a quieter warning, something worth knowing that asks nothing of the reader. It keeps the warning's role, an alert or, with `quiet`, a status, and only its look is quieter. No call site uses it yet.
- **`quiet` makes an error, warning or caution a status** (an `<output>`, as success is), for one that is on the page from the start and must not interrupt: the user list's unverified-address warning, read once as the description of the button the focus lands on, and its paused-state line, which arrives with the page.
- **A component renders the notice when it has something to say**, and not before: an empty alert announces nothing, and a live region mounted with its text is announced on arrival.

## Styling

None of its own: the `.notice` primitive in `_primitives.scss` draws every kind, so the directory has no `index.scss`.

There is no box. A 3px bar runs down the start edge, with a tint of the bar's colour behind the text, mixed with transparent so it reads the same on the page and on a card. The tint's strength is `--notice-tint`, set per theme in `_mixins.scss` (7% light, 8% dark, where the same strength reads fainter). A notice that leads with the triangle pads its start by `$notice-mark-size`; the click callout and the ingredient form's notices read the same two tokens (`$notice-mark-size`, `$notice-mark-drop`).

| Kind      | Bar and tint (`--notice-bar`) | Triangle (`--notice-icon`) | Text               |
| --------- | ----------------------------- | -------------------------- | ------------------ |
| `plain`   | `$accent`                     | none                       | body ink           |
| `error`   | `$secondary`                  | the text's colour          | `$secondary-hover` |
| `warn`    | `$warning`, the ochre         | `$warning`                 | body ink           |
| `caution` | `$text-muted`, the muted ink  | `$warning`                 | body ink           |
| `success` | `$accent`                     | none                       | `$accent-hover`    |

- **An error's and a success's text take the hover shade of their colour**, because the plain wax and sorrel fall short of 4.5:1 over their own tint (4.12:1 for the dark error on a card, 4.34:1 and 4.09:1 for the light error and success on the page).
- **A button inside a warning or an error** (`.notice--warn .btn`, `.notice--error .btn`) takes its label from `$notice-button-ink` (`--notice-button-ink`), not from `$accent`, because on light the tint under the accent label measures 4.25:1 (warning) and 4.19:1 (error) on the page. The light value is `#33680f` (`$sorrel-notice-button`). Dark keeps `$accent`. The two buttons-in-notice rows in `tests/scss/tokens.test.ts` hold the floor on the page and the card.
- **Another kind is a few lines**: a modifier class that sets `--notice-bar` and, if it leads with the triangle, `--notice-icon`, joined to the triangle's selector; then its role in `index.tsx` and a row in the table above. Each kind must clear its bar at 3:1 as a graphic and its text at 4.5:1 over its own tint on the page and on a card, as rows in `tests/scss/tokens.test.ts`.

## The demo coven's notice

The `/coven/[slug]` layout draws a quiet warning (`kind="warn" quiet`, a status that never interrupts) under the `ContextRow` on every page of the demo coven (`workspace.demo`) and of no other.

- **Who reads what.** An observer or practitioner reads that it is a demo, that they may look at everything and change nothing, and that a coven of their own starts with an invitation. A steward (a site keeper, seated by the system) reads that what they change is what every new account sees.
- **The "Demo" tag.** The coven page's `<h1>` carries a `badge badge--demo` reading "Demo" (tinted, in Local's inks) as `PageHeader`'s `tag`. The `<h1>` is a two-column grid (`page-title--tagged`), the name in the first column and the badge in the second at the top of the row, so a wrapped name leaves the badge beside its first line.
- **The notice stands in a `coven-layout__demo-notice` section** with the content column's own width and gutter, so its box spans the content. The sentence sits in `coven-layout__demo-text`, which stops at the reading measure (`$measure`): the measure is on the text and never on the box.
- **The spell preview pane** (`SpellPreview`, `demoNotice`) draws the same notice at its top, since the pane covers the layout's. Both import the sentences from `src/lib/demo-notice.ts`.

## Result focus

- The submit button is disabled until the form is dirty again, and a disabled control cannot hold focus, so the browser would otherwise drop it to the page; `settle()` moves focus to the first invalid control inside ref, else to the Notice marked result.

## Not here

Stories: [`index.stories.tsx`](../../src/components/Notice/index.stories.tsx).

Tests: `tests/components/Notice/index.test.tsx`. The look is the story's and axe's on every page that shows one. The demo notice is tested in `tests/app/(shell)/coven/layout.test.tsx` and `page.test.tsx`.
