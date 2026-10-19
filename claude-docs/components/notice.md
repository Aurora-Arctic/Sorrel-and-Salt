# Notice

`src/components/Notice/` — a sentence about the whole view rather than one
field, on the `.notice` primitive ([`styling.md`](../styling.md), "Form
fields"): a form's root error, a warning, a caution, a sent confirmation. Added by
MB.116, once the same markup had been written by hand in twenty-two files.

## Props

`NoticeProps` (`types.ts`):

| Prop        | What it is                                                                              |
| ----------- | --------------------------------------------------------------------------------------- |
| `kind`      | `error`, `warn`, `caution`, `success` or `plain`: the look and the role                 |
| `quiet`     | Optional: an error, warning or caution on the page from the start, as a status          |
| `id`        | Optional, for a control that names the notice in its `aria-describedby`                 |
| `className` | Optional layout class from the caller, added after the notice's own                     |
| `children`  | The sentence; a link inside it stays inline, in the notice's text colour and underlined |

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

**Another kind is a few lines**: a modifier class that sets `--notice-bar`
and, if it leads with the triangle, `--notice-icon`, joined to the triangle's
selector; then its role in `index.tsx` and a row in the table above. The
contrast floors each kind must clear, its bar at 3:1 as a graphic and its text
at 4.5:1 over its own tint on the page and on a card, are rows in
`tests/scss/tokens.test.ts`.

## Stories

[`index.stories.tsx`](../../src/components/Notice/index.stories.tsx), under
`Surfaces / Notice`: `Failure` (an error), `Warning`, `QuietWarning` (a
warning as a status), `Caution`, `Success` and `Plain`, one for each look and role in
the table above. `PhoneDark` and `PhoneLight` stack the five kinds at 375px
in each theme.

## Testing

`tests/components/Notice/index.test.tsx` asserts the role each kind takes, one
row per kind, and that a quiet warning or caution is a status. The look is the story's (`Surfaces / Notice`, both themes at
375px) and axe's on every page that shows one.
