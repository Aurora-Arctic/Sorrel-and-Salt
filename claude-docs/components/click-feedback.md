# Click Feedback

`src/components/ClickFeedback/` — what a click outside a form says when it
fails: design F of M12.31. The service's sentence appears in a callout under
the control, read out as an alert; a small warning badge on the control brings
the callout back once it has closed; and the control's description carries
the failure until a later try clears it. The rule, and the research behind it,
is `claude-docs/design-decisions/m12.31-click-feedback-outside-forms.md` §5.
It replaces `ActionFailure` (`action-failure.md`) as the controls adopt it.

| File                | What it holds                                                                 |
| ------------------- | ----------------------------------------------------------------------------- |
| `index.tsx`         | `useClickFeedback`, the badge, the callout and the control's description      |
| `status-region.tsx` | `StatusRegionProvider` and `useAnnounce`, the page's one polite status region |
| `position.ts`       | Where the callout and the badge go, on Floating UI                            |
| `fade.ts`           | `useFade`: a piece kept drawn while it fades out                              |
| `index.scss`        | The callout, its arrow and Dismiss, and the badge with its press target       |
| `types.ts`          | `ClickFeedbackOptions`, `ClickFeedback`, `Announce`                           |
| `index.stories.tsx` | The workshop stories the layout spec measures                                 |

## Using it

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

| Returned    | What it does                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `anchorRef` | Goes on the control as its `ref`. The callout points at it and the badge sits on it.                                                        |
| `report`    | `report(sentence)` shows a failure: the callout opens and the badge appears. `report(undefined)` clears the badge, callout and description. |
| `announce`  | Says a sentence in the page's status region, for a click that worked. Does nothing on a page without the region.                            |
| `feedback`  | Rendered directly after the control, so the badge is the next tab stop and the callout's Dismiss the one after.                             |

`name` is the control's visible name; the badge is labelled "Show the error
for <name>".

What the control does after a success, such as where the focus goes once a
row removes itself, is the control's own business and not this component's.

## Behaviour

- **The focus stays on the control** when a failure opens the callout. The
  alert is read out; it is not entered.
- **It closes** on Dismiss, on Escape, when the focus or a pointer press moves
  outside the control, its badge and its callout, and when another callout
  opens: only one alert is on the screen at a time. Dismiss and Escape send the
  focus back to what opened the callout (the control for a failure, the badge
  for a reopening). Leaving by focus or pointer does not pull the focus back.
- **Escape is taken** (`preventDefault`), so a `<dialog>` the control sits in
  does not close with it.
- **The badge is a toggle** (`aria-expanded`, `aria-controls`), and stays until
  `report(undefined)` or the next try.
- **A repeat failure is read again**: each open draws a new alert element.
- **The control's description** gains "Last try failed: <sentence>" through a
  `hidden` span named in its `aria-describedby`, beside any description it
  already had. `hidden` rather than visually hidden, since the span is read
  through the control and would otherwise be read twice.

## The status region

`StatusRegionProvider`, in `src/app/layout.tsx` and the Ladle provider, draws
one `<output>` (role `status`) with the page, so a screen reader is already
listening when the first sentence arrives. The same sentence twice alternates a
trailing no-break space, so it is read again. Without the provider `announce`
does nothing and throws nothing.

## Placement

The callout is `position: fixed`, so no scrolling or clipping ancestor cuts it,
and sits 20px below the control, its arrow under the control's middle (held
14px from its rounded corners). In order:

1. Its start under the control's start (`bottom-start`).
2. With no room for that, its end under the control's end (`bottom-end`).
3. With room for neither, pinned inside its box 16px from each side, its arrow
   still under the control.

Its box is the nearest ancestor marked `data-tip-boundary`, as a tip's is, or
else the screen. It is hidden until the script has placed it (`is-placed`), and
follows the control with `autoUpdate`. Its layer is `callout` (25), above the
tips.

The badge is `position: absolute`, so it scrolls and clips with its control:

- **On a bordered control**, on its top-right corner.
- **On a borderless control** (a text button, a menu item), just right of it,
  centred on it vertically, a twelfth of its height clear. An adopter leaves
  about 1.4rem clear to the right of such a control.

"Borderless" is read from the drawn style when the failure is reported: every
side with no width, no style, or a transparent colour. It is not read from a
class, since every `.btn` has a border, `.btn--quiet` included.

`position.ts` reads the badge's side from Floating UI's `placement`, not from a
closure: `useFloating` keeps its middleware while a new one prints the same
source, so a closure would keep the first value it saw.

## The badge's press target

The badge is drawn at 1.2rem; its `::after` grows the press target to 24px
(WCAG 2.5.8), only back over its own control and never outwards, so it covers
no neighbour. On a corner it grows down and left; beside a control, left and
half each way up and down.

## Fades

The callout and the badge fade in and out at `$motion-short`, with
`list-frame-fade-in` (reversed to fade out). Under reduced motion neither
fades. A fading piece stays drawn, `inert` and marked `is-closing`, until its
animation ends or 400ms pass; whether it is open (`aria-expanded`, the focus
going back) never waits for the fade.

## Tests

- `tests/components/ClickFeedback/index.test.tsx` — opening, closing, focus,
  one alert at a time, the description, repeat reading, and the status region.
- `tests/e2e/workshop/click-feedback.spec.ts` — measured in the Ladle stories,
  since no page uses the component yet: the callout's place and both
  fallbacks, nothing moving as the callout and badge come and go, the badge's
  24px target covering no neighbour, the borderless badge beside its control,
  the fades and reduced motion, and axe, at 1280px and 375px in both themes.
- `tests/guards/tip-placement.test.ts` — every file placing something with
  Floating UI follows its control with `autoUpdate` and applies
  `floatingStyles`.

The workshop specs run in their own Playwright config against Ladle, with no
database: `npm run e2e:workshop`. Its server takes the slot block's next port
(`WORKSHOP_PORT` in `tests/e2e/slots.ts`, 8102 by default, `E2E_PORT_BASE`
plus 101); `npm run e2e` leaves them out.

Not verified: a real screen reader, and any browser but Chromium.
