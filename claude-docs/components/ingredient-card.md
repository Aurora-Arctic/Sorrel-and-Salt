# IngredientCard

`src/components/IngredientCard/` — one ingredient in a list (M8.14, stories 20, 23
and 53). The one card serves the public compendium (M8.18) and the coven's
Ingredients page (M9.6). It is presentational: it takes props only and works out
nothing from the data.

## Props

`IngredientCardProps` (`types.ts`):

| Prop           | What it is                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `href`         | The entry's page (M8.19). The name links to it                                                                                       |
| `label`        | The label to show, already merged by the caller (`applyCupboardEntry`)                                                               |
| `formalName`   | The formal name, a caption beneath the name                                                                                          |
| `nomenclature` | Decides its italics: only a binomial kind (`isBinomial`, shared with the entry page) is italic; mineral, chemical or none is upright |
| `categories`   | The entry's categories with their groups; chips in the group colours, plain not links, no row when empty                             |
| `variants`     | The entry's live forms: an icon and the name each on the secondary line; their notes and flags feed the Caution and Toxic marks      |
| `toxic`        | The ingredient's own flag                                                                                                            |
| `safetyNotes`  | The ingredient's own safety notes; notes here or on a listed form show the Caution badge. The notes themselves are never drawn       |
| `kind`         | `own`, `cupboard` or `compendium`; see [`entry-marks.md`](entry-marks.md)                                                            |
| `annotated`    | The cupboard row overrides a field                                                                                                   |
| `retired`      | The curators retired the entry                                                                                                       |
| `level`        | The name's heading level, 2 to 5; Defaults to 2                                                                                      |
| `children`     | The jar-line slot, last (see the slot’s contract)                                                                                    |

## What it is made of

The card owns layout and nothing else. Each treatment is used as it is and never
restyled here:

- the name, an `h2` holding the card's **one link**, so the card is reached by
  keyboard through it alone;
- the Foundations specimen layout (`.specimen` primitives): the name and formal name on the left, the marks on the right, then the forms line (a `FormIcon` before each form, an `aria-hidden` dot between: "Herb · Oil"; it tells two entries sharing a label apart), the category chips, and the jar lines;
- the marks, through `EntryMarks`, then `CautionMark`, then `ToxicMark` last, in `.specimen__badges`;
- no caution block: the notes live on the entry page, and the card carries only the Caution badge, a word with no tip, so Toxic stays the one solid badge;
- the **jar-line slot**. M9.6 fills it with a line per jar (the form's icon, the
  form, quantity and unit, M9.8's `StockBadge`, M9.9's and M9.10's actions). The
  public compendium leaves it empty.

The surface is `modal-surface($shadow-floating)`, not `.panel`. Order is forms, chips, stock: the specimen has no forms line, so the identity lines sit together under the name and the stock line stays last with its rule above.

On the card only, Out of Stock takes Low's weight in the jar slot: a thin border,
the badge's normal font weight and padding, so both come out the same height. The
word and the icon still tell the states apart; the heavier edge is M9.8's for a
badge standing alone. The forms line leaves 8px either side of its dot.

## Order

The card declares no sort. Two rows sharing a label keep a stable order through
the `(name, id)` keyset the list pages on
([`../db/compendium-read.md`](../db/compendium-read.md)), asserted in
`tests/db/repository/ingredients.test.ts`.

## Accessibility

Meaning is carried by words and shape, never colour alone: every badge has its
text. The page that places the card (M8.18, M9.6) owns the axe run and the
keyboard walk in its Playwright spec, since the card has no page of its own.
Styling stops at the tokens until the section's design review (MB.84).
