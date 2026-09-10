# ThemeToggle — transcript

Append-only. Newest entry at the bottom. Summary:
[`../../components/theme-toggle.md`](../../components/theme-toggle.md).

## 2026-09-10 — MB.1 — Reduced motion left a facet stuck holding `--out`

The facet swap parked an exited facet by listening for `transitionend` and
moving it from `--out` back to `--pre-enter`. Under
`prefers-reduced-motion: reduce`, `index.scss` sets `transition: none` on
`.theme-toggle` and `.theme-toggle__facet`, so no transition runs and the event
never fires. The outgoing facet kept `--out` — `rotate(130deg)` and still
opaque — sitting askew over the facet that had just entered, and every further
toggle compounded it.

Fixed in the click handler rather than the CSS: when
`window.matchMedia('(prefers-reduced-motion: reduce)')` matches, park the
outgoing facet directly instead of waiting on an event that isn't coming. The
listener path is untouched for everyone else, and the park itself was already
instant (`--pre-enter` carries its own `transition: none`), so both paths end in
the same state. The preference is read at click time, not cached at mount, so
changing the OS setting mid-session takes effect without a reload.

The alternative — keeping some non-zero transition alive under reduced motion
purely so the event still fires — was rejected: it reintroduces the motion the
preference exists to remove, to serve a bookkeeping need that belongs in JS.

The general shape is worth remembering beyond this component: **zeroing a
transition also removes the event anything was waiting on.** Any code that
treats `transitionend` as guaranteed has a reduced-motion bug in it.

## 2026-09-10 — MB.1 — Simulate it in the workshop instead of only documenting it

The `ReducedMotion` story previously just rendered like `Default`, with a
comment pointing at the OS/browser setting — Ladle runs in a real browser, so
`prefers-reduced-motion: reduce` reflects the actual environment and a story
can't flip it the way the toolbar flips the theme. That left the fix above
unexercisable in the workshop.

Added a second per-story pin alongside the existing `theme` one:
`ReducedMotion.meta = { reducedMotion: true }`. `.ladle/components.tsx` reads
it and does two things, both needed:

1. Patches `window.matchMedia` so `'(prefers-reduced-motion: reduce)'` reports
   a match — the exact check this milestone's fix added to the click handler.
2. Adds `.ladle-story-frame--reduced-motion` to the frame; its rule in
   `story-frame.scss` zeroes every transition inside it with `!important`,
   scoped to the frame rather than to `.theme-toggle`/`.theme-toggle__facet`
   specifically, because the real media feature turns off transitions
   app-wide, not just the one component a story happens to render.

Either half alone would understate the bug: the CSS change with no
`matchMedia` patch leaves the click handler still reading `matches: false` and
never taking the immediate-park branch; the patch with no CSS change lets a
real transition run and fire its own `transitionend`, which would still park
the facet, just correctly by accident rather than for the reason MB.1 fixed.
The patch restores the original `matchMedia` on cleanup so it can't leak into
whatever story renders next.

See [`workshop.md`](../../workshop.md) for the pin's full writeup — it isn't
ThemeToggle-specific, so a future component's story can reach for the same
`.meta = { reducedMotion: true }` without knowing this history.
