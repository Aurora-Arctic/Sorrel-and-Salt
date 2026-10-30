# Spinner

`src/components/Spinner/` — the small turning ring that says an action is in
flight (M12.33). `BusyButton`, `MenuButton` and `TextField`'s busy mark draw
it; nothing else should draw its own.

## Props

`SpinnerProps` (`types.ts`): `className`, optional, added beside `spinner`
(`TextField` passes `field__busy` to place it inside the field).

## Contracts

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

## Stories

`Feedback / Spinner`: one `States` story showing `Default` and `Larger` side by side.

## Testing

`tests/components/Spinner/index.test.tsx` asserts it is hidden. Each control
that uses it asserts its own busy state.
