# PageColumn

`src/components/PageColumn/` — the wide page column the lists and the entry pages stand in (M11.9). It draws one element with the `.page-column` class and holds what the page puts in it. A page and its skeleton both draw it, so the skeleton's heading and body land where the page's do ([`loading.md`](../loading.md)).

## Props

`PageColumnProps` (`types.ts`):

| Prop        | What it is                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------- |
| `as`        | Optional: `main` (the default), the page's landmark, or `div` where a layout already holds the landmark |
| `className` | Optional: a class added after `page-column`                                                             |
| `children`  | What the page draws inside the column                                                                   |

## Contracts

- **One landmark per page.** A page uses the default `main`. A skeleton drawn inside a body that already has the page's `main` (a section body, a tab's panel) passes `as="div"`, so the page keeps one `main`.
- **It adds nothing but the class.** No behaviour, no hook, no client directive, so a server page renders it directly.

## Styling

None of its own. `.page-column` is a primitive in `src/scss/_primitives.scss`: the column stacks its children `space(5)` apart, is centred, and is as wide as `$wide-column`, for the tables its pages hold. It is neither full height nor centred down the window, since a list page runs as long as its rows ([`styling.md`](../styling.md), "The page column").

## Stories

None of its own. Every page and skeleton story that draws a column shows it.

## Testing

No file of its own: it renders a tag and a class, and a test of that proves nothing. The skeleton guard and the e2e measurement of each skeleton against its page ([`loading.md`](../loading.md)) catch a page and its skeleton drifting apart.
