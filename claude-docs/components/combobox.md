# Combobox

`src/components/Combobox/` is a text box that suggests as it is typed in, built on Downshift's `useCombobox` (DESIGN.md §14). The hook owns the ARIA and the keyboard state; the markup, the rows and the Sass are ours. It is also the closed-set boxes (select-only, type-ahead, multi-select), the chip a list draws inside its control, and a sortable list of chips on dnd-kit.

| File                                              | What it holds                                                                                                                |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `index.tsx`, `popup.tsx`                          | The control, the list in its buckets, the typed row, the status, the indicators; the placed popup                            |
| `position.ts`, `room.ts`, `escape.ts`, `match.ts` | List placement; the placeholder's room; Escape handling for pickers; the grouped match                                       |
| `entry.tsx`, `summary.ts`                         | `ComboboxEntry`, the chip with its × and tooltip; the linked entry's summary panel                                           |
| `sortable.tsx`, `flow.ts`                         | `ComboboxSortableEntries`; where a sortable list's chips sit in a given order and where a key moves one                      |
| `select.tsx`, `typeahead.tsx`, `multi-select.tsx` | `ComboboxSelect`, `ComboboxTypeahead`, `ComboboxMultiSelect`                                                                 |
| `icons.tsx`                                       | A sortable chip's grip and a linked entry's chain; the chevron, plus and × are the shared set ([`icon-tip.md`](icon-tip.md)) |
| `index.scss`, `types.ts`                          | The control, list, row and chip; the props, `ComboboxOption`, `Suggestions` and the row types                                |

## Contracts

### Props

The props are typed in `types.ts`; the facts that file cannot carry are here and under "Props in detail".

- **`label` is a visually hidden `<label>`**, not an `aria-label`, because Chrome's Issues panel flags an input no `<label>` names; `labelId` names a caller's own label instead, and then none is rendered. It also names the list ("Form suggestions"), the status region and the chevron ("Show Form suggestions").
- **The text is the caller's.** `onPick(value, option)` gets the typed row with `null`, and the caller changes the text: a field fills itself, a list empties its box. `onFocus` and `onBlur` run after the box shows or hides its own tip.
- **`suggestions` left out means a box with no source**: it never opens, has no chevron and no status region.
- **A `ComboboxOption` is keyed** by `key` when it has one, else by its bucket, heading, label and value. Two substitute suggestions can share all three (a compendium entry and the coven's copy of it), and only the ingredient's id tells them apart. A row's accessible name is its label and note, so same-named rows are told apart by a reader as well as by the eye.
- **Icons are `ReactNode`s the caller draws**, since the box has no icon vocabulary of its own. An option's, a choice's, `typedIcon` and the box's `icon` sit in a `combobox__icon` span that is `aria-hidden`, outside the name. A qualifier carries none.
- **`colors` on an option** is a group row's `{ colorDark, colorLight }`, set inline through `chipColors()` with the `is-coloured` class. The row is edged in a bar so the colour its chip will wear shows before the pick; the group's name is still the bucket heading, so colour is never the only cue. The bar is a background image, not a border, so widening it on the highlighted row moves no text.
- **`toggle={false}`** is for a free-text search: the list opens as you type, and a chevron promises a set to browse. No design system surveyed puts one on a search box (React Aria's SearchField, Apple's Human Interface Guidelines, Algolia Autocomplete).
- **`leading`** is a slot, not a built-in, because the box knows nothing about forms. It is drawn inside the control before the entries and text, in a wrapper that does not grow, so the tab order matches the screen. A button there takes `combobox__indicator`. A press on it counts as inside the control, so it neither closes the list nor empties the box, and its click still fires (a submit goes through).
- **`clear`** and its separator are always drawn once given. While `clear.empty` they are hidden by `visibility`, out of the accessibility tree (`aria-hidden`) and the tab order (`tabindex="-1"`, `disabled`), but keep their room, so typing, choosing and clearing never change the control's width (which matters in a filter row). A pressed clear hides, so its owner puts the focus back in the box. The multi-select's does the same.
- **`keepOpen`** keeps the list open after a pick, for the next: a list field, a facet type-ahead and the category picker pass it. Escape, Tab and a press outside still close it, the focus stays in the box, and an action row closes it either way.
- **`offerTyped={false}`** is for text the caller would refuse, such as a repeat, so the row never offers what Add would refuse. Enter with nothing highlighted still reaches `onCommit`, which says why; with no suggestions either, the list stays shut. `noun` defaults to "suggestion" and a closed set passes "choice".
- **`listAnchor`** is the element the open list spans: a list field passes its row, so the list covers the box and its Add together. The field holds the row in state through a callback ref, so the box is told once it exists.
- **`aria-describedby`** is the field's hint and error; `aria-invalid` draws the error edge on the control.

### Behaviour

- **It changes no text itself.** Downshift's fill-on-select, select-on-blur and emptying of a closed box on Escape are turned off in the state reducer, so a blur, Escape and Enter all keep what was typed.
- **Free text is the default.** Nothing is highlighted when the list opens; only an arrow key or the pointer highlights a row, and only a highlighted row is picked by Enter or a click. Typing past the vocabulary is never hijacked, and the list still opens with an explicit first row, "Use what you typed: rhizome", so going past it is a visible choice (the vocabulary carries no `Other`). The row is first because it is what a typist most often wants, one ArrowDown away. It is left out when a suggestion already reads as the typed text (label, or value with no label, compared with spaces trimmed and case aside): standing first, it would make Enter write "wax" over the suggestion's own "Wax". "Wax (Animal)" and "Wax (Substance)" do not read as "wax", so the row stays.
- **Two buckets, told apart by structure.** Rows with `curated` set sit under "From Compendium" and "From Coven" headings, true because a compendium entry holds curated values alone, so every other value in use is the coven's. A source whose rows carry no `curated` lists them flat. Each bucket is `role="group"` named by its heading, on a `div` inside a presentational `li`, because ARIA allows no `group` role on an `li` (axe's `aria-allowed-role`). The distinction is text, never colour alone.
- **Or the source's own buckets.** A row carrying `heading` is grouped under it (a category under its group's name), and once any row carries one `curated` is not read. The buckets stand in the order the headings first appear in `options`; rows without a heading go in a trailing unheaded bucket. Each heading is keyed by its place (`heading-0`), not its text, which may hold a space and would split the `aria-labelledby` reference.
- **A pick closes the list**, unless `keepOpen` is set. Two rows that pick as the same text ("Wax (Animal)", "Wax (Substance)") are told apart after the pick by the caller's `qualifier`; a variant's `form` stores the string (DESIGN.md §5).
- **A pending lookup is shown and said.** While `suggestions.pending` the input carries `aria-busy` and the indicator strip holds a `Spinner` (it shows after `$loading-delay`, so a quick answer never flashes it), beside the status region's "Looking for" line.
- **It opens as text is typed, on ArrowDown, and from its chevron**, and only once there are rows; a list wanted while the lookup is pending opens as the rows arrive, the typed row counting as one.
- **Leaving the box shuts its list for good.** A list wanted but without rows is not open to Downshift, so without a blur dropping the wish, a late answer would open the list and Downshift would focus the box, pulling the focus from whatever was in use. An open list is Downshift's own to close.
- **Enter.** A highlighted row is picked. Otherwise, with `onCommit`, Enter is the caller's and never the form's submit. Without `onCommit`, Enter closes an open list, and on a closed box reaches the form as any text box's Enter does.
- **Backspace or Delete in an empty box** calls `onRemoveLast`, as react-select does; with text in the box the keys edit it.
- **The control is the box.** A press on its padding, between the entries, or where a hidden clear keeps its room puts the caret in the text, as a plain input would (`visibility` passes the press to the indicators' strip, the control's own ground). The control is `role="presentation"`; the box inside is what a reader and the keyboard reach.
- **The list is announced** by a visually hidden `<output>`, named like the list, reading "3 suggestions", "No suggestions" or "Looking for suggestions" while the list is open and nothing while closed. It is its own region, not Downshift's `getA11yStatusMessage`, which announces on the box's state and not on rows arriving after the debounce. A ListField's own `<output>` is named "Folk Names changes" so the two are told apart.
- **`aria-activedescendant`** is left off while no option is highlighted: Downshift writes `""`, which points at nothing and which a checker reads as a broken reference.
- **Entries sit inside the control**, ahead of the text, each a chip with its own ×, with the clear and chevron on the right parted by a line. The chip classes `combobox__entry` and `combobox__entry-remove` are drawn here so any list reuses them.

#### Row order

The rows are the typed row first, then the curated bucket, then the in-use bucket: flat for Downshift, which numbers them, and bucketed for the headings. A caller with an `action` has the action row where it says instead of the typed row first. A typed box narrows a grouped list by the row's own label or its group's name (`matchesLabelOrGroup`, `match.ts`), so typing a tradition lists its deities; one place means every grouped list narrows alike.

#### Typed box and Escape

Escape on a closed box is left to the dialog: Downshift would prevent the key whenever the box holds text, which stops a modal around it hearing its `cancel` event, so the box marks it `preventDownshiftDefault`. The one exception is the empty message, open content Downshift does not know of (it has no rows, so `isOpen` is false): Escape closes it alone and is prevented, and the next Escape reaches the dialog.

#### Typing always wants the list

Downshift's open callback fires only when the open state differs from the props it last committed, so a key landing just after a pick closed the list, before that render committed, read as no change and the list stayed shut. The input's own `onChange` therefore sets the wish to open itself.

## Where the list opens

`useListPosition` (`position.ts`) places the open list on Floating UI's `useFloating` (DESIGN.md §14), which owns the flip, the room, and following a scroll or resize.

- **As wide as its anchor**: `listAnchor`, else the control.
- **Never off the screen.** It opens beneath the box, flips above when there is more room there, sits 8px from the screen's edge, and is no taller than the room it has: `size` sets `--combobox-list-room` and the stylesheet caps the list at `min(20rem, that)`, which holds the eight seeded category groups without a scroll. Its side is `data-placement`.
- **Followed only while open** (`autoUpdate`); every box's closed list stays in the page, as Downshift asks, and has nothing to follow.
- **Fixed, not absolute**, so a scrolling ancestor such as a modal cannot clip it.
- **A row never scrolls it sideways**: an unbroken word, such as an address, breaks anywhere (`overflow-wrap: anywhere` on the row, `overflow-x: hidden` on the list).
- **Shared.** An entry's summary uses it with `matchWidth: false`. MenuButton's menu uses it with `placement: 'bottom-end'`, `gap: 8` (not 4) and `matchWidth: false` ([`menu-button.md`](menu-button.md), "Where it opens").

### Bottom bar room

The phone's fixed bottom bar (`.section-nav`) sits over the foot of the window, which Floating UI cannot see. `flip`, `shift` and `size` therefore take a `bottom` padding of the edge plus the bar's measured height, safe area included, read at every placement, so a field near the foot opens above. The bar is found by its class, the name the shell's stylesheets already key on, not a prop threaded through every box. Without the padding `size` shrinks the list to the sliver left, which still "fits" below, so `flip` never fires. The height is measured, not restated from tokens, because only the browser knows the device's safe area.

### The popup

`combobox__popup` holds the listbox and, beneath it, the empty message; it is the one element placed, so the two move together. With `empty={false}` there is no wrapper and the listbox is placed itself. The `<ul>` keeps Downshift's `getMenuProps`, so its `id` and the input's `aria-controls` agree. Downshift counts only the input, the toggle and the listbox as inside, and closes on a press anywhere else. The popup is a panel and does not scroll; the `<ul>` does, because Downshift scrolls the highlighted row into view within the menu element and a scroller outside it is never moved (an arrowed-to row stayed hidden that way).

## The empty message

**A typed box never closes for having nothing to show; it says so.** The message is part of the Combobox. The default is "No match for “text”" (curly quotes, worded once, `noMatch` in `popup.tsx`); a caller passes a more specific sentence ("Keep typing to search") or `false`. The multi-select box says "Every option is already chosen" when opened with nothing left; it takes no typed text, so has no "no match".

- It shows once the lookup has settled (`pending` false), the text is not blank, the person wants the list open, and there are no rows at all. The typed and action rows count as rows, so a caller wanting the message passes `offerTyped={false}`.
- It is drawn beneath the listbox, never in it, because it is not an option and a reader must not count it as one. The status reads it; with rows the status keeps its count and no message shows. Downshift still reads the list as closed (`aria-expanded` false).

## The action row

`action` is a last row that does something rather than picking a suggestion, in italics and Title Case (it is a command), reached by the arrow keys and picked by Enter or a click, which call `onSelect` and never `onPick` and leave the text as typed. It is no result, so the status does not count it. It stands in place of the typed row and is there whatever is typed, a blank box included, so ArrowDown or the chevron opens the list on this row alone before any suggestion arrives, and ArrowUp opens it on this row. `actionFirst` puts it nearest the box, for an action that stands for what was typed (the spell builder's `Add "<typed>" as a one-off ingredient`).

Users: "See All Results" ends the ingredient search's dropdown when there is another page and applies the search to the list; "New Reference…" ends the references box, whose entries can only be picked, so the sources found come first and making one is the way out. The caller still passes a no-op `onCommit` there so Enter with nothing highlighted never reaches the form.

- **A second pick keeps the text.** Downshift remembers the last row picked, and with `selectedItem` held at `null` the next pick reads as that prop changing and writes the null item's text, `''`, into the box. The state reducer keeps the text on `ControlledPropUpdatedSelectedItem` as it does on a click or Enter.
- **A browser script must wait a frame between a click and a key.** Downshift reports a click's close through an effect, so a key pressed before React commits it is handled by the last render, which still has the list open: ArrowDown then moves the highlight rather than opening the list. Playwright's `locator.press` straight after a pick does this; a person never does. It is not a defect.

## The select-only box

`ComboboxSelect` (`select.tsx`) is a closed set on the same control and list, for a field nothing is typed into: every closed enum DESIGN.md §14 names. It replaces the native `<select>` so a form's fields share one look ([`design-decisions/mb.131-closed-sets-on-the-combobox.md`](../design-decisions/mb.131-closed-sets-on-the-combobox.md)). The DateField's month and year pickers are two of these ([`date-field.md`](date-field.md)).

- **It is Downshift's `useSelect`**, ARIA 1.2's select-only combobox: the control itself is the `role="combobox"` element, a `div` in the tab order, labelled through `aria-labelledby` and carrying the field's hint, error, `aria-invalid` and `aria-required`. A press, ArrowDown or ArrowUp opens the list on the current choice; the arrows move, Enter or Space chooses, Escape closes and keeps the choice, and a letter jumps to the choice it starts. Without `labelId`, `label` is its `aria-label`.
- **A choice with value `''`** clears the set ("None"). `placeholder` shows while the value is none of the choices and is never in the list.
- **A disabled choice** is listed where it stands, `aria-disabled`, stepped over by the arrows and refused a press, its `note` on a second line (the coven picker's coven that already holds the entry). `count`, `disabled` and `note` beyond that are the multi-select's.
- **`disabled` on the box** is `aria-disabled="true"`, out of the tab order, deaf to the pointer and keys (Downshift leaves its handlers off), drawn as a disabled input is, its field's label dimmed. It is not the attribute, because Downshift would write `disabled` onto the `div`, where it means nothing.
- **`busy`**: `aria-busy="true"` and a `Spinner` in the indicators; the value shown stays the caller's.
- **Ctrl or Cmd keydown on the closed box** sets `preventDownshiftDefault`, so Ctrl+Z, the form's undo ([`field.md`](field.md#undo-and-redo)), is not read as a letter that opens the list.
- **The chevron is `aria-hidden`**, since the whole control is the one target, and the control takes the focus ring itself.
- Both closed boxes float as the suggesting box does, so a modal holding one does not stretch. The Modal workshop's `States`, 'With Pickers', holds both pickers to try it.

### Escape on a picker's open list

`useSelect` closes the list but lets the key through, unlike `useCombobox`'s typed box, and inside a modal the `<dialog>` then takes it as a close request, shutting the modal or asking a changed form to discard. The box marks the key handled (`keepEscapeInList`, `escape.ts`), so the dialog's cancel does not fire while Downshift's own handler still closes the list. With the list shut, Escape reaches the modal as ever. The multi-select does the same.

## The type-ahead box

`ComboboxTypeahead` (`typeahead.tsx`) is a closed set chosen by typing, react-select's single select, for where a select-only box makes a person scroll for one among many (the curated values' groups; `GroupedValueForm` through `SelectField`'s `typeahead`, `GroupedValueList`'s group filter). It is the typing box over the set's choices: the text is its own, each choice is a row whose value is its label and whose `key` is the choice's value, and it passes `offerTyped={false}`, `highlightFirst` and `noun="choice"`, so the list is "Tradition choices" and holds only choices. It is imported from `@/components/Combobox/typeahead`, not the folder's index, because it imports the index and the lint refuses an import cycle. It does not use the ingredient form's `fold` (which folds as the database does); it matches what a person types against a label they read, so it folds in their locale.

- **Typing narrows the list** to the choices whose label holds the text, in any case, anywhere in the name. While the text is the chosen label itself nothing is narrowed: a box holding a choice opens on every choice.
- **The first row is highlighted** as the list opens and narrows; Enter or a click chooses, Escape closes without choosing, a press on the box opens it.
- **Only a choice is ever the value.** Typing reports `''` while the text names no choice in full and the choice once it does, in any case ("mockish" chooses Mockish); left, the box reads the choice's own label. Text naming no choice stays in the box, so a required field shows its error on save (`SelectField`, [`field.md`](field.md)).
- **A pick or a value set from outside writes the choice's label** into the box, unless the text already names it.
- **A choice's `qualifier`** (a member's role) reads in its row in brackets, "Fixture B (Member)", and, chosen, the box shows the label with the qualifier after it, muted, its detail in the tooltip ("A qualifier"). The text a pick writes and the match are the label alone. A choice's `icon` reads before its label in the row and ahead of the text in the box. Both show only while the box reads the chosen label as written, not while it is typed over in another case.
- **`clearable`** puts a clear on the control's right before the chevron, offered while the box holds text or a choice, hidden otherwise with its room kept, so the box keeps one width; it empties both and leaves the focus in the box.
- **`onSettle`** hears the value once the person is done with the box, never while they type: on a pick (the choice's value), the clear (`''`), and leaving (the choice the text names in full, or `''`). It is called whether or not the value changed. A list filter applies on it, comparing with the choice the page shows, so typing "mock" opens no list on the way to "Mockish" ([`filter-form.md`](filter-form.md)). `onChange` still hears every change.

## The multi-select box

`ComboboxMultiSelect` (`multi-select.tsx`) is the select-only box for a closed set holding several values in the order chosen. It looks as a list field does (react-select's multi-select): each value a `ComboboxEntry` chip inside the control, the clear and chevron on the right. Nothing is typed; the list is the only way in and offers only choices not yet made.

- **It is `useSelect` with `useMultipleSelection`**, the pairing Downshift documents. `useSelect` owns the box and list as `ComboboxSelect`'s does (Escape closes the list alone). `useMultipleSelection` holds the chosen list and gives the box Backspace, which takes the last chip. Chip focus by arrows is held off (`activeIndex` at -1): each chip's × is already a button in the tab order.
- **A choice appends and the list stays open**, the row below the chosen one highlighted. With nothing left, or only disabled rows left, the list does not open (the empty message says so).
- **The control is presentational and the box inside is the combobox**, because the chips' × and the clear are buttons, and inside the combobox a press or key on them would be the box's. The box takes the text's place after the chips and reads what it holds ("Air, Fire") in visually hidden text. A press on the control's padding or chevron opens the list.
- **The placeholder stays after the chips while a choice is left**, hidden from a screen reader there (read, it would sound like a choice), and goes once every choice is made; with nothing chosen and nothing left, `emptyPlaceholder` says so.
- **An × or the clear leaves the focus in the box**, which is found by id, since the caller's ref and Downshift's two already share it.
- **Each change is announced** in a visually hidden `<output>` ("Element changes": "Added Air", "Removed Air", "Cleared Element"), WCAG 4.1.3.
- **A chip's key is its position joined to its value**: a repeat can be loaded (the form refuses it only on save), and two chips must not share a key.
- **Counts and disabled rows (a filter).** A row reads "Fire 9": the count follows the label in its own span, small and muted, no brackets, after a space that is a text node, because an accessible name drops a space a span begins with. `hideZeros` leaves out zero-count rows, and with every count 0 there is nothing to list. A value already chosen is a chip, never a row, so a chosen zero-count value stays removable. A disabled row is truly disabled (`isItemDisabled`: `aria-disabled`, skipped by the arrows, not chosen by click or key), listed after every choosable row so the keys meet those first, keeps its text's ink rather than being dimmed, and says why beside its count.
- `removeNoun` names each × "Remove {Noun}: {Value}"; `loading` and `chipsOutlined` are the chip's (see "An entry").

## An entry

`ComboboxEntry`, a named export, is the chip a list passes in `entries`, inside a `ul.combobox__entries`.

- **Its × is a real button**, in the tab order, named "Remove Hedge Fixture" (not a bare "Remove"), a 24px target with the focus ring, described by the list's error when `errorId` names this entry, which also draws the error edge on the chip.
- **A long text is cut off, never wrapped or let run.** The chip is no wider than the control and its text ends in an ellipsis, so every chip is one line and nothing scrolls the page sideways at 320px; the × never shrinks. The whole text stays reachable: it is in the DOM, the × is named by it, and a `role="tooltip"` shows it above the chip while the entry is hovered or its × has focus.
- **The tooltip is InfoTip's bubble and fade** (`tip-bubble`, `useTip`, [`info-tip.md`](info-tip.md)). It stays in the page while closed, faded and `aria-hidden`; opens only on an entry that is cut off, measured as it opens; closes on Escape (WCAG 1.4.13); waits 150ms before closing so the pointer can cross onto it; and breaks an unbroken text anywhere. It runs from the chip's left edge as wide as its words, up to InfoTip's measure (18rem, or the screen less its gutters), past the chip and the control: only being cut off is wrong. `useTip` places it (Floating UI, `top-start`), shifting it inside the screen.
- **`detail`** (a linked substitute's "Dried leaf · Compendium entry") sits on its own line beneath the text in the tooltip, at the caption size and in the bubble's own colour (a muted one is not checked against the bubble's ground). An entry with a detail or a qualifier always has something to show, so its tooltip opens on hover and on the ×'s focus whether the text is cut off or not. The detail describes the ×, after the list's error, so a reader hears it although the tooltip is `aria-hidden` while closed.
- **`qualifier`** reads after the text on the tooltip's first line in brackets ("Testward (Wards & Fixtures)"), and as the ×'s description before the detail, brackets left out.
- **`colors`** sets the group's pair inline through `chipColors()` and marks the chip `is-coloured`: a wash of the theme's colour (`chip-wash()`, an inset ring for the edge), its text and × in the label ink that holds 4.5:1 (`styling.md`, "Category chips"). It keeps the plain chip's shape, padding and 24px ×, so a row mixes the two without a jump. The focus rings and the grip use `currentcolor`; the ×'s hover keeps its own wash; the error edge stays. A sortable entry passes `colors` the same way.
- **`note`** is read in brackets after the text, visually hidden: "name only" on a typed substitute, which lacks the link mark a linked one has.
- **`summary`** turns the text into a button ("A linked entry's summary").
- **`icon`** leads the text, `aria-hidden`. **`count`** follows it as a small muted number, no brackets, outside the cut-off span (a long name loses its tail, never its count), its space a text node so the chip reads "Water 7". **`loading`** swaps the count for a shimmering placeholder (`skeleton-shimmer`, kept under reduced motion), `aria-hidden`, and wins over `count`. **`removeNoun`** names the × "Remove {Noun}: {Value}", the same whether or not the count has arrived. **`outlined`** draws an outline on the card (`outlined-chip`, `_mixins.scss`) instead of a wash; a coloured chip stays washed.
- **The order a reader hears** on the ×: the list's error, the qualifier, then the detail. The handle (sortable) reads them before how it moves.

### An action on an entry

`action` (`EntryAction`, `types.ts`) is one button ahead of the ×, a real button in the tab order, named by `label`, described as the × is, its `tip` shown by [IconTip](icon-tip.md). Its click removes nothing and does not touch a sortable entry's handle. A list gives one per row or none; the Combobox knows nothing of what it does.

## A linked entry's summary

`summary`, `{ label, content }`, is what a linked entry opens: `IngredientForm` gives one to each substitute that links an ingredient ([`ingredient-form.md`](ingredient-form.md), "A linked substitute's summary"). The chip's text becomes a button (`.combobox__entry-open`) led by a `LinkIcon`, named by the text, described as the × is, with `aria-haspopup="dialog"`, `aria-expanded` and `aria-controls` while open. A press opens a non-modal `<dialog open>` named `label`, after the button in the chip, so Tab runs from the text into the panel and on to the ×. It opens by attribute, not `show()`, so the browser gives it no Escape of its own. `content()` is called only while open, so it may ask the server then. The behaviour is `useEntrySummary` (`summary.ts`).

- **It shuts four ways**: a second press of the button; Escape, from the button or anywhere in the panel, which hands the focus back to the button; a press anywhere else, on the capture phase, the focus left where the press put it; and the focus leaving both the button and the panel. A blur to nowhere, or a press on the panel's own text, keeps it.
- **Escape is cancelled** (`preventDefault`): a modal `<dialog>` turns an Escape nobody cancelled into its own `cancel` event, and the form's modal asks to close with unsaved changes. Cancelled, the key shuts the panel alone and the next reaches the modal.
- **It is placed by `useListPosition`** with `matchWidth: false`: beneath the chip, flipped above when there is more room, fixed so the control and modal clip nothing, as wide as its words up to a tip's measure, scrolled within the room it has.
- **The tooltip stays shut while it is open**, and a press of the button closes an open tooltip.
- **A sortable entry takes none**: its text is already its handle.

## A sortable list

`ComboboxSortableEntries({ entries, onMove })` is what a list whose order means something passes in place of its own `ul.combobox__entries`. Each entry is a chip's props with an `id`, its identity as it moves (a react-hook-form list takes it from its field array's `id`); `onMove(from, to)` gives indexes into `entries` and the caller reorders. It is on dnd-kit's sortable preset, a standard package rather than a bespoke one (DESIGN.md §14, "A library to move a list's entries?").

- **Each chip's handle is its grip and its text, one button**: six muted dots ahead of the text, a real `<button>` in the tab order before the ×, with the focus ring, named for its entry ("Move Mars"), carrying `aria-roledescription="sortable"`, described by the list's error and the entry's detail, then by how it moves ("Press Space or Enter to pick it up, the arrow keys to move it, and Space or Enter to put it down, or Escape to cancel."). Its focus opens the chip's tooltip. A list that is not sortable draws its text bare.
- **By pointer**, the chip is dragged onto another's place, the others sliding aside. A mouse or pen drag starts after 4px of movement, so a press focuses the handle and opens its tooltip rather than dragging. A finger drags after resting `TOUCH_DRAG_DELAY_MS` (250ms, moving no more than 5px) on dnd-kit's `TouchSensor`; the pointer sensor skips touch so the two never race. The constant in [`src/lib/sortable`](../../src/lib/sortable/index.ts) sets it for every sortable list. `touch-action: none` on the handle lets a touch drag move the chip, not the page. The chip is over the place whose centre is nearest its own (closest-centre collision).
- **By keyboard**, Space or Enter lifts the focused chip and puts it down, or Escape puts it back. Between, Left and Right step it a place along the list, whichever row; Up and Down jump a row to the place whose centre is nearest its own and stay put from the first or last row; Home and End go to either end; past either end it stays. The focus stays on the moved chip's handle throughout.
- **Each step is said** in dnd-kit's live region, worded by the entry's text and place, not dnd-kit's default id: "Picked up Mars, at position 1 of 3.", "Mars moved to position 2 of 3.", "Mars put down at position 2 of 3.", "Move cancelled. Mars is back at position 1 of 3." dnd-kit reports a lifted chip over its own place at once, which would talk over the lift, so that report is left unsaid. The region and instructions take ids from `useId`, since dnd-kit's counter would number a server render and the browser's apart.
- **Shared with the spell builder's steps**: the sensors, keyboard target with its collision detection, handle instructions and wording live in `src/lib/sortable`. Each list keeps its own layout, sorting strategy and arrow keys: chips flow in a wrapping row, steps stand in a column ([spell-builder.md](spell-builder.md), "Reordering").

### Sortable layout

dnd-kit's `rectSortingStrategy` moves each chip onto the box of the chip whose place it takes, which suits equal cells; chips of different widths overlap or leave gaps. So [`flow.ts`](../../src/components/Combobox/flow.ts) lays the chips out as the wrapping row does: in the order the move would give, each as wide as it is, `columnGap` apart, onto the next row once the width is used up. The row's shape (width, gaps) is measured as a move starts (`shapeOf`), from the stylesheet or, where there is none (happy-dom), from where the chips sit. Each chip making way, and the moved chip under the keyboard, is translated to its place in that layout, never scaled, so what shows while held is what the drop leaves. Sub-pixel widths sum a hair past the row a browser still fits them on.

The keyboard's next place comes from `flow.ts` (`placeFor`), not dnd-kit's `sortableKeyboardCoordinates`, which takes the nearest chip in the arrow's direction: across wrapped rows of different widths that is not the next one (Left from a row's second chip landed on the row above). The list's coordinate getter records the target, which the list's collision detection returns for a keyboard move in place of the nearest box; a pointer move still takes the nearest.

## A qualifier

`qualifier`, `{ text, detail? }`, is what a pick leaves out of the box's text: the Form box passes a picked form's group ("Substance" for "Wax") and its description as the detail. The box only draws it; whether a pick holds, and when an edit drops it, is the caller's.

- **It follows the text, in brackets and muted** (the row's note's ink), so the box reads as the row picked did, "Wax (Substance)". The text's slot is as wide as the text while a qualifier shows, sized by a hidden copy of the value in a one-cell grid, so the qualifier sits straight after it. The slot is always in the page, so a pick never remounts the box and takes its focus. The qualifier never shrinks; a long text gives way. A press on it puts the caret in the text.
- **It is the box's description.** `aria-describedby` lists the caller's description first (hint and error), then the qualifier's text and its detail, so a reader hears "(Substance)" without the tooltip; the detail is read although its tooltip is `aria-hidden` while closed.
- **The detail is a tooltip** (`role="tooltip"`, the entry tooltip's bubble and fade), above the control (the list opens beneath) with its left edge on the qualifier's, so it reads as the qualifier's own, no wider than what is left of the control from there. Where the qualifier starts is measured as the tip opens, since CSS cannot place a box by one element and bound it by another. On a phone (`$shell-phone-width`) it is shifted back inside the window and wraps, because from the qualifier there is too little room.
- **It opens while the qualifier is hovered and while the box has focus** (the qualifier is no tab stop; the box is what the keyboard reaches). Escape closes it (WCAG 1.4.13), as do a blur and the pointer leaving, after the entry's 150ms. With no detail there is no tooltip.
- **It gets out of the way of typing.** The first printable key (one character, no Ctrl, Alt or Meta; a shortcut is not typing) and the list opening, by typing, an arrow key or the chevron, both close it. Focus returning or a hover reopens it. The detail stays in the description meanwhile.
- **The open state is `useTip`**, InfoTip's hook (`../InfoTip/use-tip.ts`), shared with `ComboboxEntry`: open while `canOpen` says there is something to show, closed at once on blur and on Escape anywhere in the document, and after 150ms when the pointer leaves ([`info-tip.md`](info-tip.md)).

## The debounce

`src/lib/debounce.ts` holds the one debounce a typed lookup waits on: `useDebouncedValue(value, delayMs = DEBOUNCE_MS)` returns the value once it has stopped changing for 300ms, starting as the first value given so a lookup waits on typing and never on mounting. Every typed lookup uses it, so none has a second.

## Props in detail

- **`ComboboxOption.meta`** is a node so a caller can colour its words (the spell picker's categories, in their groups' chips); one line, ending in an ellipsis; only its text counts toward the option's name. **`badge`** is information only (the spell picker's In Jar), so a caller gives words a reader can use.
- **`empty`**, **`clear`**, **`leading`**, **`action`**, **`offerTyped`**, **`actionFirst`** and **`keepOpen`**: see "Props", "The empty message" and "The action row".
- **`icon`** on `ComboboxProps` is the type-ahead box's chosen icon, there while the box reads the chosen label.
- **`ComboboxQualifier`**: see "A qualifier". **`ComboboxChoice.group`** is a deity's tradition, drawn by the facet box's typing form only and an `optgroup` in the native select.
- **`ComboboxEntryProps.summary`** is left out of a sortable entry, whose text is already its handle.
- **`ComboboxTypeaheadProps.clearable`** is a filter's way back to every group.

## Styling

Tokens, mixins and the form primitives only; the lengths left raw are the control's own geometry and say so in a comment (`index.scss`). A highlighted row is `$fill-highlight`, the accent 12% into the card, the wash every menu's item wears. A bucket's heading is muted small capitals with a step of space above it. A box stands at `$control-height`, level with a text field and a button: its text line, `$text-height`, is the control's height less its 1px edge and `space(1)` padding, and a typed box, a select's value and the qualifier's hidden copy all take it. Every × and indicator is a 24px target (`$icon-size`, WCAG 2.2's minimum) around a `$glyph-size` mark, fading into hover as `.btn` does on `theme-transition`, never under reduced motion, and drawn on `:focus-visible` as well as `:hover`. A count is the muted ink at the label's size (`.combobox__count` in a row, `.combobox__entry-count` in a chip).

### Control

The control is the `.input` primitive opened up as a wrapping flex row (entries, text, indicators), its padding a step down so the entries sit inside at the control's height. The rule is `.input.combobox__control`, compounded: the app emits the primitive as `body .input`, which a lone class loses to, so every box stood 8px over `$control-height`. The workshop scopes primitives in `:where()`, which weighs nothing, so it never showed; a height check in `tests/e2e/admin-compendium.spec.ts` holds the app to it. The ring and error edge are drawn from the box's own states (`:has(.combobox__input:focus-visible)`, `.is-invalid`); the multi-select's box (`.combobox__input--select`) gets the same ring. The select-only box is weighted with `.input` likewise, or that rule's caret wins over the whole box. Rows that wrap sit `space(2)` apart between rows and `space(1)` along one, in the control, values and chips alike, so wrapped chips do not read as one block. The chip list carries `space(1)` above and below, on the list rather than the control, so one row still fits the text's line and a box with chips stays at the control's height. The compact text height is the same line off `$control-height-compact`; a list in a field uses the box's caption size.

### Chips' room

Beside entries the text keeps room as wide as the placeholder (`--combobox-room` from `room.ts`, in `ch`, never past the row), so the prompt shows whole or wraps onto a row of its own under the chips instead of being cut to a few letters. `ch` is a digit's width, a little wider than the average letter, so the room errs wide. Without chips the text has the row to itself; otherwise it keeps at least 6rem before wrapping.

### Text slot

A one-cell grid: the box takes the rest of the row. With a qualifier it is as wide as the text, the cell sized by a hidden copy of the value in the box's own font and padding. The track can shrink below its content, so a long text gives way inside the control. The text input is one character wide of its own so the slot, not the browser's default of twenty, decides.

### Qualifier detail

Above the control, left edge on the qualifier's, placed by `useTip` against the qualifier and kept on the screen; wraps within the measure; never beneath the box, where the list opens.

### List

Placed by `useListPosition`, its position, width and side set inline; the stylesheet gives the look and a height of at most 20rem (a measure of rows) or `--combobox-list-room`. The clear and separator hide from the eye and pointer by `visibility`, from the tree and tab order by markup. `aria-expanded` sits on the input, button or control beside the indicator, never above it, so a selector on it cannot reach the chevron; the root carries `is-open` while open, and the flip waits on it.

### The popup's styling

With an empty message the popup is the placed, bordered panel (`floating-panel`'s 1px edge, inset) and the listbox inside is a plain list; without one, the list is the panel. The listbox is the scroller and reads `--combobox-list-room`, which the placement sets on the popup.

### Rows at the edges

The list has no padding above or below its rows, so the first and last rows' wash meets the panel's edge, and those rows take its inner corners (radius less the 1px edge): the top two for the first, the bottom two for the last, all four for a row alone. In a grouped list the top is a heading, so only the last group's last row rounds. A disabled row is truly disabled, not dimmed.

### Entry chip

A filled, square-cornered chip in an 18% wash of the muted ink (react-select's shape), neutral because a free-text entry has no group to take a colour from; its × hovers in the warning's wash and ink. The × target stands in for the right padding. The entries list has no margins, bullets or gap of typography-base's. A group-coloured chip uses the full level of the group's wash read from the pair `chipColors()` sets; the entry has no border, so the edge is an inset ring.

### Dragged chip

The chip being moved is plain to see once picked up: the accent 22% into the card, opaque so it hides what it passes over, a 2px accent edge, the floating shadow, its grip in the body ink. The edge stands in for an error's while held and the error's returns on the drop; the focus ring around its text is left off meanwhile. A sortable handle is unboxed, so the chip reads as one, with the focus ring and a grab cursor; its grip is muted and stands in for the text's left inset. The chips making way slide on dnd-kit's inline transition, which only an important rule outweighs, so under reduced motion they step.

### Linked entry

The text is a button led by a link mark in the accent, the text in the body ink with no underline at rest (underlined while its summary is open), both in the accent's hover when pointed at. The accent clears only the 3:1 a mark needs on the chip's wash, so the text keeps the body ink (`tests/scss/tokens.test.ts`). It is unboxed and shrinks with the chip so its text can be cut off. The summary has the list's floating surface and edge.

### Other

The category bar is 3px, 5px on the highlighted or hovered row over 150ms (at once under reduced motion), its left edge level with the group heading's text and set a step in from the row's top and bottom. An entry action has the × target and glyph, square, in the accent a pointer or focus warms, since it makes rather than takes away. The loading placeholder is 1.75ch by 0.8em, centred on the chip's line, filled with the chip's own ink at low strength so it shows on any chip. The chip's leading mark is as tall as the text beside it.

## Stories and tests

Stories are in `src/components/Combobox/index.stories.tsx`; the stories that open a list press the chevron on mount, as a person would (`.storybook/press.ts`), and the suggestions are fixed. Tests are in `tests/components/Combobox/` (`dom` project, role and label queries only), with the debounce in `tests/lib/debounce.test.tsx` and the sortable driver in `tests/support/sortable.ts`. happy-dom lays nothing out, so tests give the viewport, box, anchor, list and chips the sizes Floating UI and dnd-kit read; `moveByKeyboard` waits a task after each key (the keyboard sensor listens a task after the lift) and `dragByPointer` waits out the 50ms in which the sensor swallows every click. Presentation (colours, caret on a press, qualifier place, list width and position, the chips' layout while held) is owned by the workshop story and the Playwright scan, `tests/e2e/workshop/combobox.spec.ts`. Accessibility is asserted in Playwright, with a lookup's list open in the compendium form's modal in `tests/e2e/admin-compendium.spec.ts`.

## Used by

`IngredientForm` (form and folk-name lookups, every list field, celestial bodies, signs, deities and substitutes with their sources, the element multi-select), `CategoryPicker`, `FacetCombobox` ([`facet-combobox.md`](facet-combobox.md)), `GroupedValueForm` and `GroupedValueList`, the ingredient search, the spell builder, `WorkspaceSwitcher`, `DateField`, and `MenuButton` (placement only).

## Not here

The text a pick writes, and whether a qualifier holds (the caller). Icon sets (the caller hands in drawn nodes). Forms: the box knows nothing of them.
