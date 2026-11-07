# PageWithNav

`src/components/PageWithNav/` — a page with a jump menu beside its sections (M11.9). It draws one element with the `.page-with-nav` class, and `.page-with-nav--headless` with `headless`. A page and its skeleton both draw it, so the menu and the sections land where the page's do ([`loading.md`](../loading.md)).

## Props

`PageWithNavProps` (`types.ts`):

| Prop        | What it is                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------- |
| `as`        | Optional: `main` (the default), the page's landmark, or `div` where a layout already holds the landmark |
| `headless`  | Optional: the page has no heading of its own above the menu, as a tab of a tabbed page                  |
| `className` | Optional: a class added after the component's own                                                       |
| `children`  | The page's head, its menu and its sections                                                              |

## Contracts

- **One landmark per page.** A page uses the default `main`; a skeleton inside a body that already has the page's `main` passes `as="div"`.
- **`headless` moves the menu up a row.** With it, the page's menu starts on the grid's first row, because the heading stands above the tab's panel, not inside it.
- **It adds nothing but the classes.** No behaviour, no hook, no client directive.

## Styling

None of its own. `.page-with-nav` and `.page-with-nav--headless` are in `src/scss/_primitives.scss`: the menu is sticky beside the sections in a grid ([`page-nav.md`](page-nav.md)).

## Stories

None of its own. The coven home, the account and the entry skeletons show it.

## Testing

No file of its own: it renders a tag and classes. The e2e measurement of each skeleton against its page ([`loading.md`](../loading.md)) catches a page and its skeleton drifting apart.
