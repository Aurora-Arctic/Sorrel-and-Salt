# EntryMarks

`src/components/EntryMarks/` is an ingredient entry's badge row: the badges saying whose it is, and its one safety warning, Toxic or else Caution. The ingredient card and the head of the entry page (`IngredientEntry`) both draw them through this one component, so the two cannot drift. The entry page draws its safety badge with `SafetyMark` on its back row instead, after New or Updated, and passes `safety={false}` here ([`ingredient-entry.md`](ingredient-entry.md), "Structure"). Props are in `types.ts` (`EntryMarksProps`). `src/components/SpellMarks/` is the grimoire's counterpart, at the end of this doc.

## Contracts

- **The caller reads the kind; this component works nothing out.** The page passes `kind` from `workspaceId` and `cupboardEntry`, and `annotated` from `isAnnotated`. The card is handed `kind` and `retired` by its caller and no `annotated`, which it never shows.
- **No wrapper.** It renders the badges bare, the safety badge included, inside the caller's own row (`.specimen__badges` on the card, `.badges` on the entry page). With nothing to show it renders nothing.
- **Local is a `span`; Compendium is an `output` element** with the `status` role: present from the start, never announced. Retired and Annotated are `button`s (not statuses) with the tip described by `aria-describedby`, so a screen reader hears the reason without opening it.
- **Meaning is the badge's words, never its tint alone.**
- **One safety badge.** Toxic when the ingredient or a shown form is flagged, else Caution when any has notes. Toxic says more, so the two never show together. `SafetyMark` decides, from `toxic`, `safetyNotes` and `variants` ([`safety-note.md`](safety-note.md)).
- **The review mark is shown to everyone.** `reviewedAt` is an ISO date for a Reviewed By Curator badge, `null` for Needs Review, and left out for no badge. It is never drawn on a coven's own entry, and only the date shows.

## The three kinds

The reasoning is in [`../design-decisions/m12.13-cupboard-names-the-compendium-plan.md`](../design-decisions/m12.13-cupboard-names-the-compendium-plan.md).

| Kind         | Whose entry                                                  | Shows                                                         |
| ------------ | ------------------------------------------------------------ | ------------------------------------------------------------- |
| `own`        | The coven's own (`isGlobal` false)                           | Local                                                         |
| `cupboard`   | A compendium entry this coven's cupboard names               | Compendium; Annotated in its place once a field is overridden |
| `compendium` | A compendium entry no cupboard names: all of the public list | Compendium with `inCoven`; nothing on the public compendium   |

- **Compendium is on every compendium entry read inside a coven**, held or not (`inCoven`), so the mark says where the entry is from and nothing more. Which ones the cupboard holds is the entry page's shelf mark ([`ingredient-entry.md`](ingredient-entry.md), "In Your Cupboard"). On the public compendium every entry is one, so none wears it. The word is "Compendium", to pair with Local, with no tip.
- **Retired** (the curators retired the entry) replaces Compendium. It is a button built by `tip-mark.tsx` (which Annotated shares): hovering, tapping or focusing it opens a tip, "No longer in the Compendium; your coven still has it.", built on `useTip` and the same classes as `StockBadge`'s Low badge. Its wrapper sits above the card's stretched link (`z-index: 1`), so a click opens the tip and does not navigate.
- **Annotated** (the cupboard row overrides a field of the compendium's; only a `cupboard` entry shows it) replaces Compendium, since it already says the entry is the Compendium's. It is a tipped button like Retired ("From the Compendium, with your coven's own changes."), opening from its right edge and lifted above the card's stretched link. A retired and annotated entry shows Retired and Annotated, each with its own tip; a retired, unannotated one shows Retired alone. Annotated wears the `annotated` palette: Local's inks, through the `$local-badge-dark` and `$local-badge-light` tokens in `_variables.scss`, so the two cannot drift apart and the contrast is Local's. It is never rendered as `badge--local`.
- **The card leaves Compendium and Annotated off.** A coven's card shows Local, Retired and its safety badge: where a held entry came from, and whether the coven changed it, is the entry page's to say. `IngredientCard` passes `provenance={false}`, and `safety={false}` in the row under the formal name, since it draws the safety badge in its corner with a second `EntryMarks` given no kind mark and no provenance, so New or Updated comes first there too ([`ingredient-card.md`](ingredient-card.md), "A long name"). The entry page's head leaves both on.
- **The Quick Look details modal** draws this row under its heading with `safety={false}` and no `recency` (`details-dialog.tsx`), so it shows Local, Compendium, Annotated or Retired. New or Updated and the safety badge stand on its top line beside Close, as on the entry page's top bar.

## The order: green first, red last

This component holds the order for every badge row. Each badge belongs to a group by its palette's colour, and the row draws the green group, then the neutral, then the red. Inside a group the badges keep the order they are built in. The sort is `byTone` in `index.tsx`, the same shape as `MenuButton`'s `greenFirst`.

| Badge      | Palette     | Colour                 | Group   |
| ---------- | ----------- | ---------------------- | ------- |
| Local      | `local`     | sorrel green tint      | green   |
| Annotated  | `annotated` | Local's inks           | green   |
| Compendium | `low-stock` | chalk on the muted ink | neutral |
| Retired    | `retired`   | chalk on the muted ink | neutral |
| Toxic      | `safety`    | solid wax red          | red     |
| Caution    | `caution`   | wax red tint           | red     |

So a held, annotated entry with notes reads Annotated, Caution; a held, unannotated toxic one Compendium, Toxic; and a retired, annotated one Annotated, Retired, then its safety badge. Low (`low-stock`, neutral) and Out of Stock (`out-of-stock`, a muted wax tint, red) are `StockBadge`s on the jar lines, one to a line, so they share no row with these. The form heading's lone `ToxicMark` on the entry page is a row of one.

## New and Updated

A compendium entry created in the last 30 days reads **New**; one changed in them reads **Updated**; New wins when both hold. A coven's own entry carries none.

- **These are not badges.** `RecencyMark` (`recency-mark.tsx`, exported beside `EntryMarks`) draws the words, which a screen reader hears, and a small icon hidden from assistive technology (a sparkle for New, a wand for Updated), in the accent ink with no container. The text is half way between overline and caption in size, the icon `$recency-icon-size` (1.375em). Story: `Recency`.
- **It comes before every badge, in reading order and on screen.** `EntryMarks` takes `recency` and draws it first, ahead of the green, neutral and red badges, so every row that shares it with badges gets the rule from one place. A caller draws `RecencyMark` alone only where no badge shares its row, as the entry page's back row does.
- **Where it stands.** On the card it sits in the top-right corner, just left of the safety badge, or in the corner itself without one ([`ingredient-card.md`](ingredient-card.md)). In the entry page's back row (`ingredient-entry__bar`) the back link is at the left, first in the DOM so a screen reader hears it before the marker, and the marker at the right end, the top right of the text column, both on one centre line so it adds no row. With no back link the row holds the marker alone.
- **Nothing is stored and nothing expires.** The caller passes `recency` from `entryRecency(createdAt, updatedAt)` in `src/lib/entry-recency.ts`. `updated_at` moves only on a real change ([`db/updated-at.md`](../db/updated-at.md)). A freshly seeded database reads every entry New.
- Inks are the `new` (accent fill) and `updated` (tint foreground) badge palettes' tokens.

## Styling

The mark's label and sparkle each move `$optical-nudge` the other way, because beside the back link the label's small capitals sit about half a pixel low and the sparkle's path half a pixel high.

- **The recency mark's contrast.** It is small bold text (12.5px, weight 600) with no ground of its own, so it needs the 4.5:1 text floor on the entry page, a card, and a card pointed at. `tests/scss/tokens.test.ts` ("the recency mark clears the text floor") compiles `index.scss`, reads the colour each of `.recency-mark` and `--updated` is drawn in, and checks it on the three surfaces in both themes.

  Updated's ink is New's in the dark theme and darker in the light one (`#274b0c`), so it clears the floor by more.

- **Forced colours** need no rule. A badge keeps its 1px border (a solid badge's is transparent, but forced colours repaints every border in the system's ink), so its shape survives as well as its word. The recency mark is text and a `currentColor` sparkle.

## Not here

Stories: `index.stories.tsx`; `Recency` is separate.

Tests: `tests/components/EntryMarks/index.test.tsx`, and `tests/scss/tokens.test.ts` for the contrast. In a browser it is scanned with the pages that draw it: the entry page (`tests/e2e/compendium-entry.spec.ts`) and the lists' cards.

## Spell marks

`src/components/SpellMarks/` draws the badges a spell or a working carries, in a `.specimen__badges` row. It draws nothing when there is nothing to mark, so a complete shared spell leaves no empty row.

- **`status`**: a draft is marked Draft. Complete is the default and has no badge, since a Complete badge would say nothing.
- **`visibility`**: a private spell or working is marked Private. Shared with the coven is the default and has no badge.
- **Used by** the recipe page's head, under the title (`SpellRecipe`), and each Workings row, after its date (`SpellWorkings`). The spell card writes the same badges by hand.
- **Stories**: `src/components/SpellMarks/index.stories.tsx`. **Tests** run through its users: `tests/components/SpellRecipe/index.test.tsx` and `tests/components/SpellCard/index.test.tsx`.
