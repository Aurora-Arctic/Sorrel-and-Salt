# Component docs

One Markdown file per standalone component, lower-kebab-named after the
component directory (`theme-toggle.md` ↔ `src/components/ThemeToggle/`).

Several tasks name a component doc as an acceptance criterion, and the component
workshop discovers components by their `index.stories.tsx`; a component that
ships without its doc is an incomplete task.

A component doc records what someone needs to know before changing the
component that is not obvious from the code:

- contracts it shares with other code (a storage key, an exported helper, an
  attribute another module also writes);
- constraints that would otherwise look arbitrary — a value that must stay
  un-themed, a transition a property is deliberately kept out of;
- styling limits (which tokens and mixins it is allowed to use);
- what its tests cover, and anything not yet verifiable through the repo's own
  runner.

State the decision, not how it was reached. The reasoning behind a single
contested choice belongs in a decision record; blow-by-blow history belongs in
the PR that made it.

## The Navigation Shell (MB.7)

These five docs are written with the shell's components. The reasoning behind the
design is in [`../design-decisions/mb.7-navigation.md`](../design-decisions/mb.7-navigation.md).

| Doc                                  | Component                                                                                                                                    |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| [`app-shell.md`](app-shell.md)       | The frame around every signed-in page: the slim bar, the context row, the page's content, and the bottom-bar clearance on a phone            |
| [`public-frame.md`](public-frame.md) | The chrome round a public page for a signed-out visitor: skip link, site name, Compendium link, Sign In, and the page body that draws a wait |
| [`account-menu.md`](account-menu.md) | The disclosure in the bar offering Your Account and Sign Out, with a dot and a count linking to the pending coven invitations                |
| [`context-row.md`](context-row.md)   | The row under the bar: the coven switcher or "Admin" at the left, the section nav beside it                                                  |
| [`section-nav.md`](section-nav.md)   | The one section nav for the coven and admin areas: icon tabs in the context row, a bottom bar on a phone                                     |
| [`page-nav.md`](page-nav.md)         | A page's own menu of jump links to its sections, marking the one in view                                                                     |
| [`link-hint.md`](link-hint.md)       | A dot inside a link that shows the click took while the next page loads                                                                      |

## Lists

| Doc                                                  | Component                                                                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| [`ingredient-search.md`](ingredient-search.md)       | The list shell for finding ingredients by name: a debounced dropdown, filters, action, pager                  |
| [`category-chips.md`](category-chips.md)             | The row of category chips with its +N panel, shared by the card and the admin table                           |
| [`ingredient-card.md`](ingredient-card.md)           | One ingredient in a list: its name as the one link, formal name and forms, marks, caution, a jar-line slot    |
| [`ingredient-card-list.md`](ingredient-card-list.md) | The grid of ingredient cards every list page shares, with its card skeleton                                   |
| [`entry-marks.md`](entry-marks.md)                   | The Local, Compendium, Annotated and Retired badges, shared by the card and the entry page                    |
| [`spell-marks.md`](spell-marks.md)                   | A spell's or a working's Draft and Private badges, shared by the spell card, the recipe page and its workings |

## Stock

| Doc                                  | Component                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| [`stock-badge.md`](stock-badge.md)   | A jar's Low Stock or Out of Stock badge, and the threshold readout beside it on the jar line       |
| [`stock-fields.md`](stock-fields.md) | A jar's quantity, unit and low-stock threshold fields, for whichever form holds a jar              |
| [`stock-dialog.md`](stock-dialog.md) | The Edit Stock pencil on a coven card and the dialog that edits, adds and removes its jars         |
| [`jar-shelf.md`](jar-shelf.md)       | The shelf of drawn jars, one per form, on the entry page's Stock section, each opening Edit Stock  |
| [`jar-line.md`](jar-line.md)         | One line of a jar, name and words, shared by the recipe inventory and the Complete Working preview |

## Pages

| Doc                                          | Component                                                                                 |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [`ingredient-entry.md`](ingredient-entry.md) | An ingredient's page body on both entry routes: its own fields, then one section per form |
