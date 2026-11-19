# SpellPreview

`src/components/SpellPreview/` is the Preview button on a spell's recipe page and the pane it opens: the spell full screen, with nothing else on screen.

## Contracts

### What it draws

- **The Preview button** (`PreviewButton`) sits in the recipe page's actions, before Print and Edit. Every role that can read the spell sees it, an observer included, because it changes nothing. A non-member never reaches it, because the page answers them with a 404 first.
- **The pane shows everything the printed spell shows, in print order**, by drawing the recipe's own body (`SpellRecipeBody`) and Ingredients summary (`SpellRecipeSummary`), so the two cannot drift. What print leaves out stays out: the Edited line, the back link and the page's actions. The page cuts the steps down with `previewStepsOf` (`preview-steps.ts`, on the server), so the props carry no Quick Look links, safety marks or stock verdicts.
- **The demo coven's notice** (`demoNotice`, a quiet warning `Notice` at the reading measure) is drawn at the top of the open pane, because the pane covers the layout's own. The recipe page passes the sentence from `src/lib/demo-notice.ts`. Any other coven passes nothing, and the pane draws none.
- **The layout is print's**, through the `recipe-columns` mixin (`src/scss/_recipe-columns.scss`) that `_print.scss` and the pane both use.
  - The column is at most `$recipe-sheet-width` wide: the printed sheet's content width (A4 210mm less two 15mm margins, 180mm) in the sheet's own 11pt rem, 46.39rem, which is 742px at the pane's 16px root. The pane's lines then hold the same characters as the paper's and break where they do.
  - Under `$shell-tablet-width` (56rem) the pane stacks (`$columns: false`), the width the recipe page stacks its own side column at.
- **The bar** at the top of the content, no wider than it, so the close X ends where the content does, holds two plain icon buttons: Screen Awake and Close. The bar is a row, not a float, so a long title never wraps around it. It scrolls away with the content. There is no site header, navigation, link or editing control.

### How it opens and closes

- **The address is the only state.** The pane is open while the address carries `?preview`, with no value, and there is no `useState` beside it. Preview pushes the address with `?preview` added by `window.history.pushState`, keeping the other parameters, which Next's `useSearchParams` follows without a server read. Browser Back closes the pane and Forward reopens it.
- **Close, Escape and leaving full screen all go through one `close`.** If this page visit pushed the entry, it goes back in history. If the page loaded with `?preview` (a direct link or a refresh), it replaces the address with one that drops `?preview`, so closing never leaves the site.
- **The pane is a native modal `<dialog>`** (`showModal()`): the browser puts it in the top layer, holds the page behind it inert and answers Escape with a `cancel` event. On its own it covers the window, which is the fallback where full screen is missing. It stays in the page and is closed with `close()`, so the browser gives focus back to Preview, without scrolling.
- **Full screen is asked of the page's root element, not the dialog**, because browsers refuse full screen for a `<dialog>` with a TypeError, and the modal stays in the top layer over a full-screen page. Element full screen is past the browser floor on some engines (iPhone Safari has none), so the call sits behind `typeof document.documentElement.requestFullscreen === 'function'` and a refused request is ignored. A page that loads with `?preview` opens the pane at once; full screen needs a user gesture, so the browser refuses it there and the pane is the window-covering dialog.
- **In full screen the browser takes the first Escape to leave full screen**, so the pane closes on `fullscreenchange` once it has been in full screen and is no longer. Close leaves full screen and closes.
- **While the pane is open only it scrolls.** The page behind holds still by CSS (`:root:has(.spell-preview:modal)` hides the root's overflow). `holdPage` from the Modal gives the scrollbar's room back as padding so the page does not shift sideways. The pane has `overscroll-behavior: contain`, an enhancement past the browser floor. The page keeps its scroll position, as only the query changes.

### Keeping the screen awake

`useWakeLock` (`use-wake-lock.ts`) asks for a screen wake lock while the pane is open and releases it on close.

- **The Screen Wake Lock API is past the browser floor on some engines**, so it sits behind an `in` check. Where the browser lacks it, or refuses the request, the pane works and no sign shows.
- **The browser drops the lock when the tab is hidden**, so it is asked for again when the tab is visible, unless the person turned it off. A pane that is closed and opened again asks afresh.
- **The Screen Awake icon button is the sign** (`LiddedEyeIcon`, the shown switch's eye). Its name stays "Screen Awake" and `aria-pressed` carries the state. Its tip says what a press does: "Let the Screen Sleep" while the lock is held, "Keep the Screen from Sleeping" when not. A press releases the lock or asks again.
  - While pressed the eye is in the accent colour and blinks on an 8s cycle. It stays still under reduced motion.

### The background

The pane is a page burning from its bottom-right corner, as a spell card does under the pointer ([`spell-card.md`](spell-card.md), "The smouldering edge"), with a hearth glow under the burn and embers rising from the glow and from the charred edge.

- **The burn uses the card's layers and the card's filter, with the preview's own size, timing and rim.** `index.scss` uses the card's smoulder partial for the layer shapes, three and a half times as deep (`$burn-depth * 3.5`) and twice as long along the bottom (`$burn-length * 2`), with the corner's curve scaled by the same two factors. Nothing the preview sets reaches the card: its colours are `--preview-*` properties and its rules are scoped to `spell-preview__` classes.
- **`SpellCardFilters` is drawn inside the pane while it is open**, because the spell page has no other copy of the burn filter.
- **The scene is mounted with the content**, so the burn comes in afresh on every open, with no class flip and no timer. The burn grows in over 3.5s on `cubic-bezier(0.6, 0.05, 0.4, 1)`, slow at both start and finish.
- **The rim reads, from the torn edge inward, as a bright line, an ember band, and char.** It is a stack of box-shadow rings on the hole and the curve, coloured by `--preview-char`, `--preview-char-line` and `--preview-scorch`. Those are the card's char tokens made stronger, kept separate so the card's char stays as it is.
- **After the burn-in, every loop runs by `opacity` or `transform` on a layer outside the displacement filter.** A change to anything filtered, or to anything inside it, redraws the filter's turbulence every frame. So the rim pulses on the outer `.spell-preview__burn` wrapper, and the glow, the hearth and the embers sit outside the filter altogether. Each loop starts on the value the burn-in ends on, so nothing steps when one hands over to the other. The burn spec (`tests/e2e/spell-preview-burn.spec.ts`) checks both rules frame by frame.
- **Heat travels along the rim** through four still copies of the burn (`.spell-preview__heat`, `data-burn-part="heat"`), each with hotter lines, masked to one stretch of the rim, and lit in turn by an opacity loop. A radial mask round the corner keeps the rim's rings off the window's other edges.
- **Nothing on the edge shows before the burn has reached it.** The heats, the flecks (`data-burn-part="fleck"`, specks catching in the char) and the edge embers wait in wrappers that fade in from the end of the burn-in.
- **Each ember is an `<i>`** placed and timed by custom properties from `embers.ts`, with a `shape` modifier picking one of four jagged outlines (`clip-path`). A hot ember has a white-hot core that flickers and cools as it rises. An ash flake rocks by `rotateX` as it rises, never past about 62°, so it never turns edge-on. An edge ember rises the same height in each stretch of its life, so it crosses each keyframe stop at one speed.
- **The paper is the burn hole's spread shadow**, so the hole's rounding carves it. The spread is `150vmax`, past the diagonal of any window, because a spread shadow rounds its far corner by the spread and a shorter one shows a dark cut at the top left of a window not much taller than wide.
- **The glow's strength and the fire colours are theme custom properties** (`--preview-glow`, `--preview-ember` and the other `--preview-*` names), set in the two theme blocks of `_mixins.scss` and aliased in `_variables.scss`. The text keeps at least 4.5:1 over the glow's brightest point.
- **The dialog paints nothing itself.** The face layer is `$surface-page` everywhere but the burn, where the `::backdrop`, the table (`$drawer-slot`), shows through. The scene is `aria-hidden`, takes no pointer, and sits behind the content.
- **Under reduced motion every animation is off**, pseudo-elements included. The burn is shown finished, the glow steady, and the embers, which are invisible until they rise, do not appear. The selectors that set a loop are kept no stronger than the reduced-motion rule (`:where()`), so that rule wins by coming later.

## Styling

The steps take their Recipe Card look from `SpellRecipe/index.scss`, which `SpellRecipeBody` imports, so the pane and the recipe page share one set of step rules. The glow is theme red at 0.12 (light, wax red) and 0.11 (dark, ember red).

## Not here

Stories: `index.stories.tsx`. Tests: `tests/components/SpellPreview/index.test.tsx` for what shows and when; the pane's behaviour in the browser is story 85, which also counts the intent's and the note's lines in the pane and in print and asserts the burn's spread reaches the top-left corner.
