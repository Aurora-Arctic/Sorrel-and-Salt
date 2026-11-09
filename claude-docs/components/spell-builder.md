# SpellBuilder

`src/components/SpellBuilder/` is the client form that writes a spell: its seven text fields, the categories it is assigned, and its jar of ingredients (the steps). It is drawn in a modal over the grimoire's list (`SpellDialog`, [`grimoire.md`, "The spell builder is a modal"](../design-decisions/grimoire.md#the-spell-builder-is-a-modal)). There is no page of its own and no `instructions` field: the ritual is the spell's steps. `deletedHrefOf` and `copiedHrefOf` take effect only once the spell exists. `index.stories.tsx` answers each state's requests through `useMockHandlers`.

## The spell dialog and its address

- `?new=spell-<slug>` draws the builder empty, from New Spell (shown only to a steward or practitioner); `?new=spell` is the same for the grimoire the page is on. `?new=spell-<slug>` on any other page is sent to that coven's grimoire with a replace (`NewSpellElsewhere`, in AppShell).
- `?edit=<id>` draws a saved spell, from a spell card's pencil, the recipe page's Edit (opens over the recipe page and closes back to it) and Quick Look's Edit. Only a role that may update a spell is offered either control. An observer's `?edit` opens nothing, and on the recipe page it opens only when it names that page's own spell.
- New Spell writes the address in the browser with no server request, and the dialog draws the empty builder at full size with no skeleton: a skeleton the server's form replaced grew the centred dialog and moved it under the pointer ([`modal.md`](modal.md), "A form the browser can draw skips the skeleton"). Any other `?new` is Add Ingredient's, and holds a saved spell's dialog back until it closes.
- A new spell's head names the coven it lands in (`ModalHeading.destination`, [`modal.md`](modal.md)). The dialog is a client part because the builder's handlers are functions, which a server page cannot hand down.
- **The first save moves the address.** A create replaces `?new=spell-<slug>` with `?edit=<id>` using `router.replace`, so Back goes to the grimoire and a reload opens the saved draft. The builder reports it through `onCreated`, whichever save made it; the same builder stays mounted, so nothing typed is lost. A create made by Close skips the move and closes.
- **A saved spell's steps are read after it opens.** The server read for `?edit=<id>` (`readEditedSpell`) gives the fields alone; the dialog reads the steps through `/api/graphql` (`SpellBuilderSteps`, `steps/documents.ts`), afresh each time. Until they land the builder holds them as `stepsRead`: the jar shows its loading state, Save is off and nothing is sent, because an update's steps are the whole recipe and one sent now would delete the steps not yet shown. A Close pressed meanwhile saves once they land, then closes. Fields typed meanwhile are kept. If the read fails the jar says so, nothing can be saved, Close closes without saving, and a reload tries again. A draft the dialog created needs no read: its save's answer holds its steps.

## Delete

On a saved spell, `SpellDialog` given `canDelete` passes the builder a `deletedHrefOf(title)` (`SpellRecipe/deleted-href.ts`, shared with the card and Quick Look), and the builder draws Delete Spell as the bin icon at the far end of the footer's button row, after Save Status, as a child of `FormActions` in a `.form__aside` wrapper (`.spell-builder__delete`) that pushes it to the end and centres it on the buttons' line. It asks with a `ConfirmQuestion` using the recipe page's words (`DeleteSpellWords`), since a second `Modal` cannot stack over this one.

Confirmed, `useDeleteSpell` sends `deleteSpell` and replaces the address with the list plus `?deleted=<name>` (from `deletedFromHref` when given, else `closeHref`). A refusal shows in the `Notice`. The hook's `pending` is `removed`, which turns off the autosave (timers, focus-out and page-hide flushes) and the save on close so nothing writes to the deleted spell; a refusal lifts it.

## Saving

**It autosaves** through the shared engine ([`autosave.md`](../autosave.md)): 3 s after the last change, 30 s at most while typing, with `SaveStatus` beside Save. Every way of saving (autosave, Save, Close, Mark Complete, Share) goes through one function, `persist` in `index.tsx`, which checks the form, calls `saveSpell` (`autosave.ts`) and rebases the form on the answer. A refusal skips the engine's retries, so the status stops at "Could not save" with Retry. The autosave is held back while a step's unit is refused or a saved spell's steps are still being read.

- **Save Spell** is `FormActions` ([`field.md`](field.md)) with `noun="Spell"`. It is disabled until a field reads differently from the last save (blank and spaces alike read as none, as `SpellInput` reads them). There is no Cancel: the modal's Close leaves, saving first. A changed category pick or visibility turns Save on like a changed field.
- **No field is required.** A draft saves with any one field. Only marking a spell complete needs a title (the `spells_complete_has_title` CHECK), so no label is marked required.
- **Created once, then updated.** With no `spell`, the first save calls `createSpell`; every later save calls `updateSpell` with `expectedRevision` set to the revision the last save answered. The builder never sends a null revision (the unconditional write): after a conflict it names the revision the refusal reported. The answer is applied with `reset(..., { keepValues: true })`, so what was typed in flight reads as the next change.
- **What it sends.** The seven fields, trimmed, null for a blank one (so an emptied field is cleared), `visibility`, and every step. The steps are the whole recipe: on an update the service keeps the steps sent by id, adds the new ones and removes the rest, so a step the builder does not send is deleted, and a saved instruction step is read in and sent back unchanged. `categoryIds` go only when the picks differ from the last save, as a set in any order; left out, the service keeps the set, and an empty list clears it ([`../db/grimoire.md`](../db/grimoire.md), "Saving its categories").
- **The autosave never sends a blank instruction.** A new blank instruction step (no saved id) is left out of what the autosave sends and of what makes the form unsaved, so the rest saves and the blank row stays with no error until it is written, removed, or Save or Close checks the whole form. A saved instruction whose text has been cleared is not left out, since that would delete it: the autosave is held back for it, as for a refused unit, and Save or Close shows the error beside it.
- **Mark Complete** flushes first. A missing title refuses inline on the title field.
- **The browser copy.** Every change is mirrored to localStorage under `autosave:spell:<id|new>:<userId>` until the server confirms. If a copy newer than the spell's `updatedAt` exists when the builder opens, `RecoveryNotice` ([`SaveStatus`](../autosave.md#save-status)) offers Keep (load the copy into the form, unsaved) and Discard. In the dialog it sits in the modal's header note ([`modal.md`](modal.md), "A control in the header") with the conflict notice, so it is in view however far the form has scrolled. An older copy is removed without a word.
- **A saved step's selection is written out three times, not shared as a fragment.** The steps read and both save mutations each list a step's fields in full. Through a fragment spread, the jar's `stock { variant { id } }` and the form's `formChoice { group { icon } }` are 8 levels deep, past the API's limit of 7 (DESIGN.md §7; [`graphql/protections.md`](../graphql/protections.md)), and every save is refused: graphql-armor counts a spread as a level. Written out they are 6. Each answer is typed `SpellBuilderStep` (`types.ts`), so a copy missing a field fails the type check, and `tests/guards/document-depth.test.ts` holds every document to the limit.

### The builder's sections and autosave

See "Sections", "Saving" and "Closing". Moon Phase and Day suggest a fixed list (`constants.ts`) and still take what is typed.

### The save module and its conflicts

`readLatestSpell` reads the spell as the server has it now (`SpellBuilderReload`). Both targets (`{ kind: 'new' }`, `{ kind: 'spell', id, revision }`) are the spell's one row, draft or complete. Because the builder never sends a null revision, a third save between a refusal and Keep My Version is met as a conflict too. "Two people, one spell" sets out Reload Latest and Keep My Version.

## Two people, one spell

Each save names the revision it was read at. The second of two saves against the same revision is refused with `StaleWrite`, which reaches the builder as a `STALE_WRITE` answer carrying the spell's revision now ([`autosave.md`](../autosave.md), "The server's half"). Nothing of the refused save lands. A draft and a complete spell meet it alike. The builder:

- **Pauses the autosave** and shows "This spell was changed elsewhere." with Reload Latest and Keep My Version (`SaveStatus`'s `conflict` state). It sits in the modal's header note through `conflictInto`, not beside Save, where it went unnoticed under a long form. Typing goes on, but nothing is sent until a button is pressed.
- **Reload Latest** puts the spell as the server has it now (fields, categories and the whole recipe) in the form in place of what was typed, discarding that and the browser copy. The form starts clean, and the engine carries the revision the refusal reported. A save someone else made between the refusal and the read is met as the next conflict. If the read fails, the conflict and the typing stay and the form says so above the fields.
- **Keep My Version** sends the form again naming the reported revision as `expectedRevision`, so it writes over the other person's save. Their open builder meets the conflict on its next save. The version written over is kept nowhere.

There is no merge, diff or history. A conflict is settled by a button, never a page reload: the engine's `resolveConflict` moves the status on.

## Visibility

`SpellVisibilityField` (`visibility-field.tsx`) stands on its own line above the footer's button row, so it is in reach with every section shut. It wraps `VisibilitySwitch` (shared with the Record a Working dialog, [`field.md`](field.md)) in its `brief` form, labelled **Shared** (one left-aligned column: the label, the switch under it, the note and its tip under the switch) (`VISIBILITY_LABELS.workspace` in `GrimoireList/params.ts`, the one constant the tests read). On is the coven (`workspace`), off is private.

The rule is DESIGN.md §5's: a complete spell's visibility only widens, and a draft's moves either way ([`grimoire.md`, "A draft's visibility moves either way; a complete spell's only widens"](../design-decisions/grimoire.md#a-drafts-visibility-moves-either-way-a-complete-spells-only-widens)).

- **A new spell** opens private: the autosave saves it 3 s after the first keystroke and a shared spell never goes back. The database default stays `workspace`, since every write sends the value. A visibility other than the last save's makes the form dirty, so Save enables, Close saves it, and the browser asks before the tab closes.
- **A saved draft** keeps the switch open both ways with no question. **A shared draft** can be switched off as a pending change; the lock binds only once the stored status is complete.
- **A saved complete private spell** keeps the switch open. Turning it on asks first (`ConfirmQuestion`, Share or Keep It Private), because it cannot be made private again. Share saves the whole form with `visibility: workspace` at once. A refusal lands in the `Notice` and the spell stays private.
- **A complete shared spell** shows the switch on and disabled, with an InfoTip saying Duplicate makes a private copy.

Which state shows is read from the form's starting values (the last save's status and visibility) and whether the spell has been created. Every save carries the visibility the form holds, so a save from a stale page, after the spell was shared elsewhere, says `private` and, if the spell is complete, is refused by the service (`assertWidens`). The refusal's words explain the rule and name Delete, and show in the `Notice`, never a bare "Forbidden".

## Draft and complete

### Status and visibility controls

`SpellStatusField` (`status-field.tsx`) is in the form's action row beside Save Spell, outside every section. A new spell is a draft.

- A draft shows Mark Complete. A click saves the whole form with status `complete` at once, so the status is never a pick left pending. It flushes the autosave first, so one save carries the status and every unsaved change.
- A complete spell shows no Mark Complete, and there is no Reopen: its workings are recorded against it and its visibility lock has started, so reopening would undo both. The service refuses complete to draft as well, and `updateSpell` refuses a complete spell with an explaining error.
- **Duplicate** takes Mark Complete's place for a member who may create a spell. It flushes the autosave, calls `duplicateSpell` and opens the private draft copy (`?edit=<id>`) in the builder. A change to a complete spell goes through that copy.
- **A shared draft** asks first, because completing it keeps it shared for good. Shared means the visibility the form holds, saved or not. Keep It a Draft sends nothing. A private draft completes with no question. If the title is blank, the question closes before the title takes the focus.
- **A blank title** is refused before anything is sent: the form holds the asked-for status while it validates, so the schema shows `COMPLETE_NEEDS_TITLE` (`validation/spell.ts`) on the title field and focus goes there.

## Two error surfaces

The shared schema runs as the form's resolver, so a field it refuses shows its error beneath that field before the save. A `VALIDATION` answer's `fieldErrors` for one of the seven fields, for a pick at `['categoryIds', index]`, or for a step's quantity or unit (`steps.<i>.quantity`, `steps.<i>.unit`) show beneath that field after, through the same element. Anything else, such as an observer's `FORBIDDEN`, goes to the `Notice` above the fields in the server's words. `placeServerIssues` does the placing and `openErred` opens a section holding a refused field. Stock check refusals are shown by the stock check itself, not by the status control.

## Closing

### Closing the modal

Close, Escape and a click outside flush the autosave, then close, and ask nothing (`useSaveOnClose`). This is the builder's exception to the Discard Changes question: a spell's draft is kept, never thrown away. The close waits for the save. A refused save keeps the dialog open with the refusal in the `Notice`. With nothing unsaved, Close closes at once. Closing the tab or reloading still asks the browser's own question, which no page can answer by saving; `useAutosave` saves as the tab hides.

Undo and Redo are the shared `FormHistoryButtons`. Undo writes the `steps` array back whole with `setValue`, which gives every row a new field-array id, so the list keys its rows, drag ids and open row by each step's `rowKey` (carried in the step, stable across an Undo). Every path that writes stored steps back goes through `restoredSteps` (`steps/values.ts`): Undo and Redo and a recovered draft. It sets a saved id the server's current steps do not hold to none, so the next save adds the step as new and is never refused for a dead id, and it gives a step with no `rowKey` one. A save's answer setting a new step's `stepId` is bookkeeping, not a history step.

## Sections

The fields sit in four `CollapsibleSection`s at `h3` ([`collapsible-section.md`](collapsible-section.md)): Purpose (Title, Intent, Categories), Jar (the jar details, What Goes In, Category Match), When to Work It (Moon Phase, Day) and Notes.

A new spell opens with every section open, a saved spell with every section shut. A shut section's line reads categories by name once `useCategoryIndex` has them, so it never shows an id; steps read as a count of ingredients, instructions not counted. A save refused on a field opens that field's section. What is typed in a shut section is kept.

## The fields

Each field has a one- or two-word placeholder and no info tip ([`info-tip.md`](info-tip.md), "When a field gets a tip"). Every value is stored as typed: the columns are free text ([`../db/grimoire.md`](../db/grimoire.md)). Suggest-only fields (Moon Phase, Day, Seal Wax, step Form) stay free text, tidy on blur, and carry a hint that other values are allowed. A step Quantity is text with a decimal keypad, tidied on blur and refused with "Enter an amount as a number, like 2.5". The error summary lists only controls on the page, so a refused amount inside a collapsed step row shows as "Has an error to fix" on its section until the row is opened.

- **Moon Phase and Day** are the recipe's timing, when to work the spell, not a record of when it was worked (a working's own day and phase follow from its `workedOn`). Both are comboboxes ([`combobox.md`](combobox.md)), `SpellSuggestField`, suggesting a fixed list from `constants.ts` narrowed to what is typed. A pick fills the box with the name and anything else typed is kept, so a value saved before the lists existed ("Full") opens unchanged. The phases are the eight of Wikipedia's "Lunar phase", then Dark Moon (the span around the new moon when no crescent shows), Waxing Moon and Waning Moon. The days start at Monday, with no planet beside them. They are constants rather than vocabulary tables: each set is closed and adding a name is a one-line change, unlike the celestial bodies, which keep growing.
- **Moon phase drawings** (`MoonPhaseIcon`, `src/components/MoonPhaseIcon/`) follow the northern hemisphere (waxing lit on the right), and the maria are placed by an orthographic projection whose table, sources and formula are in `icons.tsx`. A phase typed outside the list shows its words with no drawing.
- **Categories** (`categories-field.tsx`, after Intent) are what the spell is meant to do: the categories its author assigns, never the ones its ingredients bring (DESIGN.md, "Two kinds of spell category"). It is the ingredient form's `CategoryPicker` ([`category-picker.md`](category-picker.md)) on the same `PickerCategories` query. A pick the service refuses (a category deleted since the builder loaded) is marked invalid and the message names it.

## The suggest field

`SpellSuggestField` suggests from a fixed list. The ingredient form's SuggestField is bound to that form's values and asks a server lookup, so this is the builder's own.

## Steps

The Jar section is one column at every width (the default dialog is 32rem of content): the jar details, "What Goes In" (`steps/`), then Category Match. The add row (the picker and Add Instruction) sits below the list because a new step lands at the end: a pick is followed by a short move to the new step, and Shift+Tab from the picker reaches the new step's last field.

- **Add to Jar** (`steps/picker.tsx`) is one combobox over `ingredientSuggestions`: the coven's own ingredients and the compendium's, one row per form, since a step lays a form and not a whole ingredient. A retired ingredient is not offered. A form already in the jar is listed and can be picked again, for another step. A pick appends the step and clears the search, and focus stays in the search: the append passes `shouldFocus: false`, because react-hook-form would otherwise move focus to the new step's Quantity a render later and close the list.
- **A one-off ingredient** is the combobox's first row (its `action`). It makes no ingredients row: the step saves its `name` with no ids, is marked One-Off, and its Form is typed in the open row. A name already in the jar as a one-off, trimmed and ignoring case, is refused beneath the box.
- **What a step saves** (`stepInputOf`). A picked step sends its `ingredientId` and `variantId`, never the cupboard entry or jar it was found through. A one-off sends its `name` and `form`. A saved step sends its `id`. Quantity goes as a number, and a blank quantity or unit is left out.
- **Each row** is [`StepRow`](step-row.md), an open or closed card. Name and Form are editable on one-offs only; a linked name is read-only. One row is open at a time: a new step opens, opening another closes the first, and a step whose unit breaks the rule is forced open so its error is seen. An open row also closes when a click, tap or focus lands outside it; a new step stays open while focus is in Add to Jar. What was typed in a closed row is kept.
- **One name per row.** The handle, pencil and Remove name a step as the drag messages do: an ingredient with its form, an instruction by its opening words, and "New Instruction" while blank (`stepNameOf`).
- **Add Instruction** appends an instruction-only step, opens it and focuses its Instruction field. A step with an ingredient needs no instruction: a cleared one is left out of the save. An instruction-only step with a blank one is refused at its field (`stepInputOf` keeps the blank body on that kind so the schema says it). `body` is the one text on a step; there is no step `note` ([`grimoire.md`, "The step note is retired (PR #1308)"](../design-decisions/grimoire.md#the-step-note-is-retired-pr-1308)).
- **After a Remove** focus goes to the handle of the row now in that place (the one before it for the last), and to Add Instruction when the list is empty.
- **The starting unit.** A form the coven keeps a jar of is added with that jar's unit already in Unit (`newStep` reads `jarUnit`, which the picker's lookup returns in `stock`). A form with no jar, or a jar with no unit, starts blank. It is set once, as the step is added, so it never replaces a unit the member chose.
- **The unit rule** (`unitIssues`) is the service's, from `src/modules/grimoire/validation/step-unit.ts`: when the coven holds a jar of that form, the step's unit must be one the jar can be measured in (the same unit, or weight with weight, volume with volume; a count matches only itself). It is checked as the unit is chosen, the error shows on the step's Unit, and Save Spell stays disabled while any step breaks it. A step with no unit, a form with no jar, and a saved step whose unit is unchanged all pass, as on the server.
- **Safety.** A step carries the ingredient's and the form's `toxic` and `safetyNotes` and draws `SafetyMark` and `SafetyNote` (heading level 5): Toxic, else Caution, else nothing. Only the form laid is shown. Adding a step announces the warning in the live region. The warning never blocks the add or the save. A one-off or an instruction has no safety value (null) and draws nothing; it is not called safe either.
- **The Quick Look eye** stands in each ingredient step, in one tight group with Edit and Remove (three fixed slots, so badges line up), and on no one-off or instruction step. `StepQuickLook` opens `DuplicateQuickLook` over the builder so nothing typed is lost to a navigation. It needs the coven's id and URL segment, so a builder given no `covenSlug` draws no eye.

### Add to Jar: categories on the rows and the filter

- **Folded categories.** A row draws its categories with `CategoryChips` (compact, [`category-chips.md`](category-chips.md)) with `limit` `ROW_CATEGORY_CAP` (1), the rest behind the `CategoryMore` "+N" panel. The cap is a fixed count because measuring needs the row's laid-out width. The panel is `position: fixed` so the list's scrolling does not clip it. The chips swallow the option's click and press, so they never pick the row or close the list.
- **In Jar.** A row whose form is already a step shows a muted "In Jar" badge and the option's name gains visually hidden "already in the jar". It is information only: the row stays pickable.
- **Order.** Three runs: the assigned categories Category Match counts Missing, then the other assigned ones (Carried), then the rest in the server's order.
- **Filter.** When the spell has categories, a tray of toggle chips (`aria-pressed`) sits inside the box's border; one frame (`.spell-steps__frame`) wraps the search input and the tray and draws the field's one focus ring (the Combobox box inside has none). A pressed chip shows a check where the dot was, in the same slot, so the state is not carried by colour alone. None pressed is no filter; one or more keeps ingredients carrying any. A pressed category the spell no longer has drops out. While any are pressed the list's heading names them. The filter goes as `categoryIds` on `ingredientSuggestions`, not applied after fetching, because that query is paged at ten rows and a client-side filter would miss matches beyond the page.

## The jar details

`JarDetails` (`jar-details.tsx`) is the block at the top of the Jar section: the jar drawing spanning the whole Seal Wax field, then Seal Wax, then the Jar Description. DOM order is the jar, Seal Wax, Jar Description. The drawing is `JarDrawing` and `pickJarShape` from the jar shelf ([`jar-shelf.md`](jar-shelf.md)), tinted by the seal wax.

**The jar fills as ingredients are added.** `JarDrawing` takes `bands`: one per ingredient step (one-offs count, instructions do not), each the one group colour of the step's first category (the ingredient's, then the form's, in listed order), skipping any whose group is not loaded: one colour for each layer, never stripes. The group colours are on the group row, so they reach the drawing as the custom properties `--band-dark` and `--band-light`, never as tokens, mixed 55% in the light theme and 65% in the dark with `color-mix`, picked by `light-dark()`. A step with no categories, or none whose group is loaded, takes the jar's ink (`$text-primary`) in two alternating tints, 8% and 18% opacity.

- Colours come from `useCategoryIndex()`, so the jar adds no request.
- Bands are the same height, stacked from the base and clipped to the vessel's body. Eight fill the jar (`BANDS_FULL`, `JarShelf`); past eight they shrink to fit. No line is drawn between layers: each boundary is one smooth wave shared as the upper band's bottom and the lower band's top, so bands tile with no gap (the wave shape is in `JarShelf/index.tsx`).
- A band moves by a `transform` transition, none under reduced motion. The drawing stays `aria-hidden`, and an empty jar draws no band.

**The builder shows no stock.** It draws no In the Cupboard panel and no step row carries a verdict: whether the coven holds enough shows on the spell's page, its Quick Look and in workings. `inventory.tsx`, `verdict-mark.tsx` and `steps/supply.ts` stay in `SpellBuilder/` because the recipe page and its Quick Look render them ([`spell-recipe.md`](spell-recipe.md)); nothing in the builder does.

## The comparison panel

`comparison-panel.tsx` sets what the spell intends beside what its jar carries, so a mismatch shows while the spell is built. It reads the form's values as they stand, saved or not (a category whose colours have not landed is left out until they do), and runs `compareSpellCategories` over `summarizeSpellCategories` in the browser on the steps' categories; a one-off or an instruction brings none. It also lists Derived Categories, the union of the steps' categories, once each, sorted by name.

- **Carried** is each assigned category the jar carries. **Missing** is each assigned category nothing in the jar carries, drawn hollow (`CategoryChips`' `absent`). **Extra** is each category the jar carries that was not assigned.
- Every chip has a tip (`tipOf`) naming the ingredients carrying it (Carried, Extra) or saying nothing in the jar carries it (Missing); it is the chip's accessible description.
- Carried and Missing draw every chip (`showAll`), each being bounded by the assigned categories. Extra draws its first eight (`EXTRA_CHIP_LIMIT`) and folds the rest into `CategoryChips`' own +N panel. The component is shared, so the builder, the spell page's side column and Quick Look fold alike.
- With none of the three it says the intent and ingredients match. With no category assigned it does not list every ingredient as an extra: it asks for categories first.

## The categories, read once

`useCategoryIndex()` (`category-index.ts`) is the builder's one read of the `categories` query (the picker's filter list, each id's name and group colours, and the pending and failed states). Every caller shares one request through the query cache.

## Reordering

Each step is moved by its handle, a grip button named "Move" and the step's name. Linked, one-off and instruction steps move alike.

- **The list** (`SortableSteps`, dnd-kit's `verticalListSortingStrategy`) takes its sensors (4px pointer drag, `TOUCH_DRAG_DELAY_MS` 250ms touch hold within 5px), keyboard target, handle instructions and wording from [`src/lib/sortable`](../../src/lib/sortable/index.ts), shared with the combobox.
- **Keyboard.** Space or Enter lifts the focused handle's step, Up and Down move it a place, Home and End take it to either end, Space or Enter puts it down, Escape puts it back. Left and Right do nothing in a column. Focus stays on the moved step's handle.
- **Every move, Add and Remove is said.** A move in dnd-kit's live region in the combobox's wording; an Add or Remove in the list's own `@dnd-kit/accessibility` `LiveRegion`.
- **A move is a change to save.** The field array's `move` reorders the steps, the dirty check compares them in order, and Save sends them in their new order, each saved one by id. The service writes `position` from that order, moving live rows in place under the `(spell_id, position)` partial unique index through a negative scratch place, never by removing a step and adding it again.

## Step values, documents and totals

- **Stored values.** `restoredSteps` is described under "Closing the modal".
- **GraphQL documents.** The saved steps' read returns each step as the builder opens it, including the coven's jar units for the coven `$workspaceId` names; a step's unit is checked against those. The full selection is written out as "Saving" sets out.
- **The supply total** (`steps/supply.ts`) is what a form's steps need together, for its one line in the recipe page's In the Cupboard panel ("3 tsp"). The builder draws no supply. One amount stays as typed. Amounts in one unit add as they are (a count too, since nothing is converted). Amounts in two units of one dimension add in the jar's unit through `unitConvert`. Anything else is listed ("1 tsp + 2 pinch"), never guessed. A blank amount adds nothing, and no amount at all is null.

## Why Save Spell is off

While Save Spell is off, a tip on the button says why: `FormActions` takes the reason as `saveReason` and the same words are the button's description. The button is `aria-disabled` rather than `disabled`, so it keeps focus and the tip has something to open from; it looks off and its press does nothing. The reasons, in this order: a step's unit to fix, the jar still loading, "Nothing to save yet". It is left out while a save is on its way. "Nothing to save yet" shows only while the spell has not been edited (autosave status idle), so it does not return after every autosave.

## Styling

The `<form className="form">` sits straight in the body of a `RouteModal` of `size` unset: the default `$dialog-column` (32rem of content), not `wide` ([`modal.md`](modal.md)). Values are in `rem`, so they are the same at 1280px and 390px.

- An open section's fields end `space(6)` above the next section, set under `.spell-builder` so IngredientForm's `space(5)` stays, and a bare `section`'s margin is zeroed under `.spell-builder` so the sections' gap is not doubled.
- The step list is a column spaced by its `gap` alone, with no row margin and no room while empty. It is the size container a row stacks by (`spell-steps`), declared in the one `.spell-steps__list` rule.
- Category Match's and In the Cupboard's rules are `panels.scss`, which `index.scss` takes with `@use` and the recipe page's side column imports on its own.

The row's own look is in [`step-row.md`](step-row.md), "The card".

## Used by

The grimoire list's layout (New Spell), the spell card's pencil, the recipe page's Edit and Quick Look's Edit open it through the address. [`step-row.md`](step-row.md), [`jar-shelf.md`](jar-shelf.md), [`category-picker.md`](category-picker.md) and [`combobox.md`](combobox.md) supply its parts.

## Not here

Spell history and revisions (the version written over by Keep My Version is kept nowhere), stock verdicts (the recipe page and Quick Look), and notes.
