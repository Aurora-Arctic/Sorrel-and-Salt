# SpellMarks

`src/components/SpellMarks/` draws the badges a spell or a working carries: Draft on a draft, Private on a private one, in a `.specimen__badges` row. It is the grimoire's counterpart to `EntryMarks` ([entry-marks.md](entry-marks.md)).

## Props

- `status`: a draft is marked Draft. Complete is the default and has no badge, since a Complete badge would say nothing.
- `visibility`: a private spell or working is marked Private. Shared with the coven is the default and has no badge.

With neither to mark it draws nothing, so a complete shared spell leaves no empty row.

## Where it is used

The recipe page's head, under the title (`SpellRecipe`), and each Workings row, after its date (`SpellWorkings`). The spell card writes the same badges by hand: it adopts this component in its own change.

## Styling

None of its own: `.specimen__badges`, `.badge--draft` and `.badge--private` are the primitives' (`_primitives.scss`).

## Stories

`src/components/SpellMarks/index.stories.tsx`, titled "Grimoire / Spell Marks": `States`, a grid of
Draft, Private, Draft and Private, and Complete and Shared: Nothing Drawn. The Grimoire / Spell
Recipe stories draw the marks in the recipe's head.

## Where it is tested

Through its users: `tests/components/SpellRecipe/index.test.tsx` and `tests/components/SpellCard/index.test.tsx` assert each badge shows where it applies and not elsewhere.
