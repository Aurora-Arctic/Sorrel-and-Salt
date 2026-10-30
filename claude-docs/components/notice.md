# Notice

`src/components/Notice/` — a sentence about the whole view rather than one
field, on the `.notice` primitive ([`styling.md`](../styling.md), "Form
fields"): a form's root error, a warning, a caution, a sent confirmation. Added by
MB.116, once the same markup had been written by hand in twenty-two files.

_See also_ [`m12.31-click-feedback-outside-forms.md`](../design-decisions/m12.31-click-feedback-outside-forms.md): how a click outside a form says its result and its failure, decided on 2026-10-20 as a floating callout (Design F), and the open question on when an alert may be mounted with its text. F replaced `ActionFailure`, which M12.31 removed; a failure inside a dialog, such as the owner-exit dialog of `LeaveWorkspaceButton`, stays in the dialog as a plain `Notice`.

## Props

`NoticeProps` (`types.ts`):

| Prop        | What it is                                                                                            |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| `kind`      | `error`, `warn`, `caution`, `success` or `plain`: the look and the role                               |
| `quiet`     | Optional: an error, warning or caution on the page from the start, as a status                        |
| `block`     | Optional: block content, a sentence with a list or buttons beneath it, in a `<div>`                   |
| `inRegion`  | Optional: inside a live region always in the page, so the notice takes no role                        |
| `id`        | Optional, for a control that names the notice in its `aria-describedby`                               |
| `className` | Optional layout class from the caller, added after the notice's own                                   |
| `children`  | The sentence, or with `block` the block content; a link stays in the notice's text colour, underlined |

## Contracts

- **The kind picks the role, and nothing else does.** A message that arrives
  after the page did is announced only because of its role, so the role
  travels with the look:

  | Kind      | Renders                                   | Role                      |
  | --------- | ----------------------------------------- | ------------------------- |
  | `error`   | `<p class="notice notice--error">`        | `alert`                   |
  | `warn`    | `<p class="notice notice--warn">`         | `alert`                   |
  | `caution` | `<p class="notice notice--caution">`      | `alert`                   |
  | `success` | `<output class="notice notice--success">` | `status`, from `<output>` |
  | `plain`   | `<p class="notice">`                      | none                      |

  `<output>` carries the status role itself, so it takes no `role` attribute.

- **The block form** (`block`, M12.48) holds what a sentence cannot: a
  sentence in its own `<p>` with a list, links and buttons beneath it, as
  the ingredient form's duplicates warning does. It draws a `<div>` with
  the same classes, so the same look, and the same role rules with the role
  written out: `role="alert"` for an error, warning or caution,
  `role="status"` for a success or a quiet one, none for plain. A `<p>`
  cannot hold a list or a button, nor an `<output>` anything but phrasing
  content, so neither element serves.

- **Inside a live region, a notice takes no role** (`inRegion`, M12.48). A
  region that a notice arrives in must already be in the page to be heard,
  so a component whose notice comes and goes keeps the region there, empty,
  and draws the notice inside it. The region announces what arrives in it;
  a role on the notice as well would make it a second live region inside
  the first, which a screen reader may announce twice. The look still
  follows the kind, so a held save can still turn a warning to an error.
  The region is a `<div role="status">` with an `aria-label`, rather than
  an `<output>`, when the notice is a block one.

  The other way was the notice as the region: one element, always in the
  page, taking the region's role and label. It was set aside because the
  region outlives the notice. Empty, it would still draw the bar, the tint
  and the padding with nothing to say; and the duplicates warning opens and
  closes by height round its notice, with a wrapper between the region and
  the notice that the notice cannot hold round itself. A notice inside the
  region keeps the region plain and the notice a notice. The duplicates
  warning and the ingredient form's skipped-copy notice both work this way
  ([`ingredient-form.md`](ingredient-form.md), "The duplicate warning" and
  "Copying from the ingredient").

- **A warning is an alert too**: it leads with the error's triangle and asks
  for attention, even though it does not block. **A caution** is a quieter
  warning: something worth knowing that asks nothing of the reader. It keeps
  the warning's role, an alert or, with `quiet`, a status; only its look is
  quieter (the owner's call, 2026-10-19). No call site uses it yet.
- **`quiet` makes an error, warning or caution a status** (an `<output>`, as success
  is) for one that is on the page from the start and must not interrupt: the
  user list's unverified-address warning, read once as the description of the
  button the focus lands on, and its paused-state line, which arrives with the
  page. The owner's call at MB.116's sign-off, so nothing stays hand-written.
- **A component renders the notice when it has something to say**, and not
  before: an empty alert announces nothing, and a live region mounted with
  its text is announced on arrival.

## Styling

None of its own: the `.notice` primitive in `_primitives.scss` draws every
kind, so the directory has no `index.scss`. A caller's `className` is for
its layout only, such as a row's full-width line, never a colour.

The look is the owner's, 2026-10-19. There is no box: a 3px bar runs down
the start edge, and behind the text sits a tint of the bar's colour, mixed
with transparent so it reads the same on the page and on a card. The tint's
strength is `--notice-tint`, set per theme in `_mixins.scss`: 7% on light,
8% on dark, where the same strength reads fainter. The tint is the owner's
call too, 2026-10-19, lowered from 10% and 12% for a lighter ground. The padding is
`space(2)` by `space(3)`, the type `small` at weight 400.

| Kind      | Bar and tint (`--notice-bar`) | Triangle (`--notice-icon`) | Text               |
| --------- | ----------------------------- | -------------------------- | ------------------ |
| `plain`   | `$accent`                     | none                       | body ink           |
| `error`   | `$secondary`                  | the text's colour          | `$secondary-hover` |
| `warn`    | `$warning`, the ochre         | `$warning`                 | body ink           |
| `caution` | `$text-muted`, the muted ink  | `$warning`                 | body ink           |
| `success` | `$accent`                     | none                       | `$accent-hover`    |

An error's and a success's text take the hover shade of their colour, the
darker one on light and the brighter on dark, rather than the colour itself:
the plain wax and sorrel fell short of 4.5:1 over their own tint (4.12:1 for
the dark error on a card, 4.34:1 and 4.09:1 for the light error and success
on the page). The hover shades are the owner's pick, 2026-10-19, over body
ink, which would have kept the colour to the bar and tint alone. As drawn, the
lowest text is the dark error on a card, at 5.62:1, and the lowest mark the
light caution's triangle over its grey tint on the page, at 4.46:1 (the
warning's is 4.47:1).

A button inside a warning or an error (`.notice--warn .btn`, `.notice--error .btn`) takes its label from `$notice-button-ink` (`--notice-button-ink`), not from `$accent`. On light the tint under the accent label measured 4.25:1 (warning) and 4.19:1 (error) on the page, under 4.5:1. The light value is `#33680f` (`$sorrel-notice-button`), 5.07:1 and 5.00:1 on the page and 5.61 and 5.53 on a card; dark keeps `$accent`, so its computed colours are unchanged. The border stays `$accent`, and a hover or a focus fills the button as any `.btn` does. The two buttons-in-notice rows in `tests/scss/tokens.test.ts` hold the floor on the page and the card. The owner chose this on 2026-10-23 over two other options: lighter tints (a 2% tint was needed, which leaves almost nothing of the tint) and a mix of both (a 5% tint with `#356f10`, 4.74:1 and 4.67:1).

**Another kind is a few lines**: a modifier class that sets `--notice-bar`
and, if it leads with the triangle, `--notice-icon`, joined to the triangle's
selector; then its role in `index.tsx` and a row in the table above. The
contrast floors each kind must clear, its bar at 3:1 as a graphic and its text
at 4.5:1 over its own tint on the page and on a card, are rows in
`tests/scss/tokens.test.ts`.

## Stories

[`index.stories.tsx`](../../src/components/Notice/index.stories.tsx), under
`Feedback / Notice`: `States`, a grid of Plain, Failed (an error), Warning, Quiet Warning (a
warning as a status), Caution and Success, one for each look and role in
the table above, and Block Warning and Block Failure, the block form with a
sentence, a list of links and a button. The toolbar viewport menu shows them at 375px.

## Testing

`tests/components/Notice/index.test.tsx` asserts the role each kind takes, one
row per kind, and that a quiet warning or caution is a status; that the block
form holds a sentence, a list and a button in every kind, with the same roles
and no list or button inside a paragraph or an `<output>`; and that a notice
`inRegion` takes no role, so the region round it is the one thing announced. The look is the story's (`Feedback / Notice`, both themes at
375px) and axe's on every page that shows one.

## The demo coven's notice

The `/coven/[slug]` layout draws a quiet warning (`kind="warn" quiet`, a status that never interrupts) under the `ContextRow` on every page of the demo coven (`workspace.demo`) and of no other. A viewer or member reads that it is a demo, that they may look at everything and change nothing, and that a coven of their own starts with an invitation; an owner (a site admin, seated by the system) reads that what they change is what every new account sees. The coven page's `<h1>` also carries a `badge badge--demo` reading "Demo" (tinted, in Local's inks). Tests: `tests/app/(shell)/coven/layout.test.tsx` and `page.test.tsx`. The notice stands in a `coven-layout__demo-notice` section with the content column's own width and gutter, so its box spans the content; the sentence sits in `coven-layout__demo-text`, which stops at the reading measure (`$measure`), the measure being on the text and never on the box.
