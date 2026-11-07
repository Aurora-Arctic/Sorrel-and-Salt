# PasswordField

`src/components/PasswordField/` — one password control: a labelled input, a
show-password toggle, and, for a password being chosen, a strength meter.
Its users are the sign-in panel's form
([`sign-in-panel.md`](sign-in-panel.md), "Email and password"),
[`ResetPasswordForm`](reset-password-form.md) and
[`PasswordSection`](password-section.md). Built from [`Field`](field.md)'s `FieldShell`.

## Contracts

- **`purpose` sets `autocomplete`**: `current-password` for `current`, so a
  password manager fills it, and `new-password` for `new`, so it offers to
  save one (DESIGN.md §8, "Passwords").
- **Nothing limits what is typed.** No `maxlength`, no `pattern`, nothing
  blocks paste: the server's length and breached-list checks are the only
  rules, and their refusals come back through `error`.
- **The toggle has a fixed name and a pressed state.** It is "Show <label>"
  with `aria-pressed`, rather than a name that flips between Show and Hide,
  so a screen reader hears one control that is on or off; the eye
  (`MysticEyeIcon`, from `IconTip`) is the same in both states. Showing
  switches the input to `type="text"` with spelling, capital and correction fix-ups off.
- **A new password states its rules before any refusal**, as an InfoTip hint (`rules.ts`) the input also names in its description.
- **The meter advises and never refuses.** For `new` only, while the field shows no error (a refused password is never rated Strong), `meter.tsx` shows
  zxcvbn's score (Very Weak to Strong) and its warning, in a polite live
  region the input names in `aria-describedby`. `strength.ts`, which carries
  the dictionaries and most of the weight, is imported on the first
  keystroke, never with the page. The bar and the text line are drawn from the first
  render, the line holding one line of height, so nothing below them moves.
  The warnings are our own short ones (`SHORT_WARNINGS` in `strength.ts`, one
  per key of zxcvbn's English `warnings`, typed so a missing key fails the
  type check) in place of zxcvbn's, which run to 63 characters and wrapped.
  The longest line, "Very Weak. A common password.", measures 204px in Lexend 300
  at 13px, against the 224px of the narrowest card (320px viewport, 16px page
  gutters, 32px card padding). "Strength: " is in a visually hidden span: read
  aloud, not drawn, because it does not fit; the live region is empty until there is a verdict,
  so nothing is announced before one.
