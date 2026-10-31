# PasswordField

`src/components/PasswordField/` — one password control: a labelled input, a
show-password toggle, and, for a password being chosen, a strength meter.
Its users are the sign-in panel's form
([`sign-in-panel.md`](sign-in-panel.md), "Email and password"),
[`ResetPasswordForm`](reset-password-form.md) and
[`PasswordSection`](password-section.md).

## Props

`PasswordFieldProps` (`types.ts`):

| Prop       | What it is                                                                    |
| ---------- | ----------------------------------------------------------------------------- |
| `label`    | The visible label, title case: "Password", "New Password"                     |
| `value`    | The password typed so far                                                     |
| `onChange` | Called with each new value                                                    |
| `purpose`  | `current`, the password an account has, or `new`, one being chosen            |
| `error`    | Optional: the server's refusal, said under the field                          |
| `required` | Optional: marks the label and the control required, as every other field does |

## Contracts

- **`purpose` sets `autocomplete`**: `current-password` for `current`, so a
  password manager fills it, and `new-password` for `new`, so it offers to
  save one (DESIGN.md §8, "Passwords").
- **Nothing limits what is typed.** No `maxlength`, no `pattern`, nothing
  blocks paste: the server's length and breached-list checks are the only
  rules, and their refusals come back through `error`.
- **The toggle has a fixed name and a pressed state.** It is "Show <label>"
  with `aria-pressed`, rather than a name that flips between Show and Hide,
  so a screen reader hears one control that is on or off; its visible text
  says Show or Hide. Showing switches the input to `type="text"` with
  spelling, capital and correction fix-ups off.
- **A new password states its rules before any refusal**, as an InfoTip hint (`rules.ts`) the input also names in its description.
- **The meter advises and never refuses.** For `new` only, while the field shows no error (a refused password is never rated Strong), `meter.tsx` shows
  zxcvbn's score (Very Weak to Strong) and its warning, in a polite live
  region the input names in `aria-describedby`. `strength.ts`, which carries
  the dictionaries and most of the weight, is imported on the first
  keystroke, never with the page.

## Styling

Built from [`Field`](field.md)'s `FieldShell` and the existing `.input` and
`.btn` classes; `index.scss` places the toggle and adds no colour or size of
its own.

## Testing

`tests/components/PasswordField/index.test.tsx`: the `autocomplete` per
purpose, the toggle's pressed state and what it does to the input, paste
accepted, the meter only for `new`, and the error under the field.
