# MB.121: Design review of the workspace ingredients page

The design review of a coven's Ingredients section: the list of cards, its
filters and empty states, the Edit Stock dialog, the Quick Look window, and the
entry page with its shelf of jars. It records what was changed, what was only
mocked, what the accessibility audit found, which repeated code was merged, and
the research each change rests on. The task is MB.121 in
[`tasks/mb.md`](../tasks/mb.md); the review method is
[`styling.md`](../styling.md), "Designing a section".

Items marked **OWNER DECIDES** wait for the owner's call. Everything else is
done and committed on `feature/mb.121-design-review-the-workspace-ingredients-page`.

## What was changed

| Change                                                                                            | Kind               | Can be dropped alone |
| ------------------------------------------------------------------------------------------------- | ------------------ | -------------------- |
| The entry page's Stock section loses its `.panel` box                                             | Required by MB.121 | No                   |
| Icon buttons, the stock dialog's jar picks and the dialog's Close draw the shared focus ring      | Accessibility fix  | Yes                  |
| The amount text, the stock tip button and the Low and Out inks are shared (the DRY merges, below) | Repetition         | No                   |
| Proposal P1: the shelf draws the card badge's Low or Out symbol before a jar's amount             | Proposal           | Yes                  |
| Mocks of the options not built, as Storybook stories under `Proposals / MB.121`                   | Mocks              | Yes                  |

Behaviour is unchanged by all of them: no press, route, name or saved value
differs.

## The Stock section without its panel

The Stock section on the entry page sat in a `.panel` box, the only section
there that did. The box is gone. What sets the section apart now is what sets
every other section of the page apart: its `h2` heading, "Stock", and the
page's section spacing. The shelf of jars beneath it is drawn and needs no box
to read as one group ([`ingredient-entry.md`](../components/ingredient-entry.md)).

## Proposal P1: a symbol beside a Low or Out amount

**The problem.** On the shelf, a Low jar and an Out jar were told from a full
one chiefly by colour: an amber or red jar, and its amount in the same colour.
The jar's shape differs a little (a dashed mark at the threshold, an empty
outline for Out), but at the shelf's size the difference is a thin line. A
person who cannot tell amber or red from the ink beside it reads three plain
jars. The capture `audit/zoom-shelf-light.png` (in the review's screenshots)
shows it.

WCAG's success criterion 1.4.1 asks that colour is "not used as the only visual
means of conveying information", and its advice is to "use information in
addition to color, such as shape or text".[^wcag141] GOV.UK's Tag component
says the same of status labels: "Do not use colour alone".[^govuktag]

**The options.**

| Option                 | What it draws                                              | Told without colour?                        |
| ---------------------- | ---------------------------------------------------------- | ------------------------------------------- |
| Before (as it was)     | Amber or red jar and amount                                | Barely: a thin dashed mark or outline       |
| **P1, symbol (built)** | The card badge's own Low or Out drawing, before the amount | Yes: a shape, the one the card already uses |
| P1b, word              | "Low" or "Out" written under the amount                    | Yes: a word                                 |
| P1c, heavier mark      | The threshold mark and outline drawn thicker               | Partly: still a line, still mostly colour   |

**I recommend P1.** The symbol is the one the ingredient card's `StockBadge`
already draws, so a person who has learned it on a card reads it on the shelf
with nothing new to learn. Its name is spoken already, since the amount button
is named "5 g, Low Stock". Harley advises that "icon labels should be visible
at all times";[^harley] on the shelf the visible label is the amount beside the
symbol, and the tip names the state in words. P1b would be clearer to a newcomer
but adds a line of text under every flagged jar. P1c does not meet 1.4.1 by
itself.

**OWNER DECIDES: P1, P1b, P1c, or none.** On 2026-10-21 the owner ruled out
"an extra word and an icon" on the shelf. P1 goes against the icon half of
that call, for the reason above. It is its own commit, so it can be dropped.
The mocks show each option in both themes at 1280px and 375px.

## The accessibility audit

### How it was run

- **Automated checks:** axe, through `@axe-core/playwright`, on every page and
  dialog of the section: the list, the filters, the Edit Stock dialog (opened,
  and with an unsaved change), Quick Look, the edit dialog, the delete
  question, the entry page (a compendium entry and the coven's own), the empty
  cupboard and its Add dialog, a search with no match, and a viewer's list and
  entry page. Each in the light and the dark theme, at 1280px and 375px wide:
  56 runs.
- **Sideways scroll:** the same 56 runs measured the page's scroll width
  against its client width.
- **Keyboard:** a Tab walk through the list, the Edit Stock dialog (before
  and after an unsaved change) and the entry page, recording each stop, its
  name and whether it drew a ring.
- **Screen reader:** **not a run with a real screen reader.** It was a reading
  of the accessibility tree, the names, roles, states and descriptions a
  screen reader is given, through Playwright's `ariaSnapshot()` and the
  accessible-description queries. What a given screen reader then speaks
  (VoiceOver, NVDA, JAWS) was not heard.

### What it found

- **axe:** no violations in any of the 56 runs, contrast included. Contrast at
  4.5:1 for text holds in both themes.
- **Sideways scroll:** none in any run, at 375px included.
- **Focus rings:** the icon buttons, the stock dialog's jar picks and the
  dialog's Close drew Chromium's own default ring, since nothing set one.
  Fixed: each now draws the shared focus ring
  ([`styling.md`](../styling.md), "The focus ring"). Icon links keep the
  accent ring every link has. **OWNER DECIDES** whether to keep this commit;
  I recommend keeping it, since every other control already draws the shared
  ring.
- **Names a screen reader can tell apart:** every jar button is named for the
  ingredient, its formal name and the form, "Edit Stock, Rosemary, Salvia
  rosmarinus, Herb". A flagged amount is its own button, named for the
  amount and the state, "5 g, Low Stock", and described by its threshold,
  "Low Stock at 10 g or less". An Out amount, "0 ml, Out of Stock", has no
  description, by design, since its name says all there is.
- **The edited jar:** in the Edit Stock dialog, the chosen jar has the green
  fill and `aria-current="true"`, and a jar with an unsaved change reads
  "Herb, Edited, 12 g", with "Edited" shown in italics beside it. Flaherty's
  guidance puts an indicator beside the item it describes, which this
  does.[^flaherty]
- **The shelf by keyboard:** each jar is one Tab stop, and a flagged amount is
  the next; Enter or Space opens the dialog or the tip, as on any button.
  Nothing on the shelf needs a pointer. A jar's ring is drawn on its stretched
  `::after`, inside the cell, so the Tab walk's reading of the button's own
  outline said "no ring" there; the captures in `audit/focus/` show the ring.
- **The empty page speaks its state three times:** a hidden count "No
  ingredients", the search sentence's status "No ingredients", and the region
  "No Ingredients" holding "There are no ingredients here yet." and the Add
  Ingredient button. **OWNER DECIDES** whether to trim it; I recommend leaving
  it for now and writing it down for the M9.1 story audit, since the three come
  from three components each correct alone.

### The dialog and the Tab key

The Edit Stock dialog is a native `<dialog>` opened with `showModal()`. Tab past
its last control goes out to the browser's own controls (the address bar) and
back in, rather than wrapping to the dialog's first control. The ARIA Authoring
Practices Guide's dialog pattern says Tab should wrap inside the
dialog.[^apg] Lawson records the disagreement: some
accessibility experts side with the guide, while Scott O'Hara calls the native
behaviour "good behavior, not a bug".[^lawson] It is not a keyboard trap under WCAG 2.1.2, since focus can
always leave and return.

**OWNER DECIDES: keep the native behaviour, or wrap Tab by script.** I
recommend keeping it: the page behind is inert, so focus never reaches it, and
wrapping by hand is the trap code the Modal deliberately does without
([`modal.md`](../components/modal.md), "Contracts").

### A viewer's empty cupboard

A viewer, who may add nothing, sees only "There are no ingredients here yet."
Kaplan's first guideline for empty states is to "tell the user what could be
displayed, and how to populate the area".[^kaplan] A viewer cannot populate it,
but can be told who can. The mock `Viewer Empty Cupboard` adds "A member or
owner of this coven can add them."

**OWNER DECIDES: the sentence alone, or the added line.** I recommend the added
line: it tells a viewer the empty cupboard is not a fault and who to ask.

### Tags that are buttons

GOV.UK's Tag says "Do not make a tag interactive".[^govuktag] The `StockBadge`
and the shelf's flagged amount are buttons, since each opens a tip. That was
the owner's earlier call, so it is recorded here and not changed.

## The DRY merges

Three things were written more than once across `StockBadge`, `JarShelf`,
`JarLines` and `StockDialog`. Each now has one home.

| Shared now                                                     | Home                        | Used by                               |
| -------------------------------------------------------------- | --------------------------- | ------------------------------------- |
| `amountText(quantity, unit)`, "250 g" or "Unmeasured"          | `StockBadge/stock-words.ts` | `JarLines`, `StockDialog`, `JarShelf` |
| `StockTip`, the button that opens a Low or Out tip             | `StockBadge/index.tsx`      | `StockBadge`, the shelf's `AmountTip` |
| `$stock-low-ink` and `$stock-out-ink`, the Low and Out colours | `_variables.scss`           | `StockBadge`, `JarShelf`              |

P1 then shared a fourth, `StockIcon`, the badge's drawing, with the shelf.

## Filters

The filters keep the search sentence ("No ingredients, matching Knitbone") as
their summary of what is applied. Baymard advises showing the applied
filters together in one overview, and finds that 28% of the sites it reviewed do
not;[^baymard] the sentence is that overview. No change.

## The acceptance criteria

| Criterion                                                                 | How it is met                                                                                         |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| A jar being edited reads differently, and an unsaved change shows         | The chosen jar's fill and `aria-current`; "Edited" beside a changed jar                               |
| The empty state says what to do next                                      | "There are no ingredients here yet." with the Add Ingredient button; a viewer's case is OWNER DECIDES |
| The Stock section has no `.panel`, and the record says what sets it apart | Removed; its heading and spacing, as every section                                                    |
| The DRY merges are listed                                                 | "The DRY merges", above                                                                               |
| Each jar and amount button has a distinct name and description            | "Names a screen reader can tell apart", above                                                         |
| The shelf works by keyboard alone                                         | "The shelf by keyboard", above                                                                        |
| Low and Out are never shown by colour alone                               | In words to a screen reader already; by sight only with P1 or P1b (OWNER DECIDES)                     |
| Contrast holds at 4.5:1, and nothing scrolls sideways at 375px            | axe in 56 runs, both themes, 1280px and 375px                                                         |
| Each change names its source in Chicago form                              | The notes below                                                                                       |

## Defects to mint

None found that needs a task of its own. The focus rings were under an hour
and are fixed in this branch.

## Sources

[^wcag141]: W3C, "Understanding SC 1.4.1: Use of Color," WCAG 2.2 Understanding Docs, accessed October 23, 2026, <https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html>.

[^govuktag]: GOV.UK Design System, "Tag," accessed October 23, 2026, <https://design-system.service.gov.uk/components/tag/>.

[^harley]: Aurora Harley, "Icon Usability," Nielsen Norman Group, July 27, 2014, <https://www.nngroup.com/articles/icon-usability/>.

[^flaherty]: Kim Flaherty, "Indicators, Validations, and Notifications: Pick the Correct Communication Option," Nielsen Norman Group, January 17, 2024, <https://www.nngroup.com/articles/indicators-validations-notifications/>.

[^apg]: W3C Web Accessibility Initiative, "Dialog (Modal) Pattern," ARIA Authoring Practices Guide, accessed October 23, 2026, <https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/>.

[^lawson]: Nolan Lawson, "Dialogs and Shadow DOM: Can We Make It Accessible?," Read the Tea Leaves (blog), June 14, 2022, <https://nolanlawson.com/2022/06/14/dialogs-and-shadow-dom-can-we-make-it-accessible/>.

[^kaplan]: Kate Kaplan, "Designing Empty States in Complex Applications: 3 Guidelines," Nielsen Norman Group, September 19, 2021, <https://www.nngroup.com/articles/empty-state-interface-design/>.

[^baymard]: Kathryn Reeves, "Display 'Applied Filters' in an Overview (28% Don't)," Baymard Institute, October 6, 2020, updated May 13, 2026, <https://baymard.com/research-articles/how-to-design-applied-filters>.
