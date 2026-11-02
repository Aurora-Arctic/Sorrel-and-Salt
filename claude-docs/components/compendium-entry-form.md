# CompendiumEntryForm

`src/components/CompendiumEntryForm/` is the compendium's ingredient form as both edit dialogs draw it: the admin compendium's `compendium-dialog.tsx` and the compendium branch of the entry page's `entry-dialog.tsx`. It exists so the two are one piece of code. It renders `IngredientForm` with `workspaceId={null}` and `mayPromote` fixed, and turns its `sourcing` prop into the form's `sourcesIntro`, a [`SourcingScore`](sourcing-score.md) panel.

## Props

`CompendiumEntryFormProps` (`types.ts`) is `IngredientForm`'s props for the compendium, less `workspaceId`, `mayPromote` and `sourcesIntro`, plus:

| Prop       | What it is                                                                           |
| ---------- | ------------------------------------------------------------------------------------ |
| `sourcing` | The entry's `SourcingScore`, or null; left out, there is no panel (an add has none). |

Each dialog passes its own `onSaved`, `onAutosaved`, `onDeleted`, `duplicateHref`, `entryHref` and the rest, as each has its own addresses. A coven's own entry does not use this component.
