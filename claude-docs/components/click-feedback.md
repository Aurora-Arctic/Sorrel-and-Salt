# Click Feedback

`src/components/ClickFeedback/` is what a click outside a form says when it fails. The service's sentence appears in a callout under the control, read out as an alert. A small warning badge on the control brings the callout back once it has closed. The control's description carries the failure until a later try clears it. The rule, and the research behind it, is [`design-decisions/m12.31-click-feedback-outside-forms.md`](../design-decisions/m12.31-click-feedback-outside-forms.md), "Decision: Design F, the floating callout". Types are in `types.ts` (`ClickFeedbackOptions`, `ClickFeedback`, `Announce`).

## Contracts

```tsx
const { anchorRef, report, announce, feedback } = useClickFeedback({ name: 'Remove' });

return (
  <>
    <button type="button" className="btn" ref={anchorRef} onClick={onRemove}>
      Remove
    </button>
    {feedback}
  </>
);
```

- **`anchorRef`** goes on the control as its `ref`. The callout points at it and the badge sits on it.
- **`report(sentence)`** shows a failure: the callout opens and the badge appears. `report(undefined)` clears the badge, callout and description.
- **`announce`** says a sentence in the page's status region, for a click that worked. It does nothing on a page without the region.
- **`feedback`** is rendered directly after the control, so the badge is the next tab stop and the callout's Dismiss the one after.
- **`name`** is the control's visible name. The badge is labelled "Show the error for <name>".
- **What the control does after a success** is the control's own business, such as where the focus goes once a row removes itself.
- **The focus stays on the control** when a failure opens the callout. The alert is read out; it is not entered.
- **It closes** on Dismiss, on Escape, when the focus or a pointer press moves outside the control, its badge and its callout, and when another callout opens, because only one alert is on the screen at a time. Dismiss and Escape send the focus back to what opened the callout (the control for a failure, the badge for a reopening). Leaving by focus or pointer does not pull the focus back.
- **Escape is taken** (`preventDefault`), so a `<dialog>` the control sits in does not close with it.
- **Its listeners go on the control's own document** (`ownerDocument`), and what is ours is asked of the node rather than `instanceof Node`. A story Storybook draws into an iframe runs its script in the page around the frame, so the global `document` would hear neither the frame's keys nor its presses, and `instanceof Element` is false for the frame's nodes. The confirm overlay's focus return (`canFocus` in `src/components/Modal/confirm-overlay.tsx`) is asked the same way.
- **The badge is a toggle** (`aria-expanded`, `aria-controls`), and stays until `report(undefined)` or the next try.
- **A repeat failure is read again**: each open draws a new alert element.
- **The control's description** gains "Last try failed: <sentence>" through a `hidden` span named in its `aria-describedby`, beside any description it already had. It is `hidden` rather than visually hidden, because the span is read through the control and would otherwise be read twice.
- **The status region.** `StatusRegionProvider` (`status-region.tsx`, mounted in `src/app/layout.tsx` and the Storybook provider) draws one `<output>` (role `status`) with the page, so a screen reader is already listening when the first sentence arrives. The same sentence twice alternates a trailing no-break space, so it is read again. Without the provider `announce` does nothing and throws nothing.

### Placement

The callout is `position: fixed`, so no scrolling or clipping ancestor cuts it. It sits 20px below the control, its arrow under the control's middle (held 14px from its rounded corners). In order:

1. Its start under the control's start (`bottom-start`).
2. With no room for that, its end under the control's end (`bottom-end`).
3. With room for neither, pinned inside its box 16px from each side, its arrow still under the control.

- **Its box** is the nearest ancestor marked `data-tip-boundary`, as a tip's is, or the `<dialog>` the control sits in, or else the screen. A dialog counts so a callout does not run past its edge: in the admin's user modal at a desktop's width, its start under Change Role's would leave the dialog, so its end stands under the button's end. The dialog is a measure only and clips nothing of the fixed callout. The box is found and measured in the control's own document and window.
- **In a box narrower than the callout at its widest** (20rem, or the screen less 2rem), as that modal is on a phone, the callout narrows to the larger of the rooms the two alignments leave it, so it still stands under the control's start or end rather than pinned across the box. The `narrow` middleware sets `--click-feedback-room`, and Floating UI then measures again at the new width. A box that holds the callout at its widest leaves it as it is, and there room for neither alignment still pins it.
- **The callout is hidden until the script has placed it** (`is-placed`), and follows the control with `autoUpdate`. Its layer is `callout` (25), above the tips.
- **The badge is `position: absolute`**, so it scrolls and clips with its control. On a bordered control it is on the top-right corner. On a borderless control (a text button, a menu item) it is just right of it, centred vertically, `space(2)` (8px) clear. Floating UI places it touching the control and the stylesheet's margin holds it off, so the gap is a spacing token. An adopter leaves about 1.75rem clear to the right of such a control.
- **"Borderless" is read from the drawn style** when the failure is reported: every side with no width, no style, or a transparent colour. It is not read from a class, since every `.btn` has a border, `.btn--quiet` included.
- **`position.ts` reads the badge's side from Floating UI's `placement`**, not from a closure, because `useFloating` keeps its middleware while a new one prints the same source, so a closure would keep the first value it saw.
- **The badge is drawn at 1.2rem.** Its `::after` grows the press target to 24px (WCAG 2.5.8), only back over its own control and never outwards, so it covers no neighbour. On a corner it grows down and left. Beside a control it grows left and half each way up and down.

### Fades

The callout and the badge fade in and out at `$motion-short`, on the site's `fade-in` and `fade-out` keyframes (`_primitives.scss`). Under reduced motion neither fades.

- **The fade in starts only once the piece is placed** (`is-placed`). A piece is hidden until Floating UI has placed it, and a fade started at the mount would run while it was hidden and be spent before it shows.
- **The fade out is a second keyframe**, not the first run backwards. Changing only an animation's direction updates the finished animation in place rather than running it again, so the piece would jump to nothing.
- **A fading piece stays drawn**, `inert` and marked `is-closing`, until its animation ends or 400ms pass (`useFade`, `fade.ts`). Whether it is open (`aria-expanded`, the focus going back) never waits for the fade.

### Forced colours

The warning triangle is painted `CanvasText` by the `warning-mark` mixin. The badge's disc is `CanvasText` with the triangle cut out in `Canvas`, and a 2px `Canvas` outline stands in for its ring. The dismiss button takes a 1px inset `Highlight` outline under the pointer.

## Used by

- `ConfirmedAction` ([`user-list.md`](user-list.md)): every confirmed action outside a dialog says its refusal this way and its success through `announce`. Inside a dialog only the user modal's Change Role and Approve or Revoke do (`refusalInModal`); the others keep a notice in the dialog.
- `CupboardActions` ([`ingredient-entry.md`](ingredient-entry.md), the "One failure callout" paragraph): Make It Ours and Remove share one callout on the button that keeps the focus.
- `SignOutButton` ([`account-menu.md`](account-menu.md)) and the Remove and Add rows of [`sign-in-methods.md`](sign-in-methods.md).

## Not here

Stories: `index.stories.tsx`, "Surfaces / Click Feedback", `States` (Resting, Bordered, Borderless, Near Right Edge, Pinned) and `ThenSucceeds`. Each state but Resting presses its button once drawn, so it opens on the refusal. Tests: `tests/components/ClickFeedback/index.test.tsx`, and `tests/e2e/workshop/click-feedback.spec.ts`, which measures the stories in Storybook (`npm run e2e:workshop`, its own Playwright config with no database, on `WORKSHOP_PORT` and `WORKSHOP_HMR_PORT` in `tests/e2e/slots.ts`) at 1280px and 375px in both themes, with axe. Not verified: a real screen reader, and any browser but Chromium.
