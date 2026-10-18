# EntryMarks

`src/components/EntryMarks/` — the badges saying whose an ingredient entry is
(M8.14). The ingredient card and the head of the entry page (`IngredientEntry`)
both draw them through this one component, so the two cannot drift.

## Props

`EntryMarksProps` (`types.ts`):

| Prop        | What it is                                                                               |
| ----------- | ---------------------------------------------------------------------------------------- |
| `kind`      | `own`, `cupboard` or `compendium`: the three kinds below                                 |
| `annotated` | The cupboard row overrides a field of the compendium's. Only a `cupboard` entry shows it |
| `retired`   | The curators retired the entry (M12.24)                                                  |

## The three kinds

The reasoning is in
[`../design-decisions/m12.13-cupboard-names-the-compendium-plan.md`](../design-decisions/m12.13-cupboard-names-the-compendium-plan.md).

| Kind         | Whose entry                                                  | Shows                                                         |
| ------------ | ------------------------------------------------------------ | ------------------------------------------------------------- |
| `own`        | The coven's own (`isGlobal` false)                           | Local                                                         |
| `cupboard`   | A compendium entry this coven's cupboard names               | From the Compendium, and Annotated once a field is overridden |
| `compendium` | A compendium entry no cupboard names: all of the public list | Nothing                                                       |

A retired entry shows No Longer in the Compendium in place of From the Compendium.

## Contracts

- **The caller reads the kind, this component works nothing out.** The page passes
  `kind` from `workspaceId` and `cupboardEntry`, and `annotated` from
  `isAnnotated`; the card is handed the same by its caller.
- **No wrapper.** It renders the badges bare, so the caller lays them in its own
  `.badges` row beside the Toxic mark. With nothing to show it renders nothing.
- **Local is a `span`; the others are `output` elements**, so they carry the
  `status` role: on the page from the start, never announced.
- Meaning is the badge's words, never its tint alone.
