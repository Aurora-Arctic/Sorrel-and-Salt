# EntryMarks

`src/components/EntryMarks/` — the badges saying whose an ingredient entry is
(M8.14). The ingredient card and the head of the entry page (`IngredientEntry`)
both draw them through this one component, so the two cannot drift.

## Props

`EntryMarksProps` (`types.ts`):

| Prop        | What it is                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------------- |
| `kind`      | `own`, `cupboard` or `compendium`: the three kinds below                                           |
| `annotated` | The cupboard row overrides a field of the compendium's. Only a `cupboard` entry shows it           |
| `retired`   | The curators retired the entry (M12.24)                                                            |
| `inCoven`   | Read inside a coven: a `compendium` entry then shows Compendium. Left out on the public compendium |

## The three kinds

The reasoning is in
[`../design-decisions/m12.13-cupboard-names-the-compendium-plan.md`](../design-decisions/m12.13-cupboard-names-the-compendium-plan.md).

| Kind         | Whose entry                                                  | Shows                                                       |
| ------------ | ------------------------------------------------------------ | ----------------------------------------------------------- |
| `own`        | The coven's own (`isGlobal` false)                           | Local                                                       |
| `cupboard`   | A compendium entry this coven's cupboard names               | Compendium; Annotated beside it once a field is overridden  |
| `compendium` | A compendium entry no cupboard names: all of the public list | Compendium with `inCoven`; nothing on the public compendium |

The mark reads "Compendium", not "From the Compendium" (changed 2026-10-18, to pair with Local; a word change only, same look, no tip).

A retired entry shows **Retired** in place of Compendium (it was worded "No Longer in the Compendium" until 2026-10-18). Retired is a button, built by `tip-mark.tsx` (which Annotated shares): hovering, tapping or focusing it opens a tip, "No longer in the Compendium; your coven still has it.", built on `useTip` and the same classes as StockBadge's Low badge. Its wrapper sits above the card's stretched link (`z-index: 1`), so a click opens the tip and does not navigate.

**Compendium on every compendium entry in a coven** (the owner's call, 2026-10-19): held or not, so the mark says where the entry is from and nothing more. Which ones the cupboard holds is the entry page's shelf mark ([`ingredient-entry.md`](ingredient-entry.md), "In Your Cupboard"). On the public compendium every entry is one, so none wears it.

**Annotated** (changed 2026-10-18; beside Compendium since 2026-10-19, in its place before): "Annotated", a tipped button like Retired ("From the Compendium, with your coven's own changes."), opening from its right edge and lifted above the card's stretched link so a click opens the tip and does not navigate. A retired and annotated entry shows Retired and Annotated, each with its own tip; a retired, unannotated one shows Retired alone. It wears the `annotated` palette: Local's inks, through the `$local-badge-dark` and `$local-badge-light` tokens in `_variables.scss`, so the two cannot drift apart (it marks your coven's own changes, the same idea as your own entry). Its contrast is Local's. It is never rendered as `badge--local`.

## Contracts

- **The caller reads the kind, this component works nothing out.** The page passes
  `kind` from `workspaceId` and `cupboardEntry`, and `annotated` from
  `isAnnotated`; the card is handed the same by its caller.
- **No wrapper.** It renders the badges bare, so the caller lays them in its own
  `.badges` row beside the Toxic mark. With nothing to show it renders nothing.
- **Local is a `span`; Compendium is an `output` element**, so it carries the
  `status` role: on the page from the start, never announced. Retired and Annotated are `button`s (not statuses) with the tip described by `aria-describedby`, so a screen reader hears the reason without opening it.
- Meaning is the badge's words, never its tint alone.
