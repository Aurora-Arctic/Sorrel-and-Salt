# JarLine

`src/components/JarLine/`: one line of a list that shows a jar beside a name and some words. The recipe page's In Coven Inventory (`SpellBuilder/inventory.tsx`) and the Complete Working preview (`RecordWorking/completion.tsx`) both draw their lines through it, so the two behave the same.

## Props

`seed` and `kind` (the form's text) pick the vessel (`pickJarShape`; it is not shown). `held` and `tone` draw the level and the paint (`ok`, `low`, `out`, `empty`, which is the shelf's `jar-shelf__jar--*` modifiers). `oneOff` draws a muted jar at the middling level and gives the line no press. `name` and `words` are what the caller passes in: the inventory sends need, have and a verdict mark, and the preview sends takes, have, left, short by, one-off or no jar. `look` is a control in a column of its own at the right. `press` is the Edit Stock door: `StockJarButton`'s props, which the line wraps around the name.

## Hover, focus and motion

The button holds the name and is stretched over the jar by its `::after`, as the shelf stretches its own. Pointing at it, or focusing it with the keyboard, shakes the jar once and grows the name. A line without a press stays still. The rules are the `jar-press-motion` mixin in `src/scss/_jar-motion.scss`, the one place that says them; the entry page's shelf (`JarShelf`, [`jar-shelf.md`](jar-shelf.md), "Hover, focus and motion") includes the same mixin with its own selectors. The mixin's keyframes (`jar-shake-keyframes`) are included once, by the shelf's sheet, which is loaded wherever a jar is drawn. The amounts are `$jar-name-grow` and `$jar-shake-duration` in `_variables.scss`.

Reduced motion: no shake and no transition on the name, which still changes size.

## Styling

A caller styles its list and any context it needs through its own wrapper class: the inventory trims the eye and wraps names in a narrow column; the preview wraps long names and sets the words smaller.
