# BusyButton

`src/components/BusyButton/` — a button whose action can be in flight. While
it is, the button carries `aria-busy`, shows the [`Spinner`](busy-button.md#spinner) ahead of its
label, and its label says what is happening: "Save Name" becomes "Saving
Name". That is the owner's rule for every Save (M5.6; [`styling.md`](../styling.md),
"Buttons"). MB.115 wrote it once, after the same three pieces had been copied
into twenty-three buttons.

## Props

`BusyButtonProps` (`types.ts`): every attribute a `<button>` takes, a `ref`
among them, and two more.

| Prop        | What it is                                                              |
| ----------- | ----------------------------------------------------------------------- |
| `busy`      | Whether the action is in flight                                         |
| `busyLabel` | The label while busy, title case, saying what is happening              |
| `children`  | The label while idle                                                    |
| `type`      | Optional: `button` when left out, so a Save says `submit` itself        |
| `className` | Optional: `btn` when left out; a variant adds its own, `btn btn--solid` |

## Contracts

- **Busy is three things at once**: `aria-busy="true"`, the spinner, and the
  busy label. The spinner is `aria-hidden`, so a screen reader hears the
  label, "Saving Name", and the busy state.
- **`disabled` stays the caller's.** Most callers turn it on while busy, and
  for the reason they had before ("nothing to save", a cool-down). A button
  whose focus must stay while it works, such as one whose failure shows in a
  click-feedback callout (the banner's Stop Impersonating, Sign Out, the
  sign-in buttons; [`click-feedback.md`](click-feedback.md)), passes `aria-disabled` instead, which looks the same (`styling.md`,
  "Buttons", "Disabled is dashed and faded") but keeps the button focusable.
- **`type` defaults to `button`.** A bare `<button>` submits its form, so a
  form's non-submit action would submit it by accident.
- **An anchor is not a BusyButton.** `Pager`'s ends are links, and a link
  that navigates is never busy.
- **A list's navigation is not a BusyButton either.** A filter's Filter and a
  pager's end put the list's loading state up instead, the tabs' skeleton in
  place of the list ([`list-frame.md`](list-frame.md)).
- **A wait that ends with the browser leaving** is still a `BusyButton`: a
  sign-in provider's button calls `reportLeaving()` from `src/lib/navigation/`
  so the page bar stays up until the browser unloads. See
  [`../loading.md`](../loading.md).

## Styling

None of its own: `.btn` and its variants, the `Spinner`, and the
`.btn[aria-busy='true']` padding step are the primitives'.

## Stories

[`index.stories.tsx`](../../src/components/BusyButton/index.stories.tsx), `Forms / Busy Button`: `States` is a grid of Solid, Outline, Destructive and Small, each idle beside busy; `BusyKeepingFocus` is busy with `aria-disabled`.

## Testing

No file of its own (claude-docs/testing/layer-ownership.md, "What a test may
assert", rule 5): each form that uses it asserts its own busy state, by role
and `aria-busy`, as NameForm, EmailForm, SignInMethods, SignInPanel, SignOutButton and
InvitationAcceptance do.

## Spinner

`src/components/Spinner/` — the small turning ring that says an action is in
flight (M12.33). `BusyButton`, `MenuButton` and `TextField`'s busy mark draw
it; nothing else should draw its own.

### Props

`SpinnerProps` (`types.ts`): `className`, optional, added beside `spinner`
(`TextField` passes `field__busy` to place it inside the field).

### Contracts

- **Hidden from assistive technology** (`aria-hidden`). The control that
  holds it carries `aria-busy` and says what is happening in words.
- **It waits `$loading-delay` (100ms) before it shows**, so an action that
  finishes at once never flashes it. The wait is a CSS animation delay, not a
  timer: the `loading-appear` keyframe holds it at `visibility: hidden` until
  then. `visibility` is used so the wait survives under reduced motion, where
  the spin is swapped for the opacity pulse.
- **Motion goes through `loading-motion`** (`_mixins.scss`): a turn of
  `$spin-duration` (0.8s), or under reduced motion a pulse of
  `$pulse-duration` (2s) on the shared `loading-pulse` keyframe.
- It is `1em` square and takes the colour of the text around it, so it
  scales with its label.

- **A link's chain icon turns into it** while the link is pending
  ([`LinkIconHint`](link-hint.md)), in the icon's own `1em` box.

### Stories

`Feedback / Spinner`: one `States` story showing `Default` and `Larger` side by side.

### Testing

`tests/components/Spinner/index.test.tsx` asserts it is hidden. Each control
that uses it asserts its own busy state.
