# PageFrame

`src/components/PageFrame/` — the standard page frame, and its narrow variant for the forms and the sign-in pages (M11.9). It draws one element with the `.page-frame` class, and `.page-frame--narrow` with `narrow`. A page and its skeleton both draw it, so the skeleton's heading and body land where the page's do ([`loading.md`](../loading.md)).

## Props

`PageFrameProps` (`types.ts`):

| Prop        | What it is                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------- |
| `as`        | Optional: `main` (the default), the page's landmark, or `div` where a layout already holds the landmark |
| `narrow`    | Optional: the narrow frame the forms and the sign-in pages stand in                                     |
| `className` | Optional: a class added after the frame's own                                                           |
| `children`  | What the page draws inside the frame                                                                    |

## Contracts

- **One landmark per page.** A page uses the default `main`; a skeleton inside a body that already has the page's `main` passes `as="div"`.
- **It adds nothing but the classes.** No behaviour, no hook, no client directive.

## Styling

None of its own. `.page-frame` and `.page-frame--narrow` are primitives in `src/scss/_primitives.scss`. The frame gives up its bottom padding in the app shell, since the footer's own space is the whole gap under the last content.

## Stories

None of its own. Every page and skeleton story that draws a frame shows it.

## Testing

No file of its own: it renders a tag and classes. The e2e measurement of each skeleton against its page ([`loading.md`](../loading.md)) catches a page and its skeleton drifting apart.
