# SpellPreview

The Preview button on a spell's recipe page (M13.12, story 85), and the pane it opens: the spell
full screen, with nothing else on screen. `src/components/SpellPreview/`.

## What it draws

- A Preview icon button (`PreviewButton`, named "Preview Spell <title>") in the recipe page's actions, before Print and Edit. Every role that can
  read the spell sees it, a viewer included: it changes nothing. A non-member never reaches it,
  because the page answers them with a 404 first.
- The pane, opened by the button: everything the printed spell shows, in print order, by drawing
  the recipe's own body (`SpellRecipeBody`) and Ingredients summary (`SpellRecipeSummary`), so the
  two cannot drift. That is the title, the intent and categories, the facts (Jar, Seal Wax, Moon
  Phase, Day), the Ingredients section (each amount in a column beside its name, both set to the left, the
  amount in bold), the Steps and the note. What print leaves out stays out: the Edited line, the back link and
  the page's actions. The page cuts the recipe's steps down with `previewStepsOf`
  (`preview-steps.ts`, on the server), so the pane's props carry no Quick Look links, safety marks
  or stock verdicts.
- The content is laid out as the printed page is, through the `recipe-columns` mixin
  (`src/scss/_recipe-columns.scss`) that `_print.scss` and the pane both use, so the two cannot drift:
  the title and the lead across the top, the facts strip over both columns, Ingredients in a 17em
  column beside the steps, the note under them, and print's spacing throughout (the grid's
  `space(2)` gap, the head's `space(4)` under it, the facts strip's `space(3) space(4)` margins, the
  note's `space(3)` over its rule).
  The column is centred and at most `$recipe-sheet-width` wide: the printed sheet's content width
  (A4 210mm less two 15mm margins, 180mm) in the sheet's own 11pt rem, 180mm ÷ 11pt = 46.39rem,
  which at the pane's 16px root is 742px, so the pane's lines hold the same characters as the
  paper's and break where they do (story 85 counts the intent's and the note's lines in both).
  Under `$shell-tablet-width` (56rem) the pane stacks, Ingredients above the steps, with the same
  rows and spacing (`$columns: false`); the columns fit well above that width, so the breakpoint
  stays the one the recipe page stacks its own side column at. The bar holding the controls is the
  same width and centred the same way, so the close X ends where the content does. The steps carry
  an "Instructions" heading, the Ingredients heading's twin and level with it, from `body.tsx`.
- Two controls at the end of the bar (at the top of the content, no wider than it), both plain icon buttons (`icon-tip__edit icon-tip__edit--plain`, a visually hidden name, no border, background or visible label): Screen Awake and Close (`CloseIcon`, an X, named "Close"). There is no site header, navigation, link or editing control.

## How it opens and closes

- The pane is open while the address carries `?preview`, with no value, and that is its only state: there is no `useState` beside it. Preview pushes the address with `?preview` added by `window.history.pushState`, keeping the other parameters, which Next's `useSearchParams` follows without a server read (as `?new=spell` does). Browser Back closes the pane and Forward reopens it.
- Close, Escape and leaving full screen all go through one `close`. If this page visit pushed the entry, it goes back in history; if the page loaded with `?preview` (a direct link or a refresh), it replaces the address with one that drops `?preview`, so closing never leaves the site.
- While the pane is open only it scrolls. The page behind holds still by CSS (`:root:has(.spell-preview:modal)` hides the root's overflow), `holdPage` from the Modal gives the scrollbar's room back as padding so the page does not shift sideways, and the pane has `overscroll-behavior: contain`, an enhancement past the browser floor. The bar with Close and Screen Awake is not sticky: it sits at the top of the content and scrolls away with it, its right edge on the content's. Escape still closes the pane.
- The pane's foot is 2.5rem (40px) at every width, written as `2.5rem` since no `space()` step equals it (the owner, 2026-10-30). It is `padding-bottom` on the pane, so the content ends that far above the bottom once scrolled to the end.
- A page that loads with `?preview` opens the pane at once. Full screen needs a user gesture, so there the browser refuses it, the refusal is ignored, and the pane is the window-covering dialog. Escape, Close and Screen Awake work as usual.
- The pane is a native modal `<dialog>` (`showModal()`): the browser puts it in the top layer,
  holds the page behind it inert and answers Escape with a `cancel` event. On its own it covers
  the window, which is the fallback where full screen is missing.
- Where the browser has element full screen, the pane asks for it as it opens. That is past the
  browser floor on some engines (iPhone Safari has none), so the call sits behind
  `typeof dialog.requestFullscreen === 'function'` and a refused request is ignored. The pane
  works the same either way.
- In full screen the browser takes the first Escape to leave full screen, so the pane closes on
  `fullscreenchange` once it has been in full screen and is no longer. Close leaves full screen
  and closes.
- The `<dialog>` stays in the page and is closed with `close()`, so the browser gives the focus back to
  Preview itself, without scrolling. The page keeps its scroll position, as only the query changes.

## Keeping the screen awake (M13.13)

`useWakeLock` (`use-wake-lock.ts`) asks for a screen wake lock while the pane is open and releases it on close.

- The Screen Wake Lock API is past the browser floor on some engines, so it sits behind an `in` check. Where
  the browser lacks it, or refuses the request, the pane works and no sign shows.
- The browser drops the lock when the tab is hidden, so it is asked for again when the tab is visible,
  unless the person turned it off.
- The Screen Awake icon button beside Close (`MysticEyeIcon`) is the sign. Its tip says what a press does: "Let the Screen Sleep" while the lock is held, "Keep the Screen from Sleeping" when not; the name stays "Screen Awake" and `aria-pressed` carries the state (the owner, 2026-10-30). It is pressed while the lock is held, and pressing it
  releases the lock or asks again. While pressed the eye is in the accent colour and blinks now and then (an 8s cycle, the lid closing once); it stays still under reduced motion. A pane that is closed and opened again asks afresh.

## The background

The pane is a page smouldering from its bottom-right corner, as a spell card does under the pointer
(claude-docs/components/spell-card.md, "How the burn is built"), with a hearth glow under the burn
and embers rising from the glow and from the charred edge. The owner chose it from the mock-ups as
C6 for the light theme and C6b for the dark.

- The burn is the card's, layer for layer: `index.scss` uses the card's smoulder partial for its
  timings, `ember-rim`, the glow's and the embers' gradients and the glow's box tokens, and sizes it from the card's lengths: half as deep again (`$burn-depth * 1.5`, 1.5rem)
  and twice as long along the bottom (`$burn-length * 2`, 21.8rem), with the corner's curve, the
  spill and the edge embers' places scaled by the same two factors, and `SpellCardFilters` is drawn inside the pane while it is open,
  since the spell page has no other copy of the burn filter. The scene is mounted with the content, so
  the burn comes in afresh on every open (the card's burn-in, as keyframes that start from the card's
  resting state) with no class flip.
- The rim, the embers in the burnt part and the spill on the table breathe by `opacity`, not the
  card's `box-shadow` and `filter` frames: a pane kept awake runs for minutes, and opacity frames do not
  repaint.
- Each ember is an `<i>` placed and timed by custom properties from `embers.ts`: ten from the hearth
  glow, ten from the charred edge (measured in from the corner of a card's burn, and scaled by the
  stylesheet to this one), a quarter of them ash. The paper itself is the burn hole's spread shadow,
  so the hole's rounding carves it; the spread is `150vmax`, past the diagonal of any window, because a
  spread shadow rounds its far corner by the spread and a shorter one showed a dark cut at the top
  left of a window not much taller than wide (story 85 asserts the spread reaches that corner).
- The glow's strength and the ember colours are theme custom properties (`--preview-glow`,
  `--preview-ember`, `--preview-ember-core`, `--preview-ember-char`, `--preview-ash`), set in the
  two theme blocks of `_mixins.scss` and aliased in `_variables.scss`: light is the wax red at 0.12,
  dark the ember red at 0.08. The text keeps at least 4.5:1 over the glow's brightest point.
- The dialog paints nothing itself: the face layer is `$surface-page` everywhere but the burn, where
  the `::backdrop`, the table (`$drawer-slot`), shows through. The scene is `aria-hidden`, takes no
  pointer, and sits behind the content.
- Under reduced motion every animation is off: the burn is shown finished, the glow steady, and the
  embers, which are invisible until they rise, do not appear.

## Styling

`index.scss` holds the pane and the background; "The background" above covers the burn, the glow
and the embers.

- The pane (`.spell-preview`) is the native dialog sized to the whole window. Its edge space is
  `space(5)`, `space(4)` at phone width (the page's side gutter there), and its foot space is
  `2.5rem` at every width, which no `space()` step equals. How the page behind holds still while it
  is open is in "How it opens and closes".
- The controls (`.spell-preview__bar`) are a row above the title, at the end, no wider than the
  content (`$recipe-sheet-width`), so the close X ends where the text does. A row and not a float,
  so a long title never wraps around them.
- The eye (`.spell-preview__awake`), while held on, wears the accent colour and blinks once in a
  long cycle; under reduced motion it stays still.

## Stories

`index.stories.tsx`, titled "Grimoire / Spell Preview", has one story, `Closed`: the preview for a
short spell (one ingredient step, one instruction) before it is opened. It is render-only; what
shows and when is asserted in `tests/components/SpellPreview/index.test.tsx`, and the pane's
behaviour in the browser by story 85.
