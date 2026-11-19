# ReorderMode

`src/components/ReorderMode/` holds one sortable list's Reorder toggle. While the toggle is off, each row shows its grip alone: the grip still drags, and still picks the row up by keyboard (Space, then the arrows). While it is on, each row's grip also shows Move Up and Move Down, single presses for a person who cannot drag. The buttons are drawn by `GripHandle` (`src/components/GripHandle/`), and only there.

## Parts

| Export           | What it does                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `ReorderMode`    | Holds the list's state. `name` is what the list is called. Left alone it holds its own state; `on` and `onChange` make it controlled. |
| `ReorderToggle`  | The button. `aria-pressed` is the state, the icon is the up-down arrows, and the name is "Reorder" and the list's name.               |
| `useReorderMode` | Reads `{ reordering }`. Outside a `ReorderMode` it reads off, so a list with no mode never shows the Move buttons.                    |
| `useReorderList` | Called by a sortable list inside a mode that has `waitForList`, so the toggle shows only while there is a list to reorder.            |

## Contracts

- **Every sortable list sits inside a `ReorderMode`**, and every `ReorderMode` renders its `ReorderToggle` in the same file. The `sortable-wiring` guard (`tests/guards/sortable-wiring.test.ts`) fails a list outside a mode, a mode without its toggle, `GripHandle` drawing the buttons without `reordering &&`, and a Move button drawn anywhere but `GripHandle`.
- **The toggle keeps the focus as it turns on.** Turning it off while the focus is on a Move button moves the focus to the toggle, since the button is about to go and a pointer press in Safari does not focus the toggle. The toggle finds a Move button by its `data-reorder-move` attribute, which `GripHandle` sets.
- **The pressed look** is the accent tint and an inset accent edge, as the pencil's hover look, in `index.scss`. In forced colours it takes the Highlight fill.

## The lists

| List                      | Name                     | Where the toggle sits                                                                                                                                                       |
| ------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The spell builder's steps | "Reorder Steps"          | Right of the "What Goes In" heading, while there are two steps or more.                                                                                                     |
| A help order table        | "Reorder" and its label  | In the grip column's heading on a wide table; on its own line over the cards at phone width. Each copy is `display: none` where the other shows, so only one is ever named. |
| An ordered combobox       | "Reorder" and `listName` | At the end of the line over the control. `listName` defaults to `label`. A combobox whose entries are not ordered gets no toggle.                                           |
| The Guides bar            | "Reorder Guides"         | Beside the "Guides" heading, and beside the select on a phone (help-outline.md, "The Guides bar").                                                                          |

The Guides bar alone holds the mode itself, as its list changes in the mode, and moves the focus to the first grip as it turns on.
