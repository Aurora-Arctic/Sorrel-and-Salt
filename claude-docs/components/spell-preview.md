# SpellPreview

`src/components/SpellPreview/` is the Preview button on a spell's recipe page and the pane it opens: the spell full screen, with nothing else on screen. Props are in `types.ts`.

## Contracts

### What it draws

- **The Preview button** (`PreviewButton`, named "Preview Spell <title>") sits in the recipe page's actions, before Print and Edit. Every role that can read the spell sees it, an observer included, because it changes nothing. A non-member never reaches it, because the page answers them with a 404 first.
- **The pane shows everything the printed spell shows, in print order**, by drawing the recipe's own body (`SpellRecipeBody`) and Ingredients summary (`SpellRecipeSummary`), so the two cannot drift. That is the title, the intent and categories, the facts (Jar, Seal Wax, Moon Phase, Day), Ingredients, the Steps and the note. What print leaves out stays out: the Edited line, the back link and the page's actions. The page cuts the steps down with `previewStepsOf` (`preview-steps.ts`, on the server), so the props carry no Quick Look links, safety marks or stock verdicts.
- **The demo coven's notice** (`demoNotice`, a quiet warning `Notice` at the reading measure) is drawn at the top of the open pane, because the pane covers the layout's own. The recipe page passes the sentence from `src/lib/demo-notice.ts`. Any other coven passes nothing, and the pane draws none.
- **The layout is print's**, through the `recipe-columns` mixin (`src/scss/_recipe-columns.scss`) that `_print.scss` and the pane both use: title and lead across the top, the facts strip over both columns, Ingredients in a 17em column beside the steps, the note under them, and print's spacing throughout.
  - The column is centred and at most `$recipe-sheet-width` wide: the printed sheet's content width (A4 210mm less two 15mm margins, 180mm) in the sheet's own 11pt rem, 46.39rem, which is 742px at the pane's 16px root. The pane's lines then hold the same characters as the paper's and break where they do.
  - Under `$shell-tablet-width` (56rem) the pane stacks, Ingredients above the steps, with the same rows (`$columns: false`). That is the width the recipe page stacks its own side column at.
  - The steps carry a "Steps" heading, level with the Ingredients heading (`body.tsx`).
- **The bar** at the top of the content, no wider than it, so the close X ends where the content does, holds two plain icon buttons (`icon-tip__edit icon-tip__edit--plain`, a visually hidden name): Screen Awake and Close (`CloseIcon`, named "Close"). The bar is a row, not a float, so a long title never wraps around it. It is not sticky and scrolls away with the content. There is no site header, navigation, link or editing control.

### How it opens and closes

- **The address is the only state.** The pane is open while the address carries `?preview`, with no value, and there is no `useState` beside it. Preview pushes the address with `?preview` added by `window.history.pushState`, keeping the other parameters, which Next's `useSearchParams` follows without a server read. Browser Back closes the pane and Forward reopens it.
- **Close, Escape and leaving full screen all go through one `close`.** If this page visit pushed the entry, it goes back in history. If the page loaded with `?preview` (a direct link or a refresh), it replaces the address with one that drops `?preview`, so closing never leaves the site.
- **The pane is a native modal `<dialog>`** (`showModal()`): the browser puts it in the top layer, holds the page behind it inert and answers Escape with a `cancel` event. On its own it covers the window, which is the fallback where full screen is missing. It stays in the page and is closed with `close()`, so the browser gives focus back to Preview, without scrolling.
- **Full screen is asked of the page's root element, not the dialog**, because browsers refuse full screen for a `<dialog>` with a TypeError, and the modal stays in the top layer over a full-screen page. Element full screen is past the browser floor on some engines (iPhone Safari has none), so the call sits behind `typeof document.documentElement.requestFullscreen === 'function'` and a refused request is ignored. A page that loads with `?preview` opens the pane at once; full screen needs a user gesture, so the browser refuses it there and the pane is the window-covering dialog.
- **In full screen the browser takes the first Escape to leave full screen**, so the pane closes on `fullscreenchange` once it has been in full screen and is no longer. Close leaves full screen and closes.
- **While the pane is open only it scrolls.** The page behind holds still by CSS (`:root:has(.spell-preview:modal)` hides the root's overflow). `holdPage` from the Modal gives the scrollbar's room back as padding so the page does not shift sideways. The pane has `overscroll-behavior: contain`, an enhancement past the browser floor. The page keeps its scroll position, as only the query changes.
- **The pane's foot is `2.5rem` (40px) at every width**, written as `2.5rem` because no `space()` step equals it. It is `padding-bottom` on the pane.

### Keeping the screen awake

`useWakeLock` (`use-wake-lock.ts`) asks for a screen wake lock while the pane is open and releases it on close.

- **The Screen Wake Lock API is past the browser floor on some engines**, so it sits behind an `in` check. Where the browser lacks it, or refuses the request, the pane works and no sign shows.
- **The browser drops the lock when the tab is hidden**, so it is asked for again when the tab is visible, unless the person turned it off. A pane that is closed and opened again asks afresh.
- **The Screen Awake icon button is the sign** (`LiddedEyeIcon`, the shown switch's eye). Its name stays "Screen Awake" and `aria-pressed` carries the state. Its tip says what a press does: "Let the Screen Sleep" while the lock is held, "Keep the Screen from Sleeping" when not. A press releases the lock or asks again.
  - The eye's lid lifts when the lock is taken and comes down when it is let go, with the shown switch's motion. Where CSS cannot move a path the eye changes at once.
  - While pressed the eye is in the accent colour and blinks now and then (an 8s cycle, the lid closing once). It stays still under reduced motion.

### The background

The pane is a page smouldering from its bottom-right corner, as a spell card does under the pointer ([`spell-card.md`](spell-card.md), "The smouldering edge"), with a hearth glow under the burn and embers rising from the glow and from the charred edge.

- **The burn is the card's, layer for layer.** `index.scss` uses the card's smoulder partial for its timings, `ember-rim`, the glow's and the embers' gradients and the glow's box tokens. It sizes it from the card's lengths: half as deep again (`$burn-depth * 1.5`, 1.5rem) and twice as long along the bottom (`$burn-length * 2`, 21.8rem), with the corner's curve, the spill and the edge embers' places scaled by the same two factors.
- **`SpellCardFilters` is drawn inside the pane while it is open**, because the spell page has no other copy of the burn filter.
- **The scene is mounted with the content**, so the burn comes in afresh on every open, as keyframes that start from the card's resting state, with no class flip.
- **The rim, the embers in the burnt part and the spill on the table breathe by `opacity`**, not the card's `box-shadow` and `filter` frames. A pane kept awake runs for minutes, and opacity frames do not repaint.
- **Each ember is an `<i>`** placed and timed by custom properties from `embers.ts`: ten from the hearth glow, ten from the charred edge (measured in from the corner of a card's burn and scaled by the stylesheet), a quarter of them ash.
- **The paper is the burn hole's spread shadow**, so the hole's rounding carves it. The spread is `150vmax`, past the diagonal of any window, because a spread shadow rounds its far corner by the spread and a shorter one shows a dark cut at the top left of a window not much taller than wide.
- **The glow's strength and the ember colours are theme custom properties** (`--preview-glow`, `--preview-ember`, `--preview-ember-core`, `--preview-ember-char`, `--preview-ash`), set in the two theme blocks of `_mixins.scss` and aliased in `_variables.scss`. Light is the wax red at 0.12, dark the ember red at 0.08. The text keeps at least 4.5:1 over the glow's brightest point.
- **The dialog paints nothing itself.** The face layer is `$surface-page` everywhere but the burn, where the `::backdrop`, the table (`$drawer-slot`), shows through. The scene is `aria-hidden`, takes no pointer, and sits behind the content.
- **Under reduced motion every animation is off.** The burn is shown finished, the glow steady, and the embers, which are invisible until they rise, do not appear.

## Styling

`index.scss` holds the pane and the background.

- The pane (`.spell-preview`) is the native dialog sized to the whole window. Its edge space is `space(5)`, and `space(4)` at phone width (the page's side gutter there).
- The bar is `.spell-preview__bar`. The eye is `.spell-preview__awake`.
- The steps take their Recipe Card look from `SpellRecipe/index.scss`, which `SpellRecipeBody` imports, so the pane and the recipe page share one set of step rules.

## Not here

Stories: `index.stories.tsx`, "Grimoire / Spell Preview", `States`, with Closed, Open (with categories, a toxic step, a one-off and a step whose ingredient was deleted since, and the screen kept awake) and Screen Awake Off. Tests: `tests/components/SpellPreview/index.test.tsx` for what shows and when; the pane's behaviour in the browser is story 85, which also counts the intent's and the note's lines in the pane and in print and asserts the burn's spread reaches the top-left corner.
