# PageHeader

`src/components/PageHeader/` — every page's head: its heading with its one primary action
on the same line, the action at the end, and, on the pages that carry them, an eyebrow above
and a lede beneath. No page writes its own `h1`; `tests/guards/page-heads.test.ts` fails one
that does, bar the loading covers' visually hidden heading
([`styling.md`](../styling.md), "Designing a section"). The action example is `/admin/compendium`'s Add Ingredient
beside its `h1` (the owner's call, M5.6). Nine admin pages wrote the
`.page-header` row and its heading by hand until MB.115. Since MB.115's
tabbed pages, `TabbedPage` renders it too, with its row of tab pills beside the
heading and the open tab's action at the end, which changes with the tab
([`tabbed-page.md`](tabbed-page.md); the pills ride in as trailing children
alongside the action, so the header has no slot for them); the compendium, with no tabs, renders
it directly.

## Props

`PageHeaderProps` (`types.ts`):

| Prop        | What it is                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| `title`     | The `h1`, title case                                                                                                      |
| `id`        | Optional: the `h1`'s id, for a section or an article named by the heading (the coven landing's, the spell page's)         |
| `eyebrow`   | Optional: the small capitals above the heading, naming the part of the site. A list page in the app leaves it out         |
| `lede`      | Optional: the muted sentence or two under the heading, in a `p.lede`. A list page in the app leaves it out                |
| `lead`      | Optional: a mark before the heading, on its line and outside the `h1` (the entry page’s In Your Cupboard shelf)           |
| `action`    | Optional: the one primary action, an Add link as `<Link className="btn btn--solid">`, or a control of its own             |
| `className` | Optional: a class on the head's outer element, for the one caller that lays it out further (the sign-in panel centres it) |

## Contracts

- **One `h1` per page, and this is it.** Every page head is drawn here; a page or component that writes an `h1` of its own fails `tests/guards/page-heads.test.ts`.
- **Two shapes.** With no eyebrow and no lede, the head is the `.page-header` row. With either, it is a `.header` column (_layout.scss): the eyebrow, the heading, or the `.page-header` row when there is a lead or an action, then the lede, spaced by the column's gap alone.
- **Who carries an eyebrow and a lede.** The public pages: the public Compendium has both, and the entry page's formal name is its eyebrow, drawn by `FormalName` above the `PageHeader`. The app's list pages (a coven's Ingredients and Grimoire, its Members, the admin Compendium and the other admin lists) have the heading alone. The screens outside the lists keep what they say their purpose with: the coven home's and the coven landing's eyebrow and lede, and the lede of Create Coven, Admin, the sign-in, email and invitation panels, Welcome, Not Authorized and the error pages.
- **A `lead` stays out of the heading.** With one, the `h1` and the lead share a `.page-header__title` row, so the heading reads as the title alone and the lead keeps its own name; the row takes the place the bare `h1` takes in the header’s layout.
- **The action is the caller's element**: an Add link to the page's `?new`
  address (the admin lists' `AddAction`, which opens its modal at once, and
  the Grimoire's New Spell at `?new=spell`, M10.12), or a client component
  of its own. A page with no action leaves it
  out and keeps the same heading.
- **Server-safe.** It has no client directive and no hook, so a server page
  renders it directly.

## Styling

None of its own. In the column shape `.header` spaces the parts and `.header > .page-header` drops the row's margin, so the gap alone spaces the heading's line from the eyebrow and the lede. The spell page lays the row out further in `.spell-recipe__head`: its marks and actions hang from the title's first line at every width ([`spell-recipe.md`](spell-recipe.md)). `.page-header` is the primitive ([`styling.md`](../styling.md),
"Buttons"), the row centred and the action brought down to sit level with the
heading's letters (`position: relative; top`, not a `translate`, which would hold the Add's tip under the bar; it holds while the item shares the heading's line, and is cancelled where the action goes beneath). Under 28rem of its own width the action goes beneath the
heading, at its natural width and the line's start, as every action is. The
exception is the shared Add (`src/app/(shell)/admin/add-action.tsx`): at that
width, and on a tabbed page from `$tabbed-plus-width` (680px of the header's
own width, the owner's measure) down, it is a plus icon button, a
`$control-height` square, on the heading's line at its end, with its label as
an `IconTip` ([`icon-tip.md`](icon-tip.md)). The plus has a floor: at or under `$add-below-width` (350px of the header's own width) the Add is the labelled button again, beneath the heading. At the narrow width the heading
takes the line less the plus (`:has(.add-action)`, so a header with no Add
keeps the action-beneath rule); a tabbed page's pills keep the line beside
the plus until `$tabbed-reflow-width`, a threshold of its own
([`tabbed-page.md`](tabbed-page.md)). Wider, it is the labelled solid
button and the tip never draws. The label stays in the page, visually hidden at
the narrow width, so the link's name is the label at every width. This is the
owner's call at MB.7's review, 2026-10-12. It reverses MB.115's review, where
the admin area's actions spanned the line ([`styling.md`](../styling.md),
"The page column").

## Stories

[`index.stories.tsx`](../../src/components/PageHeader/index.stories.tsx),
`Layout / Page Header`: `States`, with a control that chooses Default and Heading Alone (the compendium's
heading), Long Heading With Action (a longer heading, Deity Traditions) and With Lead; `Narrow` shows the header at 375px, where the Add is a plus beside the heading. Each
sits in the admin layout as it is, through the workshop's `AdminFrame`: the
context row and nav above the `.page-column` column, the header in a `main`
as the compendium page draws it, with its own Add Ingredient.

## Testing

No file of its own (claude-docs/testing/layer-ownership.md, "What a test may
assert", rules 2 and 6): a heading is copy, and each admin page's e2e flow
reaches the action by its role and name.
