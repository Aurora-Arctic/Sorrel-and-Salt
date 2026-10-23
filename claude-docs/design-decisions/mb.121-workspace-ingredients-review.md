# MB.121: Design review of the workspace ingredients page

The design review of a coven's Ingredients section: the list of cards, its
filters and empty states, the Edit Stock dialog, the Quick Look window, and the
entry page with its shelf of jars. It records what was changed, what was only
mocked, what the accessibility audit found, which repeated code was merged, and
the research each change rests on. The task is MB.121 in
[`tasks/mb.md`](../tasks/mb.md); the review method is
[`styling.md`](../styling.md), "Designing a section".

The owner answered the review's questions on 2026-10-23; each answer is written
where the question was, and listed in "The owner's answers", below. The
owner chose P1 on 2026-10-23, and **signed off the review as a whole on
2026-10-23**, after looking it over live, including the side column standing
outside the Details section. The design sync (`/design-sync`) is the owner's to
run, not an agent's. The work is committed on
`feature/mb.121-design-review-the-workspace-ingredients-page`.

## The owner's answers (2026-10-23)

| Question                                        | Answer                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------- |
| Keep the focus-ring commit                      | Keep it                                                                   |
| Wrap Tab inside the Edit Stock dialog by script | No: keep the browser's own behaviour                                      |
| A viewer's empty cupboard                       | Add "A member or owner of this coven can add them." Built in this branch  |
| The empty page announcing its state three times | Leave it; noted for the M9.1 story audit                                  |
| Remove the mocks                                | Yes: removed 2026-10-23                                                   |
| Proposal P1, the symbol on the shelf            | P1, the symbol                                                            |
| Stock set apart more clearly                    | C plus A, 2026-10-23: Stock first, and a rule under every section heading |

## What was changed

| Change                                                                                            | Kind                          | Can be dropped alone |
| ------------------------------------------------------------------------------------------------- | ----------------------------- | -------------------- |
| The entry page's Stock section loses its `.panel` box                                             | Required by MB.121            | No                   |
| Stock is the first section, above Details, and the jump menu follows (option C)                   | Owner's answer                | Yes                  |
| Every section's h2 stands over a `$hairline` rule, `entry-heading-rule` (option A)                | Owner's answer                | Yes                  |
| The rule is the heading text's width plus 1rem, 0.25rem under the text                            | Owner's answer                | Yes                  |
| The side column stands beside the first section, dropped by `space(1)`                            | Owner's answer                | Yes                  |
| Icon buttons, the stock dialog's jar picks and the dialog's Close draw the shared focus ring      | Accessibility fix             | Yes                  |
| The amount text, the stock tip button and the Low and Out inks are shared (the DRY merges, below) | Repetition                    | No                   |
| Proposal P1: the shelf draws the card badge's Low or Out symbol before a jar's amount             | Proposal, chosen by the owner | Yes                  |
| Mocks of the options not built, as Storybook stories under `Proposals / MB.121`                   | Mocks, removed 2026-10-23     | Removed              |
| A viewer's empty cupboard says which roles can add                                                | Owner's answer                | No                   |

Behaviour is unchanged by all of them: no press, route, name or saved value
differs. The viewer's added line changes what a viewer reads, nothing else.

## The Stock section without its panel

The Stock section on the entry page sat in a `.panel` box, the only section
there that did. The box is gone, because no other section is boxed and the
jar's shine is drawn in the card colour, so it faded on a card-coloured panel.
Without it, Stock looked like every other section: the same heading, the same
spacing, and the smallest content on the page (two jars about 160px wide),
between Details and Forms, which are both tall. The owner asked for a more
obvious way to set it apart, in a way the page's other sections can share.

**What sets it apart now** (the owner chose options C and A on 2026-10-23):

- **C, Stock comes first.** It is the first section, directly under the title
  block and above Details, at every width. The jump menu lists it first. Where
  an entry has no Stock section (the public compendium, or a compendium entry
  the coven does not hold) nothing else changes order. NN/g's eye-tracking
  work finds people read "usually across the upper part of the content area"
  and give the first lines more gazes than later ones.[^pernice]
- **A, a rule under every section heading.** Stock, Details, Forms and
  References each have a `$hairline` rule under their h2, from one mixin
  (`entry-heading-rule` in `_mixins.scss`). GOV.UK's section break is "a
  thematic break between sections of content", and can show "a separator
  line".[^govuksection] NN/g warns that boxes added out of caution "can result
  in busy, cluttered designs", and that whitespace and proximity are often
  enough; a rule is the lighter cue.[^harleyregion] The rule ends where its
  heading does, so on a tablet or wider it stops at the text column and never
  runs under Details' side column; the Forms and References headings span the
  whole body, so their rules do too.
- **The rule is short** (owner, 2026-10-23). It is as wide as the heading's own
  text plus `space(4)` (1rem) past it, starting at the heading's left edge, and
  never wider than the column, so a long heading wraps and the rule keeps to the
  column. It sits `space(1)` (0.25rem) under the text. For Stock it follows the
  "Stock" h2 and not the head row, so the Edit Stock button stays where it was.
  Measured at 1280, 1024, 768 and 375px: each rule is the text's width plus 16px.
- **The side column stands beside the first section** (owner, 2026-10-23). The
  side column (Correspondences, Folk Names, Categories, Substitutes, and "In the
  Compendium" when shown) lines up with the top section, Stock if shown and
  Details if not. The body is now a grid from the tablet width up; the side column
  spans both rows in column 2, and row 2 is `1fr` so a long side column does not
  push Stock or Details. To do this the side `div` moved out of the Details
  `<section>` to stand after it in the body. **Cost:** the Details region no longer
  contains the side blocks; they are plain blocks in the body, which screen readers
  read straight after Details. The gap between Details and the side column on a
  phone is `space(6)` (the body's gap), where it was `space(4)`. On a phone, and
  below the tablet width generally (768px included), the page is one column: Stock,
  Details, the side column, then the forms.
- **A small drop** (owner, 2026-10-23, after seeing it live). The side column has
  `margin-block-start: space(1)`, 0.25rem (4px), and the skeleton's side part takes
  the same value through `entry-body`. Measured in Chromium, text bottom to text
  bottom of the side column's first heading against the first section's h2, the
  h2's text bottom is 2.0px lower at 1280 and at 1024px, with Stock ("In the
  Compendium" first, and Correspondences first) and without Stock (Details' h2
  against Correspondences). With no drop it was 6.0px lower, so 0.25rem leaves 2px
  of the 6px; the owner chose it.

Options not chosen: a tinted full-bleed band (it either fades the jar's shine
or needs a new token, and it would be one different section again), and a
leading icon in every heading (it adds a mark but little weight). NN/g also
warns that full-width bordered sections can create "false floors" that make
people stop scrolling.[^harleyregion] The reasons given here are the design
judgement of the person who built it, not findings of those sources.

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

**The owner's answer (2026-10-23): P1, the symbol.** The owner first asked for
a mock at phone width, then chose P1. This replaces the owner's call of
2026-10-21, which ruled out "an extra word and an icon" on the shelf: the
icon is now in, and the word (P1b) stays out.

**The mocks were removed on 2026-10-23, at the owner's word.** The Storybook
stories under `Proposals / MB.121` (`.storybook/mb121-proposals.stories.tsx`
and its stylesheet) showed the shelf before P1, P1, P1b, P1c and a viewer's
empty cupboard. They are deleted, with `$mb121-mock-mark-stroke`, the token
only P1c used. P1 is shown by the real `JarShelf`, `StockBadge` and
`IngredientEntry` stories, and the viewer's line by the `CovenCards` story
`Empty For A Viewer`. The removed options can still be seen in two places:

- the phone-width mock the owner decided from,
  <https://claude.ai/artifact/81JdeTVeFUT2Vk93TYVaVT>, a private page on
  claude.ai;
- the review's screenshots of the mocks, the `proposals-mb-121--*.png` files
  in both themes at 1280px and 375px, in the review's screenshot folder
  `mb.121/proposals/`, listed in that folder's `index.md`. The folder sits
  in the reviewing session's scratch space, outside the repository.

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
  accent ring every link has. **The owner's answer (2026-10-23): keep it.**
  Every other control already draws the shared ring.
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
  Ingredient button. **The owner's answer (2026-10-23): leave it**, and note
  it for the M9.1 story audit, the audit of the story suite still owed. The
  three come from three components, each correct alone, so the audit is where
  to judge whether one should go.

### The dialog and the Tab key

The Edit Stock dialog is a native `<dialog>` opened with `showModal()`. Tab past
its last control goes out to the browser's own controls (the address bar) and
back in, rather than wrapping to the dialog's first control. The ARIA Authoring
Practices Guide's dialog pattern says Tab should wrap inside the
dialog.[^apg] Lawson records the disagreement: some
accessibility experts side with the guide, while Scott O'Hara calls the native
behaviour "good behavior, not a bug".[^lawson] It is not a keyboard trap under WCAG 2.1.2, since focus can
always leave and return.

**The owner's answer (2026-10-23): keep the browser's own behaviour.** The page behind is inert, so focus never reaches it, and
wrapping by hand is the trap code the Modal deliberately does without
([`modal.md`](../components/modal.md), "Contracts").

### A viewer's empty cupboard

A viewer, who may add nothing, sees only "There are no ingredients here yet."
Kaplan's first guideline for empty states is to "tell the user what could be
displayed, and how to populate the area".[^kaplan] A viewer cannot populate it,
but can be told who can. A mock, since removed, added "A member or owner of
this coven can add them."

**The owner's answer (2026-10-23): add the line.** It tells a viewer the empty
cupboard is not a fault and who to ask. Built: `CovenCards/empty.tsx` draws it
in the `No Ingredients` region in place of the Add Ingredient button when the
viewer cannot add, and the `Empty For A Viewer` story shows it
([`coven-cards.md`](../components/coven-cards.md), "The empty and no-match
states"). The test checks that a viewer's region names the roles that can add
and a member's does not: the roles named are the only thing that tells the
state apart, which is the exception in
[`layer-ownership.md`](../testing/layer-ownership.md), "What a test may
assert", rule 2.

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

| Criterion                                                                 | How it is met                                                                                                                                             |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A jar being edited reads differently, and an unsaved change shows         | The chosen jar's fill and `aria-current`; "Edited" beside a changed jar                                                                                   |
| The empty state says what to do next                                      | "There are no ingredients here yet." with the Add Ingredient button; a viewer is told which roles can add                                                 |
| The Stock section has no `.panel`, and the record says what sets it apart | Removed; it is the first section and every section's h2 has a short hairline rule, with the side column beside it ("The Stock section without its panel") |
| The DRY merges are listed                                                 | "The DRY merges", above                                                                                                                                   |
| Each jar and amount button has a distinct name and description            | "Names a screen reader can tell apart", above                                                                                                             |
| The shelf works by keyboard alone                                         | "The shelf by keyboard", above                                                                                                                            |
| Low and Out are never shown by colour alone                               | In words to a screen reader; by sight, the symbol before the amount (P1)                                                                                  |
| Contrast holds at 4.5:1, and nothing scrolls sideways at 375px            | axe in 56 runs, both themes, 1280px and 375px                                                                                                             |
| Each change names its source in Chicago form                              | The notes below                                                                                                                                           |

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

[^pernice]: Kara Pernice, "F-Shaped Pattern of Reading on the Web: Misunderstood, But Still Relevant (Even on Mobile)," Nielsen Norman Group, November 12, 2017, <https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/>.

[^govuksection]: GOV.UK Design System, "Section Break," accessed October 23, 2026, <https://design-system.service.gov.uk/styles/section-break/>.

[^harleyregion]: Aurora Harley, "The Principle of Common Region: Containers Create Groupings," Nielsen Norman Group, July 12, 2020, <https://www.nngroup.com/articles/common-region/>.
