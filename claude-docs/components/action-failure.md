# ActionFailure

`src/components/ActionFailure/` — the place a refused action is said: one
alert above the controls it wraps, rather than beside the button that was
pressed. A narrow table cell, or a row drawn as a card on a phone, would wrap
a sentence beside its button, and two buttons side by side would each need
room for one. Added by MB.119, from the two copies the coven index (M6.15)
and the member list (M6.13) each carried.

**Being removed.** Design F replaces this component everywhere, and M12.31 removes it: the component, its story, its test and the three pages that use it move to the floating callout, and this doc is deleted in a later lane of that task. Until then the wrapper works as described below. A failure inside a dialog stays in the dialog, as a plain [`Notice`](notice.md). See [`m12.31-click-feedback-outside-forms.md`](../design-decisions/m12.31-click-feedback-outside-forms.md), section 5, for the callout and the owner's decision of 2026-10-20.

## Props

`ActionFailureProps` (`types.ts`):

| Prop       | What it is                                          |
| ---------- | --------------------------------------------------- |
| `children` | The controls whose refusals it says, above them all |

A control inside reaches it through the hook `useActionFailure()`, which
gives an `ActionFailureReport`: `report(message)` says the message, and
`report(undefined)` clears it, as a control does when it is tried again.

## Contracts

- **One alert, above the controls.** The latest report replaces the one
  before, so two refused presses never stack two alerts.
- **Outside a wrapper the hook gives `null`, not a report that does
  nothing.** A control checks for it and says its refusal beside itself
  instead, so a refusal is never dropped silently. A do-nothing default would
  let a control rendered outside a wrapper swallow its refusal with no sign
  anything went wrong.
- **It says what the control hands it**: the service's own sentence, already
  readable. It decides nothing about the refusal itself.
- **The alert is a `Notice` of kind `error`** ([`notice.md`](notice.md)), so
  it is announced when it appears, and renders only once there is something
  to say.

## Styling

None of its own: the alert is the `.notice` primitive's, and the directory has
no `index.scss`. Where it sits is the wrapper's place in the page.

## Stories

[`index.stories.tsx`](../../src/components/ActionFailure/index.stories.tsx),
`Surfaces / Action Failure`: `Default`, two buttons that each report a
refusal when pressed; `Refused`, the alert already above them; and
`PhoneDark` and `PhoneLight`, refused at 375px in each theme.

## Testing

`tests/components/ActionFailure/index.test.tsx`, with a control of the test's
own calling `useActionFailure()?.report`: no alert before a press, then an
alert that comes before the control in the page's order; and the hook giving
`null` outside a wrapper.
