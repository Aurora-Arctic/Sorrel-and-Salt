# PageHeader

`src/components/PageHeader/` — a page's heading with its one primary action
on the same line, the action at the end: `/admin/compendium`'s Add Ingredient
beside its `h1` (the owner's call, M5.6). Nine admin pages wrote the
`.page-header` row and its heading by hand until MB.115. Since MB.115's
tabbed pages, the compendium is the one admin page that renders it: a tabbed
page's heading is `TabbedPage`'s and its action the tab's, in `TabActions`
([`tabbed-page.md`](tabbed-page.md)).

## Props

`PageHeaderProps` (`types.ts`):

| Prop     | What it is                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------- |
| `title`  | The `h1`, title case                                                                                          |
| `action` | Optional: the one primary action, an Add link as `<Link className="btn btn--solid">`, or a control of its own |

## Contracts

- **One `h1` per page, and this is it** on every page that renders it.
- **The action is the caller's element**: an Add link to the page's `?new`
  address, or a client component of its own. A page with no action leaves it
  out and keeps the same heading.
- **Server-safe.** It has no client directive and no hook, so a server page
  renders it directly.

## Styling

None of its own: `.page-header` is the primitive ([`styling.md`](../styling.md),
"Buttons"), the row centred and the action brought down to sit level with the
heading's letters. Under 28rem of its own width the action goes beneath the
heading, and in the admin area it spans the line there, so on a phone every
admin page's Add stretches across the column (the owner's call at MB.115's
review; [`styling.md`](../styling.md), "The admin layout"). The full width is
scoped to `.admin-layout`: the account page's raw `.page-header` keeps its
Sign Out at its natural width.

## Stories

[`index.stories.tsx`](../../src/components/PageHeader/index.stories.tsx),
`Layout / Page Header`: `WithAnAction` and `HeadingAlone`, the compendium's
heading, and `PhoneDark` and
`PhoneLight` with a longer heading at 375px, the action full width beneath
it. Each sits in `.admin-layout`, the frame that full width keys off.

## Testing

No file of its own (claude-docs/testing/layer-ownership.md, "What a test may
assert", rules 2 and 6): a heading is copy, and each admin page's e2e flow
reaches the action by its role and name.
