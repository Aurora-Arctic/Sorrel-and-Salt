# BusyButton

`src/components/BusyButton/` — a button whose action can be in flight. While
it is, the button carries `aria-busy`, shows the [`Spinner`](spinner.md) ahead of its
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
  whose focus must stay while it works, such as the banner's Stop Impersonating,
  passes `aria-disabled` instead, which looks the same (`styling.md`,
  "Buttons", "Disabled is dashed and faded") but keeps the button focusable.
- **`type` defaults to `button`.** A bare `<button>` submits its form, so a
  form's non-submit action would submit it by accident.
- **An anchor is not a BusyButton.** `Pager`'s ends are links, and a link
  that navigates is never busy.
- **A list's navigation is not a BusyButton either.** A filter's Filter and a
  pager's end put the list's loading state up instead, the tabs' skeleton in
  place of the list ([`list-frame.md`](list-frame.md)).

## Styling

None of its own: `.btn` and its variants, the `Spinner`, and the
`.btn[aria-busy='true']` padding step are the primitives'.

## Stories

[`index.stories.tsx`](../../src/components/BusyButton/index.stories.tsx),
`Forms / Busy Button`: `Solid`, `Outline`, `Destructive` and `Small`, each
idle beside busy; `BusyKeepingFocus`, busy with `aria-disabled`; and
`PhoneDark`/`PhoneLight`.

## Testing

No file of its own (claude-docs/testing/layer-ownership.md, "What a test may
assert", rule 5): each form that uses it asserts its own busy state, by role
and `aria-busy`, as NameForm, EmailForm, SignInMethods, SignOutButton and
InvitationAcceptance do.
