# PageHeader

`src/components/PageHeader/` is every page's head: its heading with its one primary action on the same line, the action at the end, and, on the pages that carry them, an eyebrow above and a lede beneath. The action example is `/curator/compendium`'s Add Ingredient beside its `h1`. `TabbedPage` renders it too, with its row of tab pills beside the heading and the open tab's action at the end, which changes with the tab ([`tabbed-page.md`](tabbed-page.md)). The pills ride in as trailing children alongside the action, so the header has no slot for them. The compendium, with no tabs, renders it directly. Its props are in `types.ts` (`PageHeaderProps`).

## Contracts

- **One `h1` per page, and this is it.** Every page head is drawn here. A page or component that writes an `h1` of its own fails `tests/guards/page-heads.test.ts` ([`styling.md`](../styling.md), "Designing a section").
- **Two shapes.** With no eyebrow and no lede, the head is the `.page-header` row. With either, it is a `.header` column (`_layout.scss`): the eyebrow, the heading, or the `.page-header` row when there is a lead or an action, then the lede, spaced by the column's gap alone.
- **Who carries an eyebrow and a lede.** The public pages: the public Compendium has both, and the entry page's formal name is its eyebrow, drawn by `FormalName` above the `PageHeader`. The app's list pages (a coven's Ingredients and Grimoire, its Members, the admin Compendium and the other admin lists) have the heading alone. The screens outside the lists keep what says their purpose: the coven home's and the coven landing's eyebrow and lede, and the lede of Create Coven, Admin, the sign-in, email and invitation panels, Welcome, Not Authorized and the error pages.
- **A `lead` stays out of the heading.** With one, the `h1` and the lead share a `.page-header__title` row, so the heading reads as the title alone and the lead keeps its own name. The row takes the place the bare `h1` takes in the header's layout.
- **A `tag` sits inside the heading.** With one, the `h1` is a `page-title--tagged` grid: the title in its first column and the tag in the second, at the top of the row, so a wrapped title leaves the tag beside its first line ([`notice.md`](notice.md), "The demo coven's notice").
- **The action is the caller's element:** an Add link to the page's `?new` address (the admin lists' `AddAction`, which opens its modal at once, and the Grimoire's New Spell at `?new=spell`), or a client component of its own. A page with no action leaves it out and keeps the same heading.
- **Server-safe.** It has no client directive and no hook, so a server page renders it directly.

## Styling

None of its own. In the column shape `.header` spaces the parts and `.header > .page-header` drops the row's margin, so the gap alone spaces the heading's line from the eyebrow and the lede. The spell page lays the row out further in `.spell-recipe__head`: its marks and actions hang from the title's first line at every width ([`spell-recipe.md`](spell-recipe.md)).

`.page-header` is the primitive ([`styling.md`](../styling.md), "Buttons"): the row centred and the action brought down to sit level with the heading's letters (`position: relative; top`, not a `translate`, which would hold the Add's tip under the bar). That holds while the item shares the heading's line, and is cancelled where the action goes beneath.

- **Under 28rem of its own width** the action goes beneath the heading, at its natural width and the line's start, as every action is.
- **The exception is the shared Add** (`src/app/(shell)/curator/add-action.tsx`). At that width, and on a tabbed page from `$tabbed-plus-width` (680px of the header's own width) down, it is a plus icon button, a `$control-height` square, on the heading's line at its end, with its label as an `IconTip` ([`icon-tip.md`](icon-tip.md)). Wider, it is the labelled solid button and the tip never draws. The label stays in the page, visually hidden at the narrow width, so the link's name is the label at every width. This reverses the earlier rule that the admin area's actions span the line ([`styling.md`](../styling.md), "The page column").
- **The plus has a floor:** at or under `$add-below-width` (350px of the header's own width) the Add is the labelled button again, beneath the heading.
- **At the narrow width the heading takes the line less the plus** (`:has(.add-action)`, so a header with no Add keeps the action-beneath rule). A tabbed page's pills keep the line beside the plus until `$tabbed-reflow-width`, a threshold of its own ([`tabbed-page.md`](tabbed-page.md)).

## Not here

Stories: `src/components/PageHeader/index.stories.tsx` (`Layout / Page Header`, `States` and `Narrow`, which shows the header at 375px with the Add as a plus). Each state bar Eyebrow And Lede sits in the admin layout as it is, through the workshop's `AdminFrame`. Tests: none of its own (claude-docs/testing/layer-ownership.md, "What a test may assert", rules 2 and 6): a heading is copy, and each admin page's e2e flow reaches the action by its role and name.
