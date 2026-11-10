# PageHeader

`src/components/PageHeader/` is every page's head: its heading with its one primary action on the same line (the action at the end), and, on the pages that carry them, an eyebrow above and a lede beneath. `TabbedPage` renders it with its tab pills as trailing children beside the action, which changes with the open tab ([`tabbed-page.md`](tabbed-page.md)). Props: `PageHeaderProps` in `types.ts`. It is server-safe: no client directive, no hook.

## Contracts

- **One `h1` per page, and this is it.** A page or component that writes an `h1` of its own fails `tests/guards/page-heads.test.ts` ([`styling.md`](../styling.md), "Designing a section").
- **Two shapes.** With no eyebrow and no lede, the head is the `.page-header` row. With either, it is a `.header` column (`_layout.scss`): eyebrow, the heading (or the `.page-header` row when there is a lead or an action), then the lede, spaced by the column's gap alone.
- **Who carries an eyebrow and a lede.** The public Compendium has both, and the entry page's formal name is its eyebrow, drawn by `FormalName` above the `PageHeader`. The app's list pages (a coven's Ingredients, Grimoire and Members, the admin Compendium and other admin lists) have the heading alone. Screens outside the lists keep what says their purpose: the coven home's and landing's eyebrow and lede, and the lede of Create Coven, Admin, the sign-in, email and invitation panels, Welcome, Not Authorized and the error pages.
- **`level` lowers the heading** for a head inside something that has its own: `h2` where a page already has its `h1`, and `h3` for the sign-in panel's email form and two-factor step inside the sign-in dialog, under the dialog's title.
- **A `lead` stays out of the heading.** The `h1` and the lead share a `.page-header__title` row, so the heading reads as the title alone and the lead keeps its own name.
- **A `tag` sits inside the heading.** The `h1` is a `page-title--tagged` grid with the tag in the second column at the top of the row, so a wrapped title leaves the tag beside its first line ([`notice.md`](notice.md), "The demo coven's notice").
- **The action is the caller's element**: an Add link to the page's `?new` address (the admin lists' `AddAction`, which opens its modal at once; the Grimoire's New Spell at `?new=spell`) or a client component of its own. A page with no action keeps the same heading.

## Styling

In the column shape `.header > .page-header` drops the row's margin, so the gap alone spaces the heading from the eyebrow and lede. The spell page hangs its marks and actions from the title's first line at every width in `.spell-recipe__head` ([`spell-recipe.md`](spell-recipe.md)).

`.page-header` is the primitive ([`styling.md`](../styling.md), "Buttons"): the action is brought down to sit level with the heading's letters with `position: relative; top`, not a `translate`, which would hold the Add's tip under the bar. That is cancelled where the action goes beneath.

- **Under 28rem of its own width** the action goes beneath the heading, at its natural width and the line's start.
- **The exception is the shared Add** (`src/app/(shell)/_admin/add-action.tsx`). At that width, and on a tabbed page from `$tabbed-plus-width` (680px of the header's own width) down, it is a `$control-height` plus icon button on the heading's line at its end, its label an `IconTip` ([`icon-tip.md`](icon-tip.md)). Wider, it is the labelled solid button and the tip never draws. The label stays in the page, visually hidden at the narrow width, so the link's name is the label at every width. This reverses the rule that the admin area's actions span the line ([`styling.md`](../styling.md), "The page column").
- **The plus has a floor**: at or under `$add-below-width` (350px of the header's own width) the Add is the labelled button again, beneath the heading.
- **At the narrow width the heading takes the line less the plus** (`:has(.add-action)`, so a header with no Add keeps the action-beneath rule). A tabbed page's pills keep the line beside the plus until `$tabbed-reflow-width` ([`tabbed-page.md`](tabbed-page.md)).

## Stories and tests

`src/components/PageHeader/index.stories.tsx` (`Layout / Page Header`, `States` and `Narrow`, the header at 375px with the Add as a plus). No tests of its own (claude-docs/testing/layer-ownership.md, "What a test may assert", rules 2 and 6): a heading is copy, and each admin page's e2e flow reaches the action by role and name.
