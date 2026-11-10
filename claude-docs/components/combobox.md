# Combobox

`src/components/Combobox/` is a text box that suggests as it is typed in, built on Downshift's `useCombobox` ([`ingredients.md`, "A closed set wears the combobox"](../design-decisions/ingredients.md#a-closed-set-wears-the-combobox)). The hook owns the ARIA and the keyboard state; the markup, rows and Sass are ours. The folder also holds the closed-set boxes (select-only, type-ahead, multi-select), the chip a list draws inside its control (`ComboboxEntry`), and a sortable list of chips on dnd-kit. The chevron, plus and × icons are the shared set ([`icon-tip.md`](icon-tip.md)); the folder draws only a sortable chip's grip and a linked entry's chain.

## Contracts

### Props

The props are typed in `types.ts`; the facts that file cannot carry are here and under "Props in detail".

- **`label` is a visually hidden `<label>`**, not an `aria-label`, because Chrome's Issues panel flags an input no `<label>` names; `labelId` names a caller's own label instead, and then none is rendered.
- **The text is the caller's.** `onPick(value, option)` gets the typed row with `null`, and the caller changes the text: a field fills itself, a list empties its box.
- **A `ComboboxOption` is keyed** by `key` when it has one, else by its bucket, heading, label and value. Two substitute suggestions can share all three (a compendium entry and the coven's copy of it), and only the ingredient's id tells them apart.
- **Icons are `ReactNode`s the caller draws**; the box has no icon vocabulary. They are `aria-hidden`, outside the name.
- **`colors` on an option** is a group row's `{ colorDark, colorLight }`, set inline through `chipColors()`. The row is edged in a bar so the chip's colour shows before the pick; the group's name is still the bucket heading, so colour is never the only cue. The bar is a background image, not a border, so widening it on the highlighted row moves no text.
- **`toggle={false}`** is for a free-text search: the list opens as you type, and a chevron promises a set to browse. No design system surveyed puts one on a search box (React Aria's SearchField, Apple's Human Interface Guidelines, Algolia Autocomplete).
- **`leading`** is a slot, not a built-in, because the box knows nothing about forms. A press on it counts as inside the control, so it neither closes the list nor empties the box, and its click still fires (a submit goes through).
- **`clear`** and its separator keep their room while `clear.empty` (hidden by `visibility`, out of the tree and tab order), so typing, choosing and clearing never change the control's width (which matters in a filter row). A pressed clear hides, so its owner puts the focus back in the box. The multi-select's does the same.
- **`spellCheck`** turns the browser's spell-check off for a box whose words are names; unset, the browser decides. **`autoCapitalize`** and **`enterKeyHint`** pass through to the typed box the same way: `none` for a box of names or identifiers, and the Enter key's label (`next` between fields).
- **`keepOpen`** keeps the list open after a pick, for the next: a list field, a facet type-ahead and the category picker pass it. An action row closes it either way.
- **`offerTyped={false}`** is for text the caller would refuse, such as a repeat. Enter with nothing highlighted still reaches `onCommit`, which says why; with no suggestions either, the list stays shut. A closed set passes `noun="choice"`.
- **`listAnchor`** is the element the open list spans: a list field passes its row, so the list covers the box and its Add together. The field holds the row in state through a callback ref, so the box is told once it exists.

### Behaviour

- **It changes no text itself.** Downshift's fill-on-select, select-on-blur and emptying of a closed box on Escape are turned off in the state reducer, so a blur, Escape and Enter all keep what was typed.
- **Free text is the default.** Nothing is highlighted when the list opens; only an arrow key or the pointer highlights a row, and only a highlighted row is picked by Enter or a click. The list opens with an explicit first row, "Use what you typed: rhizome", so going past the vocabulary is a visible choice (the vocabulary carries no `Other`). The row is first because it is what a typist most often wants, one ArrowDown away. It is left out when a suggestion already reads as the typed text (label, or value with no label, compared with spaces trimmed and case aside): standing first, it would make Enter write "wax" over the suggestion's own "Wax". "Wax (Animal)" and "Wax (Substance)" do not read as "wax", so the row stays.
- **Two buckets, told apart by structure.** Rows with `curated` set sit under "From Compendium" and "From Coven" headings, true because a compendium entry holds curated values alone, so every other value in use is the coven's. Each bucket is `role="group"` named by its heading, on a `div` inside a presentational `li`, because ARIA allows no `group` role on an `li` (axe's `aria-allowed-role`).
- **Or the source's own buckets.** A row carrying `heading` is grouped under it, and once any row carries one `curated` is not read. Each heading is keyed by its place (`heading-0`), not its text, which may hold a space and would split the `aria-labelledby` reference.
- **A pick closes the list**, unless `keepOpen` is set. Two rows that pick as the same text ("Wax (Animal)", "Wax (Substance)") are told apart after the pick by the caller's `qualifier`; a variant's `form` stores the string (DESIGN.md §5).
- **It opens as text is typed, on ArrowDown, and from its chevron**, and opens at once: a lookup still pending shows the loading row until its rows arrive ("The loading row"). The pending `Spinner` shows after `$loading-delay`, so a quick answer never flashes it.
- **Leaving the box shuts its list for good.** A list wanted but without rows is not open to Downshift, so without a blur dropping the wish, a late answer would open the list and Downshift would focus the box, pulling the focus from whatever was in use. An open list is Downshift's own to close.
- **Enter.** A highlighted row is picked. Otherwise, with `onCommit`, Enter is the caller's and never the form's submit. Without `onCommit`, Enter closes an open list, and on a closed box reaches the form as any text box's Enter does.
- **The control is the box.** A press on its padding, between the entries, or where a hidden clear keeps its room puts the caret in the text, as a plain input would. The control is `role="presentation"`; the box inside is what a reader and the keyboard reach.
- **The list is announced** by a visually hidden `<output>`, named like the list, reading "3 suggestions", "No suggestions" or "Looking for suggestions" while open or while the loading row shows. It is its own region, not Downshift's `getA11yStatusMessage`, which announces on the box's state and not on rows arriving after the debounce. A ListField's own `<output>` is named "Folk Names changes" so the two are told apart.
- **`aria-activedescendant`** is left off while no option is highlighted: Downshift writes `""`, which points at nothing and which a checker reads as a broken reference.

#### Row order

The rows are the typed row first, then the curated bucket, then the in-use bucket: flat for Downshift, which numbers them, and bucketed for the headings. A caller with an `action` has the action row where it says instead of the typed row first. A typed box narrows a grouped list by the row's own label or its group's name (`matchesLabelOrGroup`, `match.ts`), so typing a tradition lists its deities; one place means every grouped list narrows alike.

#### Typed box and Escape

Escape on a closed box is left to the dialog: Downshift would prevent the key whenever the box holds text, which stops a modal around it hearing its `cancel` event, so the box marks it `preventDownshiftDefault`. The one exception is the empty message, open content Downshift does not know of (it has no rows, so `isOpen` is false): Escape closes it alone and is prevented, and the next Escape reaches the dialog.

#### Typing always wants the list

Downshift's open callback fires only when the open state differs from the props it last committed, so a key landing just after a pick closed the list, before that render committed, read as no change and the list stayed shut. The input's own `onChange` therefore sets the wish to open itself.

## Where the list opens

`useListPosition` (`position.ts`) places the open list on Floating UI's `useFloating`.

- **As wide as its anchor**: `listAnchor`, else the control.
- **Never off the screen.** It flips above when there is more room there, sits 8px from the screen's edge, and is no taller than the room it has: `size` sets `--combobox-list-room` and the stylesheet caps the list at `min(20rem, that)`, which holds the eight seeded category groups without a scroll.
- **Followed only while open** (`autoUpdate`). Every box's closed list stays in the page, as Downshift asks, and is not followed. A pending lookup never closes an open list, which keeps its last rows or shows the loading row, so typing never subscribes again and never reads the page's layout inside the keystroke.
- **Fixed, not absolute**, so a scrolling ancestor such as a modal cannot clip it.
- **Shared.** An entry's summary uses it with `matchWidth: false`. MenuButton's menu uses it with `placement: 'bottom-end'`, `gap: 8` (not 4) and `matchWidth: false` ([`menu-button.md`](menu-button.md), "Where it opens").

### Bottom bar room

The phone's fixed bottom bar (`.section-nav`) sits over the foot of the window, which Floating UI cannot see. `flip`, `shift` and `size` therefore take a `bottom` padding of the edge plus the bar's measured height, read once per placement by a first middleware (`measureBar`) and shared by the three, so a field near the foot opens above. Without it `size` shrinks the list to the sliver left, which still "fits" below, so `flip` never fires. The height is measured, not restated from tokens, because only the browser knows the device's safe area; the bar is found by its class, not a prop threaded through every box.

### The popup

`combobox__popup` holds the listbox and, beneath it, the empty message; it is the one element placed, so the two move together. With `empty={false}` the listbox is placed itself. The `<ul>` keeps Downshift's `getMenuProps`, so its `id` and the input's `aria-controls` agree. Downshift counts only the input, the toggle and the listbox as inside, and closes on a press anywhere else. The `<ul>` scrolls, not the popup, because Downshift scrolls the highlighted row into view within the menu element and a scroller outside it is never moved.

## What a keystroke writes

Every write to the page re-checks its `:has()` style rules, so a key writes
only what it changes ([`ui.md`, "The suggestion field writes only what a keystroke changes"](../design-decisions/ui.md#the-suggestion-field-writes-only-what-a-keystroke-changes)):

- **`aria-busy`**, on the box and on the listbox, changes only when a lookup
  starts or settles, since React writes an attribute only when its value
  changes.
- **The list's `width` and `--combobox-list-room`** are set only when they
  differ from what the list already holds.
- **The input's `name` is rewritten by React on every key**, and on every
  render of the box, by React DOM's own input update code. The field cannot
  stop that while React renders the input, so it is left alone.

`tests/components/Combobox/keystroke.test.tsx` watches the box and the list
for these writes.

## The empty message

**A typed box never closes for having nothing to show; it says so.** The default is "No match for “text”" (`noMatch` in `popup.tsx`); a caller passes a more specific sentence ("Keep typing to search") or `false`. The multi-select box says "Every option is already chosen" when opened with nothing left; it takes no typed text, so has no "no match".

- It shows once the lookup has settled (`pending` false), the text is not blank, the person wants the list open, and there are no rows at all. The typed and action rows count as rows, so a caller wanting the message passes `offerTyped={false}`.
- It is drawn beneath the listbox, never in it, because it is not an option and a reader must not count it as one. The status reads it; with rows the status keeps its count and no message shows. Downshift still reads the list as closed (`aria-expanded` false).

## The loading row

**The list opens on the key that starts a lookup, not when the answer comes.**

- While a lookup is pending and no suggestion row is shown, the list holds one row: the `Spinner` and "Looking for suggestions" (the `noun`), beneath any typed or action row. It follows the loading standard ([`loading.md`](../loading.md)): the spinner appears after `$loading-delay`, and the listbox carries `aria-busy`.
- It is not an option. It is an `aria-hidden` `<li>` with no role, so the keys never highlight it and Enter never picks it, and a reader hears it once, from the status. Downshift reads the list as closed while it is the only row (`aria-expanded` false), as with the empty message. Escape closes it alone, and the next Escape is the dialog's.
- **While the next lookup is pending, the list keeps the last rows**, still pickable, with `aria-busy` on the listbox, until the answer replaces them. A pending answer with rows of its own shows those. A list that was closed keeps nothing, so the next lookup opens on the loading row, never on rows for older text.

## The action row

`action` is a last row that does something rather than picking a suggestion, in italics and Title Case (it is a command). Enter or a click calls `onSelect`, never `onPick`, and leaves the text as typed. It is no result, so the status does not count it. It stands in place of the typed row and is there whatever is typed, a blank box included, so ArrowDown or the chevron opens the list on this row alone before any suggestion arrives, and ArrowUp opens it on this row. `actionFirst` puts it nearest the box, for an action that stands for what was typed (the spell builder's `Add "<typed>" as a one-off ingredient`).

Users: "See All Results" ends the ingredient search's dropdown when there is another page; "New Reference…" ends the references box, whose entries can only be picked. The caller still passes a no-op `onCommit` there so Enter with nothing highlighted never reaches the form.

- **A second pick keeps the text.** Downshift remembers the last row picked, and with `selectedItem` held at `null` the next pick reads as that prop changing and writes the null item's text, `''`, into the box. The state reducer keeps the text on `ControlledPropUpdatedSelectedItem` as it does on a click or Enter.
- **A browser script must wait a frame between a click and a key.** Downshift reports a click's close through an effect, so a key pressed before React commits it is handled by the last render, which still has the list open: ArrowDown then moves the highlight rather than opening the list. Playwright's `locator.press` straight after a pick does this; a person never does. It is not a defect.

## The select-only box

`ComboboxSelect` (`select.tsx`) is a closed set on the same control and list, for a field nothing is typed into: every closed enum. It replaces the native `<select>` so a form's fields share one look ([`ingredients.md`, "A closed set wears the combobox"](../design-decisions/ingredients.md#a-closed-set-wears-the-combobox)). The DateField's month and year pickers are two of these ([`date-field.md`](date-field.md)).

- **It is Downshift's `useSelect`**, ARIA 1.2's select-only combobox: the control itself is the `role="combobox"` element, a `div` in the tab order, labelled through `aria-labelledby`. Without `labelId`, `label` is its `aria-label`.
- **A choice with value `''`** clears the set ("None"). `placeholder` shows while the value is none of the choices and is never in the list.
- **A choice's `group`** sets it under a heading: each run of consecutive choices with the same `group` is a `role="group"` named by its heading, on a `div` inside a presentational `li`, as the typed box's buckets are. A choice with none sits outside every group. The flat order is still Downshift's, so the arrows run straight through the headings (the keepers' help guide select, grouped by audience).
- **A disabled choice** is listed where it stands, stepped over by the arrows and refused a press, its `note` on a second line (the coven picker's coven that already holds the entry).
- **`disabled` on the box** is `aria-disabled="true"`, out of the tab order, deaf to the pointer and keys (Downshift leaves its handlers off). It is not the attribute, because Downshift would write `disabled` onto the `div`, where it means nothing.
- **Ctrl or Cmd keydown on the closed box** sets `preventDownshiftDefault`, so Ctrl+Z, the form's undo ([`field.md`](field.md#undo-and-redo)), is not read as a letter that opens the list.

### Escape on a picker's open list

`useSelect` closes the list but lets the key through, unlike `useCombobox`'s typed box, and inside a modal the `<dialog>` then takes it as a close request, shutting the modal or asking a changed form to discard. The box marks the key handled (`keepEscapeInList`, `escape.ts`), so the dialog's cancel does not fire while Downshift's own handler still closes the list. With the list shut, Escape reaches the modal as ever. The multi-select does the same.

## The type-ahead box

`ComboboxTypeahead` (`typeahead.tsx`) is a closed set chosen by typing, react-select's single select, for where a select-only box makes a person scroll for one among many (`GroupedValueForm` through `SelectField`'s `typeahead`, `GroupedValueList`'s group filter). It is imported from `@/components/Combobox/typeahead`, not the folder's index, because it imports the index and the lint refuses an import cycle. It matches what a person types against a label they read, so it folds in their locale, not with the ingredient form's `fold` (which folds as the database does).

- **Typing narrows the list** to the choices whose label holds the text, in any case. While the text is the chosen label itself nothing is narrowed: a box holding a choice opens on every choice.
- **`match`** replaces that narrowing: given the typed text, folded as above, it returns the choices to list, in its order. It is never asked while the text is blank or is the chosen label. The invitation refusals widget passes `fuzzyMatcher` (`src/lib/fuzzy-match.ts`), on Fuse.js: every typed word must match somewhere, in any order, partly or with a small typo, best match first; a one-letter word is dropped, and Fuse's search operators at a word's edges read as text.
- **Only a choice is ever the value.** Typing reports `''` while the text names no choice in full and the choice once it does, in any case ("mockish" chooses Mockish); left, the box reads the choice's own label. Text naming no choice stays in the box, so a required field shows its error on save (`SelectField`, [`field.md`](field.md)).
- **A choice's `qualifier`** (a member's role) shows after the label, "Fixture B (Member)"; the text a pick writes and the match are the label alone. Qualifier and `icon` show only while the box reads the chosen label as written, not while it is typed over in another case.
- **`clearable`** puts a clear before the chevron, offered while the box holds text or a choice, hidden otherwise with its room kept; it empties both and leaves the focus in the box. It is a filter's way back to every group.
- **`onSettle`** hears the value once the person is done with the box, never while they type: on a pick (the choice's value), the clear (`''`), and leaving (the choice the text names in full, or `''`). It is called whether or not the value changed. A list filter applies on it, comparing with the choice the page shows, so typing "mock" opens no list on the way to "Mockish" ([`filter-form.md`](filter-form.md)). `onChange` still hears every change.

## The multi-select box

`ComboboxMultiSelect` (`multi-select.tsx`) is the select-only box for a closed set holding several values in the order chosen (react-select's multi-select): each value a `ComboboxEntry` chip. Nothing is typed; the list offers only choices not yet made.

- **It is `useSelect` with `useMultipleSelection`**, the pairing Downshift documents. `useMultipleSelection` holds the chosen list and gives the box Backspace, which takes the last chip. Chip focus by arrows is held off (`activeIndex` at -1): each chip's × is already a button in the tab order.
- **A choice appends and the list stays open.** With nothing left, or only disabled rows left, the list does not open (the empty message says so).
- **The control is presentational and the box inside is the combobox**, because the chips' × and the clear are buttons, and inside the combobox a press or key on them would be the box's. The box takes the text's place after the chips and reads what it holds ("Air, Fire") in visually hidden text. A press on the control's padding or chevron opens the list.
- **The placeholder stays after the chips while a choice is left**, hidden from a screen reader there (read, it would sound like a choice); with nothing chosen and nothing left, `emptyPlaceholder` says so.
- **Each change is announced** in a visually hidden `<output>` (WCAG 4.1.3).
- **A chip's key is its position joined to its value**: a repeat can be loaded (the form refuses it only on save), and two chips must not share a key.
- **Counts and disabled rows (a filter).** A row reads "Fire 9": the count follows the label in its own span, after a space that is a text node, because an accessible name drops a space a span begins with. `hideZeros` leaves out zero-count rows. A value already chosen is a chip, never a row, so a chosen zero-count value stays removable. A disabled row is listed after every choosable row so the keys meet those first, keeps its text's ink rather than being dimmed, and says why beside its count.

## An entry

`ComboboxEntry`, a named export, is the chip a list passes in `entries`, inside a `ul.combobox__entries`.

- **Its × is a real button**, named "Remove Hedge Fixture" (not a bare "Remove"), described by the list's error when `errorId` names this entry, which also draws the error edge on the chip.
- **A long text is cut off, never wrapped**, so every chip is one line and nothing scrolls the page sideways at 320px. The whole text stays reachable: the × is named by it, and a `role="tooltip"` shows it while the entry is hovered or its × has focus.
- **The tooltip is InfoTip's bubble and fade** (`tip-bubble`, `useTip`, [`info-tip.md`](info-tip.md)). It stays in the page while closed, `aria-hidden`; opens only on an entry that is cut off, measured as it opens; closes on Escape (WCAG 1.4.13); waits 150ms before closing so the pointer can cross onto it. It runs from the chip's left edge up to InfoTip's measure (18rem, or the screen less its gutters), past the chip and the control: only being cut off is wrong.
- **`detail`** (a linked substitute's "Dried leaf · Compendium entry") sits beneath the text in the tooltip, in the bubble's own colour (a muted one is not checked against the bubble's ground). An entry with a detail or a qualifier always has something to show, so its tooltip opens whether the text is cut off or not. The detail describes the ×, after the list's error, so a reader hears it although the tooltip is `aria-hidden` while closed.
- **`qualifier`** reads after the text on the tooltip's first line in brackets, and as the ×'s description before the detail.
- **`colors`** sets the group's pair inline through `chipColors()`: its text and × in the label ink that holds 4.5:1 (`styling.md`, "Chips, badges and the solid-fill rule"). It keeps the plain chip's shape and 24px ×, so a row mixes the two without a jump.
- **`note`** is read in brackets after the text, visually hidden: "name only" on a typed substitute, which lacks the link mark a linked one has.
- **`count`** follows the text outside the cut-off span (a long name loses its tail, never its count), its space a text node so the chip reads "Water 7". **`loading`** swaps the count for a shimmering placeholder (kept under reduced motion), `aria-hidden`, and wins over `count`. **`removeNoun`** names the × "Remove {Noun}: {Value}", the same whether or not the count has arrived. **`outlined`** draws an outline (`outlined-chip`, `_mixins.scss`) instead of a wash; a coloured chip stays washed.
- **The order a reader hears** on the ×: the list's error, the qualifier, then the detail. The handle (sortable) reads them before how it moves.

### An action on an entry

`action` (`EntryAction`, `types.ts`) is one button ahead of the ×, named by `label`, described as the × is, its `tip` shown by [IconTip](icon-tip.md). Its click removes nothing and does not touch a sortable entry's handle. A list gives one per row or none; the Combobox knows nothing of what it does.

## A linked entry's summary

`summary`, `{ label, content }`, is what a linked entry opens: `IngredientForm` gives one to each substitute that links an ingredient ([`ingredient-form.md`](ingredient-form.md), "A linked substitute's summary"). A press opens a non-modal `<dialog open>` after the button in the chip, so Tab runs from the text into the panel and on to the ×. It opens by attribute, not `show()`, so the browser gives it no Escape of its own. `content()` is called only while open, so it may ask the server then. The behaviour is `useEntrySummary` (`summary.ts`), placed by `useListPosition` with `matchWidth: false`.

- **It shuts four ways**: a second press of the button; Escape, which hands the focus back to the button; a press anywhere else, on the capture phase; and the focus leaving both the button and the panel. A blur to nowhere, or a press on the panel's own text, keeps it.
- **Escape is cancelled** (`preventDefault`): a modal `<dialog>` turns an Escape nobody cancelled into its own `cancel` event, and the form's modal asks to close with unsaved changes. Cancelled, the key shuts the panel alone and the next reaches the modal.
- **A sortable entry takes none**: its text is already its handle.

## A sortable list

`ComboboxSortableEntries({ entries, onMove })` is what a list whose order means something passes in place of its own `ul.combobox__entries`. Each entry is a chip's props with an `id`, its identity as it moves (a react-hook-form list takes it from its field array's `id`); `onMove(from, to)` gives indexes into `entries` and the caller reorders. It is on dnd-kit's sortable preset, a standard package rather than a bespoke one.

**It loads apart.** `ComboboxSortableEntries` is in `sortable.tsx`, not the barrel, so `@dnd-kit/*` stays out of a page's first scripts. `IngredientForm` draws `LazySortableEntries` (`lazy-sortable.tsx`), a plain list of the same chips until the module arrives, and Edit and Annotate start the load early ([`coven-cards.md`](coven-cards.md)). The chip's drag transform is written out in `entry.tsx` so it does not import `@dnd-kit/utilities`.

- **Each chip's handle is its grip and its text, one button**, named for its entry ("Move Mars"), described by the list's error and the entry's detail, then by how it moves. Its focus opens the chip's tooltip. A list that is not sortable draws its text bare.
- **By pointer**, a mouse or pen drag starts after 4px of movement, so a press focuses the handle and opens its tooltip rather than dragging. A finger drags after resting `TOUCH_DRAG_DELAY_MS` (250ms, moving no more than 5px) on `TouchSensor`; the pointer sensor skips touch so the two never race. The constant in [`src/lib/sortable`](../../src/lib/sortable/index.ts) sets it for every sortable list. `touch-action: none` on the handle lets a touch drag move the chip, not the page.
- **By keyboard**, Up and Down jump a row to the place whose centre is nearest, and stay put from the first or last row; Left and Right step one place whichever row; past either end the chip stays. The focus stays on the moved chip's handle.
- **Each step is said** in dnd-kit's live region, worded by the entry's text and place, not dnd-kit's default id. dnd-kit reports a lifted chip over its own place at once, which would talk over the lift, so that report is left unsaid. The region and instructions take ids from `useId`, since dnd-kit's counter would number a server render and the browser's apart.
- **Shared with the spell builder's steps**: the sensors, keyboard target with its collision detection, handle instructions and wording live in `src/lib/sortable`. Each list keeps its own layout, sorting strategy and arrow keys: chips flow in a wrapping row, steps stand in a column ([spell-builder.md](spell-builder.md), "Reordering").

### Sortable layout

dnd-kit's `rectSortingStrategy` moves each chip onto the box of the chip whose place it takes, which suits equal cells; chips of different widths overlap or leave gaps. So [`flow.ts`](../../src/components/Combobox/flow.ts) lays the chips out as the wrapping row does, in the order the move would give. The row's shape (width, gaps) is measured as a move starts (`shapeOf`), from the stylesheet or, where there is none (happy-dom), from where the chips sit. Chips making way are translated, never scaled, so what shows while held is what the drop leaves.

The keyboard's next place comes from `flow.ts` (`placeFor`), not dnd-kit's `sortableKeyboardCoordinates`, which takes the nearest chip in the arrow's direction: across wrapped rows of different widths that is not the next one (Left from a row's second chip landed on the row above). The list's coordinate getter records the target, which the list's collision detection returns for a keyboard move in place of the nearest box; a pointer move still takes the nearest.

## A qualifier

`qualifier`, `{ text, detail? }`, is what a pick leaves out of the box's text: the Form box passes a picked form's group ("Substance" for "Wax") and its description as the detail. The box only draws it; whether a pick holds, and when an edit drops it, is the caller's.

- **It follows the text, in brackets and muted**, "Wax (Substance)". The text's slot is always in the page, so a pick never remounts the box and takes its focus. The qualifier never shrinks; a long text gives way.
- **It is the box's description.** `aria-describedby` lists the caller's description first (hint and error), then the qualifier's text and its detail, so a reader hears "(Substance)" without the tooltip; the detail is read although its tooltip is `aria-hidden` while closed.
- **The detail is a tooltip** (the entry tooltip's bubble and fade), above the control (the list opens beneath) with its left edge on the qualifier's. Where the qualifier starts is measured as the tip opens, since CSS cannot place a box by one element and bound it by another. On a phone (`$shell-phone-width`) it is shifted back inside the window and wraps.
- **It opens while the qualifier is hovered and while the box has focus** (the qualifier is no tab stop). Escape closes it (WCAG 1.4.13), as do a blur and the pointer leaving, after 150ms. State is `useTip` ([`info-tip.md`](info-tip.md)).
- **It gets out of the way of typing.** The first printable key (one character, no Ctrl, Alt or Meta; a shortcut is not typing) and the list opening, by typing, an arrow key or the chevron, both close it. Focus returning or a hover reopens it. The detail stays in the description meanwhile.

## The debounce

`src/lib/debounce.ts` holds the one debounce a typed lookup waits on: `useDebouncedValue(value, delayMs = DEBOUNCE_MS)` returns the value once it has stopped changing for 300ms, starting as the first value given so a lookup waits on typing and never on mounting. Every typed lookup uses it, so none has a second.

## Props in detail

- **`ComboboxOption.meta`** is a node so a caller can colour its words (the spell picker's categories, in their groups' chips); only its text counts toward the option's name. **`badge`** is information only (the spell picker's In Jar), so a caller gives words a reader can use.
- **`ComboboxChoice.group`** is a deity's tradition, drawn by the facet box's typing form only and an `optgroup` in the native select.

## Styling

Tokens, mixins and the form primitives only; the lengths left raw are the control's own geometry and say so in a comment (`index.scss`). Every × and indicator is a 24px target (`$icon-size`, WCAG 2.2's minimum).

### Control

The rule is `.input.combobox__control`, compounded: the app emits the primitive as `body .input`, which a lone class loses to, so every box stood 8px over `$control-height`. The workshop scopes primitives in `:where()`, which weighs nothing, so it never showed; a height check in `tests/e2e/admin-compendium.spec.ts` holds the app to it. The select-only box is weighted with `.input` likewise, or that rule's caret wins over the whole box. The chip list's `space(1)` above and below sits on the list rather than the control, so a box with chips stays at the control's height.

### Chips' room

Beside entries the text keeps room as wide as the placeholder (`--combobox-room` from `room.ts`, in `ch`, never past the row), so the prompt shows whole or wraps under the chips instead of being cut to a few letters. `ch` is a digit's width, a little wider than the average letter, so the room errs wide.

### Text slot

The text input is one character wide of its own so the slot, not the browser's default of twenty, decides. With a qualifier the cell is sized by a hidden copy of the value in the box's own font and padding.

### Qualifier detail

Above the control, never beneath the box, where the list opens.

### List

`aria-expanded` sits on the input, button or control beside the indicator, never above it, so a selector on it cannot reach the chevron; the root carries `is-open` while open, and the flip waits on it.

### The popup's styling

The listbox is the scroller and reads `--combobox-list-room`, which the placement sets on the popup.

### Rows at the edges

In a grouped list the top is a heading, so only the last group's last row takes the panel's inner corners.

### Entry chip

Neutral because a free-text entry has no group to take a colour from. A group-coloured chip has no border, so its edge is an inset ring.

### Dragged chip

The edge stands in for an error's while held and the error's returns on the drop. The chips making way slide on dnd-kit's inline transition, which only an important rule outweighs, so under reduced motion they step.

### Linked entry

The accent clears only the 3:1 a mark needs on the chip's wash, so the text keeps the body ink (`tests/scss/tokens.test.ts`).

### Other

The loading placeholder is filled with the chip's own ink at low strength so it shows on any chip.

## Tests

Tests are in `tests/components/Combobox/` (`dom` project), the sortable driver in `tests/support/sortable.ts`. happy-dom lays nothing out, so tests give the viewport, box, anchor, list and chips the sizes Floating UI and dnd-kit read; `moveByKeyboard` waits a task after each key (the keyboard sensor listens a task after the lift) and `dragByPointer` waits out the 50ms in which the sensor swallows every click. Presentation (colours, caret on a press, qualifier place, list width and position, the chips' layout while held) is owned by the workshop story and the Playwright scan, `tests/e2e/workshop/combobox.spec.ts`.

## Used by

`IngredientForm`, `CategoryPicker`, `FacetCombobox` ([`facet-combobox.md`](facet-combobox.md)), `GroupedValueForm` and `GroupedValueList`, the ingredient search, the spell builder, `WorkspaceSwitcher`, `DateField`, and `MenuButton` (placement only).

## Not here

The text a pick writes, and whether a qualifier holds (the caller). Icon sets. Forms: the box knows nothing of them.
