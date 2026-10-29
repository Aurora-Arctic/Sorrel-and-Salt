# SpellPreview

The Preview button on a spell's recipe page (M13.12, story 85), and the pane it opens: the spell
full screen, with nothing else on screen. `src/components/SpellPreview/`.

## What it draws

- A Preview button in the recipe page's actions, beside Edit and Delete Spell. Every role that can
  read the spell sees it, a viewer included: it changes nothing. A non-member never reaches it,
  because the page answers them with a 404 first.
- The pane, opened by the button: the spell's title, then its steps. Each ingredient step shows its
  label ("Testwort (Dried Leaf)") and amount, and an instruction step shows its text. The page
  cuts the recipe's steps down with `previewStepsOf` (`preview-steps.ts`, on the server), so the
  pane's props carry no Quick Look links, safety marks or stock verdicts.
- One control: Close. There is no site header, navigation, link or editing control.

## How it opens and closes

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
  Preview itself, without scrolling. The page never navigates, so it keeps its scroll position.

## Keeping the screen awake (M13.13)

`useWakeLock` (`use-wake-lock.ts`) asks for a screen wake lock while the pane is open and releases it on close.

- The Screen Wake Lock API is past the browser floor on some engines, so it sits behind an `in` check. Where
  the browser lacks it, or refuses the request, the pane works and no sign shows.
- The browser drops the lock when the tab is hidden, so it is asked for again when the tab is visible,
  unless the person turned it off.
- The Screen Awake button beside Close is the sign. It is pressed while the lock is held, and pressing it
  releases the lock or asks again. A pane that is closed and opened again asks afresh.
- A slow glow drifts behind the content. It stands still under reduced motion (the `reduced-motion` mixin).
