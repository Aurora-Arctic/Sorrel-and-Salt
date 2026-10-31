# EntryMarks

`src/components/EntryMarks/` — an ingredient entry's badge row: the badges saying whose it is
(M8.14), and its one safety warning, Toxic or else Caution. The ingredient card and the head of the entry page (`IngredientEntry`)
both draw them through this one component, so the two cannot drift. The entry page draws its safety badge with `SafetyMark` on its back row instead, after New or Updated, and passes `safety={false}` here (the owner's call, 2026-10-20; [`ingredient-entry.md`](ingredient-entry.md), "Structure").

## Props

`EntryMarksProps` (`types.ts`):

| Prop                               | What it is                                                                                                                                                                                         |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kind`                             | `own`, `cupboard` or `compendium`: the three kinds below                                                                                                                                           |
| `annotated`                        | The cupboard row overrides a field of the compendium's. Only a `cupboard` entry shows it                                                                                                           |
| `retired`                          | The curators retired the entry (M12.24)                                                                                                                                                            |
| `inCoven`                          | Read inside a coven: a `compendium` entry then shows Compendium. Left out on the public compendium                                                                                                 |
| `provenance`                       | Compendium and Annotated, the two marks saying where a held entry came from. On by default; the ingredient card turns it off                                                                       |
| `recency`                          | New or Updated, drawn by `RecencyMark` before every badge (below, "New and Updated")                                                                                                               |
| `safety`                           | The safety badge. On by default; the ingredient card turns it off in the row under the formal name and draws it in its corner                                                                      |
| `reviewedAt`                       | The curators' review mark, shown to everyone: an ISO date for a Reviewed By Curator badge, `null` for Needs Review, left out for no badge. Never drawn on a coven's own entry; only the date shows |
| `toxic`, `safetyNotes`, `variants` | The ingredient's own flag and notes, and the forms the caller shows; any one set shows Toxic, or else Caution, drawn by `SafetyMark` ([`safety-note.md`](safety-note.md))                          |

## The three kinds

The reasoning is in
[`../design-decisions/m12.13-cupboard-names-the-compendium-plan.md`](../design-decisions/m12.13-cupboard-names-the-compendium-plan.md).

| Kind         | Whose entry                                                  | Shows                                                         |
| ------------ | ------------------------------------------------------------ | ------------------------------------------------------------- |
| `own`        | The coven's own (`isGlobal` false)                           | Local                                                         |
| `cupboard`   | A compendium entry this coven's cupboard names               | Compendium; Annotated in its place once a field is overridden |
| `compendium` | A compendium entry no cupboard names: all of the public list | Compendium with `inCoven`; nothing on the public compendium   |

The mark reads "Compendium", not "From the Compendium" (changed 2026-10-18, to pair with Local; a word change only, same look, no tip).

A retired entry shows **Retired** in place of Compendium (it was worded "No Longer in the Compendium" until 2026-10-18). Retired is a button, built by `tip-mark.tsx` (which Annotated shares): hovering, tapping or focusing it opens a tip, "No longer in the Compendium; your coven still has it.", built on `useTip` and the same classes as StockBadge's Low badge. Its wrapper sits above the card's stretched link (`z-index: 1`), so a click opens the tip and does not navigate.

**Compendium on every compendium entry in a coven** (the owner's call, 2026-10-19): held or not, so the mark says where the entry is from and nothing more. Which ones the cupboard holds is the entry page's shelf mark ([`ingredient-entry.md`](ingredient-entry.md), "In Your Cupboard"). On the public compendium every entry is one, so none wears it.

**Annotated** (changed 2026-10-18; in place of Compendium, beside it from 2026-10-19 until the owner's call of 2026-10-20 that Annotated wins, since it already says the entry is the Compendium's): "Annotated", a tipped button like Retired ("From the Compendium, with your coven's own changes."), opening from its right edge and lifted above the card's stretched link so a click opens the tip and does not navigate. A retired and annotated entry shows Retired and Annotated, each with its own tip; a retired, unannotated one shows Retired alone. It wears the `annotated` palette: Local's inks, through the `$local-badge-dark` and `$local-badge-light` tokens in `_variables.scss`, so the two cannot drift apart (it marks your coven's own changes, the same idea as your own entry). Its contrast is Local's. It is never rendered as `badge--local`.

**The card leaves Compendium and Annotated off** (the owner's call, 2026-10-20). A coven's card shows Local, Retired and its safety badge, and never Compendium or Annotated: where a held entry came from, and whether the coven changed it, is the entry page's to say. `IngredientCard` passes `provenance={false}`, and `safety={false}` in the row under the formal name, since it draws the safety badge in its corner with a second `EntryMarks`, given no kind mark and no provenance, so New or Updated comes first there too ([`ingredient-card.md`](ingredient-card.md), "A long name"); the entry page's head leaves it on, so both still draw through this one component. The Quick Look details modal draws this row under its heading with `safety={false}` and no `recency` (`details-dialog.tsx`), so it shows Local, Compendium, Annotated or Retired; New or Updated and the safety badge stand on its top line beside Close instead, as on the entry page's top bar.

## The order: green first, red last

Every badge row is drawn by this component, so the order holds in one place rather than in each caller's markup (the owner's call, 2026-10-20). Each badge belongs to a group by its palette's colour, and the row draws the green group, then the neutral, then the red. Inside a group the badges keep the order they are built in. The sort is `byTone` in `index.tsx`, the same shape as MenuButton's `greenFirst`.

| Badge      | Palette     | Colour                 | Group   |
| ---------- | ----------- | ---------------------- | ------- |
| Local      | `local`     | sorrel green tint      | green   |
| Annotated  | `annotated` | Local's inks           | green   |
| Compendium | `low-stock` | chalk on the muted ink | neutral |
| Retired    | `retired`   | chalk on the muted ink | neutral |
| Toxic      | `safety`    | solid wax red          | red     |
| Caution    | `caution`   | wax red tint           | red     |

**One safety badge** (the owner's call, 2026-10-20): Toxic when the ingredient or a shown form is flagged, else Caution when any has notes. Toxic says more, so the two never show together; `SafetyMark` decides.

So a held, annotated entry with notes reads Annotated, Caution (Annotated wins over Compendium), a held, unannotated toxic one Compendium, Toxic, and a retired, annotated one Annotated, Retired, then its safety badge. Low (`low-stock`, neutral) and Out of Stock (`out-of-stock`, a muted wax tint, red) are `StockBadge`s on the jar lines, one to a line, so they share no row with these. The form heading's lone `ToxicMark` on the entry page is a row of one.

## Contracts

- **The caller reads the kind, this component works nothing out.** The page passes
  `kind` from `workspaceId` and `cupboardEntry`, and `annotated` from
  `isAnnotated`; the card is handed `kind` and `retired` by its caller, and no
  `annotated`, which it never shows.
- **No wrapper.** It renders the badges bare, the safety badge included, inside the
  caller's own row (`.specimen__badges` on the card, `.badges` on the entry page). With
  nothing to show it renders nothing.
- **Local is a `span`; Compendium is an `output` element**, so it carries the
  `status` role: on the page from the start, never announced. Retired and Annotated are `button`s (not statuses) with the tip described by `aria-describedby`, so a screen reader hears the reason without opening it.
- Meaning is the badge's words, never its tint alone.

## New and Updated (MB.106)

A compendium entry created in the last 30 days reads **New**; one changed in them reads **Updated**; New wins when both hold. These are **not badges** (the owner, 2026-10-19): `RecencyMark` (`recency-mark.tsx`, exported beside `EntryMarks`) draws the words, which a screen reader hears, and a small icon hidden from assistive technology (a sparkle for New, a wand for Updated), in the accent ink with no container (the owner picked this shape from six, 2026-10-19), a half step larger than badge text (half way between overline and caption, icon `$recency-icon-size`, 1.375em). Story: `Recency`. **It comes before every badge, in reading order and on screen** (the owner's call, 2026-10-20): `EntryMarks` takes `recency` and draws it first, ahead of the green, neutral and red badges, so every row that shares it with badges gets the rule from one place; a caller draws `RecencyMark` alone only where no badge shares its row, as the entry page's back row does. Tests: `tests/components/EntryMarks/index.test.tsx`, "draws New or Updated ahead of every badge". On the card it sits in the **top-right corner**, just left of the safety badge, or in the corner itself without one ([`ingredient-card.md`](ingredient-card.md)); and in the entry page's back row (`ingredient-entry__bar`): the back link at the left, first in the DOM so a screen reader hears it before the marker, the marker at the right end, which is the top right of the text column (the middle of the page-nav menu, text and side columns), both on one centre line so it adds no row. With no back link the row holds the marker alone. The caller passes `recency` from `entryRecency(createdAt, updatedAt)` in `src/lib/entry-recency.ts`, so nothing is stored and nothing expires. `updated_at` moves only on a real change ([`db/updated-at.md`](../db/updated-at.md)). A coven's own entry carries none. A freshly seeded database reads every entry New, which is accepted.

Inks are the `new` (accent fill) and `updated` (tint foreground) badge palettes' tokens.

## Styling

`index.scss` takes tokens only (MB.120): `space()`, `type-size()`, the badge mixins and `badge-token()`, and for the recency mark `$recency-icon-size` (the sparkle, 1.375em of its label) and `$optical-nudge` (0.04em). The mark stands `space(1)` from its label, where it was a raw 0.3em (3.75px at its 12.5px size, so the change is a quarter of a pixel). Its label and sparkle each move `$optical-nudge` the other way, because beside the back link the label's small capitals sat about half a pixel low and the sparkle's path half a pixel high (measured 2026-10-19); the sparkle's rule is one rule, not two.

**The recency mark's contrast.** It is small bold text (12.5px, weight 600) with no ground of its own, so it needs the 4.5:1 text floor on whatever it stands on: the entry page, a card, and a card pointed at. `tests/scss/tokens.test.ts` ("the recency mark clears the text floor") compiles `index.scss`, reads the colour each of `.recency-mark` and `--updated` is drawn in, and checks it on the three surfaces in both themes. New's ink, measured on 2026-10-20 (MB.120):

| Theme | Ink       | Page | Card | Card pointed at |
| ----- | --------- | ---- | ---- | --------------- |
| Dark  | `#88b669` | 7.97 | 7.23 | 6.58            |
| Light | `#397511` | 4.65 | 5.17 | 5.40            |

Updated's ink is New's in the dark theme and darker in the light one (`#274b0c`), so it clears the floor by more.

**On a phone** the marks have no rule of their own: they wrap with the line they sit in.

**Forced colours.** No rule of its own. A badge keeps its 1px border (a solid badge's is transparent, but forced colours repaints every border in the system's ink), so its shape survives as well as its word; the recency mark is text and a `currentColor` sparkle. The forced-colours pass over the compendium section is M14.3, a Wave 14 task (minted from MB.120).

## Stories

`index.stories.tsx`: `States`, a grid with one cell per kind and mark: Own, In Cupboard, In Cupboard Annotated, Retired, Retired Alone, Own And Annotated, Compendium Entry In A Coven, Not In Cupboard, Without Provenance; the safety marks (Toxic Ingredient, Toxic With Notes, Toxic In One Form, Not Toxic, Toxic Not Known, Caution From Notes, Caution From A Form, Safety Left Out); and New With Marks and Updated With Marks. `Recency` is separate.

## Testing

- `tests/components/EntryMarks/index.test.tsx`: each kind's marks, Retired and Annotated as tipped buttons, the green-first order, one safety badge, and New or Updated ahead of every badge.
- `tests/scss/tokens.test.ts`: the recency mark's contrast, above.
- In a browser it is scanned with the pages that draw it: the entry page (`tests/e2e/compendium-entry.spec.ts`) and the lists' cards.
