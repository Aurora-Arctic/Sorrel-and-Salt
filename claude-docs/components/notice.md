# Notice

`src/components/Notice/` — a sentence about the whole view rather than one
field, on the `.notice` primitive ([`styling.md`](../styling.md), "Form
fields"): a form's root error, a warning, a sent confirmation. Added by
MB.116, once the same markup had been written by hand in twenty-two files.

_See also_ [`m12.31-click-feedback-outside-forms.md`](../design-decisions/m12.31-click-feedback-outside-forms.md): how a click outside a form says its result and its failure, decided on 2026-10-20 as a floating callout (Design F), and the open question on when an alert may be mounted with its text. F replaced `ActionFailure`, which M12.31 removed; a failure inside a dialog, such as the owner-exit dialog of `LeaveWorkspaceButton`, stays in the dialog as a plain `Notice`.

## Props

`NoticeProps` (`types.ts`):

| Prop        | What it is                                                              |
| ----------- | ----------------------------------------------------------------------- |
| `kind`      | `error`, `warn`, `success` or `plain`: the look and the role together   |
| `quiet`     | Optional: an error or warning on the page from the start, as a status   |
| `id`        | Optional, for a control that names the notice in its `aria-describedby` |
| `className` | Optional layout class from the caller, added after the notice's own     |
| `children`  | The sentence; a link inside it stays inline                             |

## Contracts

- **The kind picks the role, and nothing else does.** A message that arrives
  after the page did is announced only because of its role, so the role
  travels with the look:

  | Kind      | Renders                                   | Role                      |
  | --------- | ----------------------------------------- | ------------------------- |
  | `error`   | `<p class="notice notice--error">`        | `alert`                   |
  | `warn`    | `<p class="notice notice--warn">`         | `alert`                   |
  | `success` | `<output class="notice notice--success">` | `status`, from `<output>` |
  | `plain`   | `<p class="notice">`                      | none                      |

  `<output>` carries the status role itself, so it takes no `role` attribute.

- **A warning is an alert too**: it leads with the error's triangle and asks
  for attention, even though it does not block.
- **`quiet` makes an error or warning a status** (an `<output>`, as success
  is) for one that is on the page from the start and must not interrupt: the
  user list's unverified-address warning, read once as the description of the
  button the focus lands on, and its paused-state line, which arrives with the
  page. The owner's call at MB.116's sign-off, so nothing stays hand-written.
- **A component renders the notice when it has something to say**, and not
  before: an empty alert announces nothing, and a live region mounted with
  its text is announced on arrival.

## Styling

None of its own: the primitive draws all four kinds, so the directory has no
`index.scss`. A caller's `className` is for its layout only, such as a row's
full-width line, never a colour.

## Stories

[`index.stories.tsx`](../../src/components/Notice/index.stories.tsx), under
`Surfaces / Notice`: `Failure` (an error), `Warning`, `QuietWarning` (a
warning as a status), `Success` and `Plain`, one for each look and role in
the table above. `PhoneDark` and `PhoneLight` stack the four kinds at 375px
in each theme.

## Testing

`tests/components/Notice/index.test.tsx` asserts the role each kind takes, one
row per kind, and that a quiet warning is a status. The look is the story's (`Surfaces / Notice`, both themes at
375px) and axe's on every page that shows one.
