# IngredientCard

`src/components/IngredientCard/` — one ingredient in a list (M8.14, stories 20, 23
and 53). The one card serves the public compendium (M8.18) and the coven's
Ingredients page (M9.6). It is presentational: it takes props only and works out
nothing from the data.

## Props

`IngredientCardProps` (`types.ts`):

| Prop          | What it is                                                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `href`        | The entry's page (M8.19). The name links to it                                                                                     |
| `label`       | The label to show, already merged by the caller (`applyCupboardEntry`)                                                             |
| `formalName`  | The formal name, first on the secondary line                                                                                       |
| `variants`    | The entry's live forms: an icon and the name each on the secondary line; their notes and flags feed the caution and the Toxic mark |
| `safetyNotes` | The ingredient's own notes                                                                                                         |
| `toxic`       | The ingredient's own flag                                                                                                          |
| `kind`        | `own`, `cupboard` or `compendium`; see [`entry-marks.md`](entry-marks.md)                                                          |
| `annotated`   | The cupboard row overrides a field                                                                                                 |
| `retired`     | The curators retired the entry                                                                                                     |
| `level`       | The name's heading level, 2 to 5; the caution sits one below. Defaults to 2                                                        |
| `children`    | The jar-line slot, beneath the forms                                                                                               |

## What it is made of

The card owns layout and nothing else. Each treatment is used as it is and never
restyled here:

- the name, an `h2` holding the card's **one link**, so the card is reached by
  keyboard through it alone;
- the secondary line: the formal name, then each form with a `FormIcon` before it, a dot ("Herb · Oil") between items. The dot is `aria-hidden`, so a screen reader does not read it.
  Two entries can share a label, and this line tells them apart;
- the marks, through `EntryMarks`, with `ToxicMark` beside them;
- `SafetyNote`, when the entry or a listed form has notes;
- the **jar-line slot**. M9.6 fills it with a line per jar (the form's icon, the
  form, quantity and unit, M9.8's `StockBadge`, M9.9's and M9.10's actions). The
  public compendium leaves it empty.

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
