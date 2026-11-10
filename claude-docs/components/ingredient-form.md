# IngredientForm

`src/components/IngredientForm/` holds every property of an ingredient, on react-hook-form with the Zod resolver: a coven's new ingredient, or a compendium entry, new or edited. It validates with the shared `LocalIngredientInput` (`CompendiumIngredientInput` on the compendium) before sending, and puts an error from either side beside the field it names. The add and edit modals and the admin compendium page wrap it. Each file's top comment says what it holds.

## Contracts

### Props and tiers

- **`workspaceId` is a union** (`IngredientFormProps`, `types.ts`): a coven's id writes to that coven; `null` writes the compendium, and every lookup then asks about the compendium alone ("On the compendium", below).
- **Either tier's edit offers Delete Ingredient**, in `FormActions`' `aside` ([`ingredient-entry.md`](ingredient-entry.md), "Edit").
- **`onSaved` says which save was pressed**: `'open'` (the page opens the ingredient) or `'another'` (the form clears). An edit's one save is `'open'`. A save moves no jar, so a coven's new ingredient comes back with an empty `stock`.
- **`duplicateHref` is required**; **`quickLookOf`** is passed only by the admin compendium's form. **`entryHref`** is where a linked substitute's summary links its ingredient; left out, a summary links nothing. **`mayPromote`** shows the promote arrow on a saved folk name, on an edit only. **`sourcesIntro`** is content at the start of Sources; the form knows nothing of sourcing scores. **`workspaceName`** (coven only) names the coven in the add notice; left out, "My Ingredients".
- **`review`** (compendium edits for a curator or keeper) adds the Reviewed and Shown in Compendium switches after the last section. They sit beside react-hook-form's values, not in the entry's input: Save carries them, a flip counts as a change, and they are written after the entry (a refusal there says "Saved, but the review mark was not" and leaves the switch changed). An add's Shown follows whether it has any category until the curator flips it ([`ingredient-entry.md`](ingredient-entry.md), "Structure").

### The fields and their sections

- **The ingredient has no form of its own: its forms are its variants.** Deities and folk names stay on the ingredient alone.
- **The six section headings are `h3`s that name no landmark**; a variant's open fields run in the same sections as `h4`s (Correspondences without deities). In Details & Care both labels are visible, since the heading names the section, not either field.
- **Every empty field shows a short action as its placeholder**, and what the field is for sits in its hint. A date field shows none: the browser draws its own format.
- **Name is the one field always required**, by `aria-required` and an `aria-hidden` asterisk, so the field's name stays "Name". It is `aria-required`, not `required`, whose `:invalid` would mark the empty field before anyone tried to save.
- **The formal name is marked required while a named kind is chosen.** A typed formal name does not mark the classification, since a name with no kind saves as `unknown`.
- **A field's hint is an info tip** ([`info-tip.md`](info-tip.md), "When a field gets a tip"), kept only where the label cannot carry a rule, flow or format with a trap. A field's `note` is the one line kept beneath a label for a state that must stay in view; only the formal name's reason for being shut uses it.
- **The classification's options are `NOMENCLATURE_KINDS`** (`schema/ingredient-enums.ts`). It starts at `''`, which is not in the list; "None" is itself a kind. A choice is made before the field revalidates, so choosing None empties the formal name first. "Classification" is the label for `nomenclature` (DESIGN.md §5). Closed sets use [`ComboboxSelect`](combobox.md) ("The select-only box").
- **The element is a multi-select in the order chosen.** None chosen is the answer "none", so there is no None option. Its values are the enum's strings, so it is not one of `LIST_FIELDS` and errs through one error element.
- **A variant's `form` is one free-text `SuggestField`.** Picking a curated form links its row as well ("The form's pick"). The box is tidied when left, has spell-check off, and on a coven's form carries a hint that a form not listed may be typed; on the compendium's it is a pick and has no hint. `SuggestField` and the lookup lists pass `spellCheck={false}` to the Combobox, as do Formal Name and the Locator, since a name or a page is not a word.
- **The six lists are one combobox each, with the entries inside it.** Entries are a `useFieldArray` of `{ value }`, since react-hook-form refuses bare strings. A box's text is the form's own `drafts`, which `toInput` leaves out. A list's info tip sits in its legend and the fieldset is named by the legend alone through `aria-labelledby`, or the tip's button would join the name.
- **A substitute entry is typed text or a link**: `{ value, link }`. A link is made only by picking from the substitutes' lookup; `toInput` sends a link as `{ ingredientId }` and typed text as `{ name }`. A linked pill reads label and formal name (and a named form after a dot, `entryText`), as do its × and any error naming it, since two ingredients can share a label. Its `detail` (`entryDetail`) is the form linked or "Any form" (the ingredient's own list only; a variant's link always names a form), then the tier, so same-looking pills are told apart.
- **A deity entry has the same shape**: `value`, `link` its id, tradition and description; the pill reads "Hecate (Greek)", as do its × and errors, so Greek and Roman Hecate differ. `toInput` sends `{ deityId }` or `{ name }`.
- **A list's suggestions span the field** and open above the box when there is more room there ([`combobox.md`](combobox.md), "Where the list opens").
- **Text left in a box stops the save.** The form's resolver adds 'Press Add to keep "Hedge Fixture", or clear the box' on the list's error element, so a save never sends a list the user thinks holds an entry it does not. The schema never sees a box, so the rule is the form's own.
- **A repeat is refused at the box.** Add, or Enter with nothing highlighted, on text repeating a listed entry adds nothing: the box keeps its text and takes `aria-invalid`, the list's one error element reads `"Mars" is already listed` (a folk name repeating the name: `"Testwort" is already the name`), the changes region announces it, and focus stays. The error is `drafts.<list>` of type `repeat`; changing the text or adding anything clears it. `repeatOf` (`values.ts`) decides what a repeat is, on the schema's keys: text trimmed and case-folded; a deity or substitute link by its id; a typed deity or substitute among typed entries alone (typed "Hecate" beside a linked Greek Hecate is added, as at save). The schema stays the backstop for an API caller.
- **Each add, removal and clear is announced** by a visually hidden `<output>` named "<List> changes", distinct from the box's own suggestions region (WCAG 4.1.3).
- **Celestial bodies, zodiac signs, colours and deities keep the order entered** (DESIGN.md §5): `ListField` takes `ordered` ([`combobox.md`](combobox.md), "A sortable list"). A move is the field array's `move`, keyed by `id`, so a deity's link and an error naming the entry travel with its pill. The changes region is left to adds, removals and clears, since the sortable list says each move. Folk names and substitutes read alphabetically, so have no handle.

### Sections fold

- **Each of the six sections is a [`CollapsibleSection`](collapsible-section.md) at `h3`**; its fields stay in the page while closed. A closed section's line is `SectionSummary`, each section watching its own fields so a keystroke redraws one line. An empty section reads "Nothing yet".
- **A new entry opens with every section open**, as does the form Save & Add Another clears; an edit opens with every one closed.
- **Open All / Close All** sits under the modal's × (under the heading on a phone, [`modal.md`](modal.md), "A control in the header"), or above the first section outside a modal. It reads Close All while any section is open, including a section open inside a variant card the Variants section hides.
- **Validation runs on leaving a field, and on each change once a field is in error**, as well as on submit. An error is _shown_ only after a submit, or on a field the person has both left (`touchedFields`) and edited since the form started (`useEditedFields`; typing a name and deleting it still counts, which `dirtyFields` would not). The rule lives once in `errorShown` beside `useField` (`src/components/Field/use-field.ts`) and the section flags read it too, so a section is never flagged for an error no field in it draws. The check is asynchronous, so a test that moves focus settles before it ends.
- **Save opens every section holding an error**, schema's or server's, and focus moves to the first invalid field. `sectionsWithErrors` (`values.ts`) finds them by each error's first key, a box's draft by its list; a save held on the duplicate warning counts as Identity's. A section holding an error is flagged beneath its heading, open or closed.
- **Delete and the redirect question replace the saves beneath the sections**, so they work whatever is closed.
- **A variant's five `h4` sections fold the same way**, inside the card's one-open-at-a-time disclosure. A variant added this session opens with every section open; one an edit opened with opens with every section closed. Each variant keeps what was opened while its card is closed.
- **The form holds the variants' fold state** (`useVariantFolds`, `variants.tsx`), not each card, so Save and Open All / Close All reach it. A place past the end reads every section closed.
- **Save opens, in each variant holding an error, each section holding one**: `variantsWithErrors` (`values.ts`) reads `errors.variants` by the first key beneath the variant, its Form and kept `id` being Identity's. A variant's substitute link naming no form opens its Relations. Open All / Close All opens and closes no card.
- **Copy From Ingredient** sits in its field's label row, so it is hidden with its section. The skipped notice stays in the page with the list.

### The lookups

- **Six boxes suggest through `/api/graphql`** with TanStack Query ([`graphql/client.md`](../graphql/client.md)), on one hook, `useLookup` (`suggestions.tsx`): form, common name, celestial body, zodiac, deity and ingredient. Colours take none.
- **Each asks for ten rows under the form's `workspaceId`**, debounced 300 ms, keeps the last answer on screen while the next is fetched, and never throws: a failed lookup offers nothing. None asks until its box has been focused, so opening the form sends no request.
- **`FormField` and `LookupListField` watch their box's text** and hand each field its `Suggestions`, so `fields.tsx` knows nothing of the network.
- **Rows sit under "From Compendium" and "From Coven"**: curated rows and rows in use. A form row shows its group beside the value so two same-named forms differ, and a curated form's row carries its `id` as `link`; a form only in use, and a common name, link nothing. A curated deity adds its value linked through the row's `id`, one only in use adds typed text. Free text outside the vocabulary saves with no warning.
- **Substitute rows** sit under "Your Ingredients" then "Compendium", each best match first. A form ranking never lifts a compendium row above a cupboard one. Each row's key and `link` is the ingredient's id, since a compendium entry and a coven's copy can read alike (a name match hides nothing). The typed row, Add and Enter add `{ name }`.
- **A lookup leaves out what its list holds**, through `repeatOf`: bodies, signs and folk names by folded text (a folk-name lookup also leaves out the ingredient's name); a curated deity by id, so listed Greek Hecate still offers Roman; a deity only in use by text against typed deities; an ingredient by id. "Use what you typed" is not offered for text the list would refuse (`offerTyped`). A pick is therefore never a repeat; only Add and Enter refuse one.
- **On the compendium, substitutes link only the compendium** (`useCompendiumSubstitutes`, leaving out the entry being edited), and the form, celestial body, sign and deity boxes are pick-only, since the compendium services refuse any other value ([`validation.md`](../validation.md), "The two ingredient variants"; "On the compendium", below).

### A linked substitute's summary

In both substitute lists (`holdsSubstitutes`, `values.ts`):

- **A linked chip is a button, a typed one is text**, so they differ by shape, not colour alone. A screen reader hears the linked one as a button that opens a dialog; the typed one as its text plus a visually hidden "(name only)".
- **Pressing it opens a non-modal `<dialog>` beneath the chip** ([`combobox.md`](combobox.md), "A linked entry's summary"). Escape hands focus back to the chip and is cancelled, so the compendium's modal does not take it as its own cancel and ask about unsaved changes.
- **With a form named, it shows each list as the ingredient's and the form's together**, since a form adds to its ingredient and never takes away.
- **It is read when the panel opens, not before**, by the existing `ingredient(id, workspaceId)` query, with the coven the lookups ask about, or none on the compendium.
- **It links the entry's page where `entryHref` is given**, in a new tab so unsaved changes stay. The admin's page gives `/curator/compendium?edit=<slug>`. The shell's add button gives `/compendium/ingredients/[slug]` for a compendium substitute and nothing for a coven's own, since the summary is given a slug and a coven's page is addressed by id.

### The categories

- **The form reuses [`CategoryPicker`](category-picker.md) and knows nothing else about categories** (`design-decisions/ingredients.md`, "Categories are picked from the lists' box, not a wall of chips"). `CategoryField` reads the public `categories` query as the form opens.
- **One page holds them all**: the query asks `first: 100`, written out because `lib/pagination.ts` is the server's. Each comes with its group's id, name and colour pair, so a group a keeper adds needs no deploy.
- **It is read once, without waiting for a focus**, since the picks are the field. A failed read says so beneath the box and the form still saves, with no categories.
- **Nothing typed is a category**: no Add, no "Use what you typed"; Enter adds only the one category the text names whole.
- **A pick's error names it**: an issue at `['categoryIds', i]` is `fieldNameOf`'s `categoryIds.i`. The box takes `aria-invalid`, so the submit's focus lands on it.

### The references

`ReferencesField` (`references.tsx`) is a fieldset named "References" (DESIGN.md §5, "References").

- **One box searches and never adds what was typed.** One control both finds and makes a source, since a source is far more often picked than written. A source already listed is not offered again. The last row is "New Reference", the combobox's action row ([`combobox.md`](combobox.md), "The action row"), which opens the panel. Enter with nothing highlighted only closes the list and never reaches the form.
- **Each picked source is a one-line row beneath the box**, not a chip, showing the Chicago short form (`renderShortCitation`, [`db/references.md`](../db/references.md), "The short form"); the whole citation is each button's description. Rows keep the order picked; the service reads them back alphabetical by citation. Unlike chip lists, Backspace and Delete in the empty box take no row.
- **A source just added opens at once**, its Locator focused, picked or saved through the panel alike; the box empties and does not keep the focus.
- **The edit opens the row**: the citation whole, broken anywhere so an address never runs the page sideways at 320px; its tier; and a "Locator" box whose info tip says every place the source is cited goes in the one box, since a source is listed once. The locator is tidied as it is left (`formatLocator`). One row is open at a time. A row whose locator, Name Basis or Supports is in error stays open whatever was pressed, so the focus after a save can reach it. The × asks first; once removed the box takes the focus ("Removing a variant or a reference").
- **An open row whose source the form may change has Edit Source** ("Editing a source").
- **On the compendium's form an open row also has Name Basis and Supports** under its Locator: a select of `stated`, `resolved`, `unresolved` and `unaudited` ([`db/references.md`](../db/references.md), "Citation attributes"), and a multi-pick of the fields the source backs (`CITED_ENTRY_FIELDS` for an entry, `CITED_VARIANT_FIELDS` for a form). A coven's form renders neither, since a coven's citation carries neither and the service refuses them. Neither is sent until chosen. Copy From Ingredient brings the name basis, and of the supports only the fields a form has.
- **Entries are a `useFieldArray` of `{ value, link, locator, nameBasis, supports }`**: `value` is the citation (describes the row, never sent); `link` is the source's id and tier plus `kind`, `authors`, `title`, `container`; `nameBasis` is `''` until chosen. They are not one of `LIST_FIELDS`, which are free text. The box's text is `drafts.references`; whether the panel is open is `referencePanelOpen`, both the form's own.
- **A search left in the box stops the save, and so does an open panel**, new or editing, both from the resolver on the field's one error element.

### The new reference panel

`ReferencePanel` (`reference-panel.tsx`) opens inline beneath the field, not as a dialog, because the whole form is already in a modal and a dialog there would stack two. It is a fieldset, not a `<form>` (which cannot nest), running its own react-hook-form under its own `FormProvider`; its fields are the form's own `TextField` and `SelectField`.

- **Only the fields the chosen kind needs show**, in the order its citation prints them (`FIELDS_OF`, read off what `renderCitation` prints, `src/lib/citation.ts`), so the panel offers nothing the citation would drop. A kind change keeps what was typed, but only the chosen kind's fields are sent, a blank day as null (`LocalDate` takes no empty text). The resolver is the shared `ReferenceInput` schema ([`db/references.md`](../db/references.md), "Formatting and checks").
- **Scholarly, on a compendium source alone**: a switch marking a work scholars edited or reviewed (`references.scholarly`, [`db/references.md`](../db/references.md)). A coven's panel has none, since the service refuses the mark.
- **One How to Cite tip replaces a hint per field**, in New Reference and Edit Source alike ([`info-tip.md`](info-tip.md), "When a field gets a tip"). The bubble is a `<span>` and may not hold a `<ul>`, so its rules are spans with `list` and `listitem` roles. The panel's `aria-describedby` names it after an edit's reach note. A placeholder is a short sample (`Perseus`, `1985`), never the rule.
- **Last Modified and Accessed are the app's `DateField`** (`ReferenceDayField`), with `max` from `latestDay()` so the calendar offers nothing the server would refuse; the server check stays. The calendar cannot unpick a day, so an optional one shows a Clear button once set. Address is a `url` field: `inputMode="url"`, no spell-check, no capitals.
- **Each field is tidied as it is left**, the way the server stores it: `TextField`'s `format`, from the same module the schema formats with. A showing error is judged again on the tidied text.
- **Save Reference sends `createReference` for this coven** (the compendium, under the admin proof, when `workspaceId` is null). A `VALIDATION` error's field errors land beside the fields they name, if the kind shows them; anything else is an alert at the panel's top. A saved source is added as a row by its id, the panel closes, the box takes the focus, and the cached searches are dropped.
- **Enter in one of its fields saves the source**, not the ingredient. Cancel closes it, the box taking the focus.
- **A × at its top does what Cancel does** (held with Cancel while a save is in flight), so a panel taller than the dialog can be left without scrolling. It is named "Close New Reference" (the modal's own × is "Close") and comes before Kind in Tab order.
- **Save & Add Another closes the panel**, since `EMPTY_VALUES` holds `referencePanelOpen: false`.
- **Asked for again while open, it takes you back**: "New Reference" scrolls the panel's top into view and focuses Kind again, keeping everything typed.

### Editing a source

A recorded source is changed in the same panel. The edit changes the source, not the row's link, so it reaches every entry citing it.

- **Edit Source is a second, deliberate step** in the open row, separate from the pencil because the pencil opens the row for its Locator, and an edit reaching every citing entry should not be one press away.
- **Only where the form may change the source.** A coven's form edits its own sources; a compendium source there has no Edit Source and its tier line says only the site's keepers can edit it (not a disabled button, which takes no focus so its tip could not be reached by keyboard). The compendium's form edits every source it lists. Another coven's source never appears.
- **The panel opens on the whole source.** A row carries only the short form's four fields, so the panel reads the rest by id through the `reference` query in the source's tier ([`db/references.md`](../db/references.md), "Reading and writing them"), kept only while the panel is open (`gcTime: 0`).
- **Save Source sends `updateReference`** with the id, tier and every field, since an update replaces the source. Saved, every row in the form citing it (the ingredient's and each variant's) takes the new citation in place, the panel closes, the row stays open and its Edit Source takes the focus. The rows are rewritten without marking the ingredient changed (the source is saved already and the links sent are as they were), so the unsaved-changes guard ([`modal.md`](modal.md), "Unsaved changes") is left as it was. Rows on other ingredients read the new text on their next load.
- **Cancel, or the ×, closes it without saving**, focus back on the row's Edit Source. New Reference while an edit is open, or Edit Source on another row, starts that panel afresh.
- **A panel's edits count as unsaved changes** to the ingredient form: each panel reports its `isDirty` through `PanelChangesContext` (`panel-changes.ts`), which is what the promotion question reads (`panels.changed`). A panel left open stops the save.
- **Known limitation**: rows rewritten after an edit hold a citation the form's defaults do not, so once another field is changed the ingredient counts as changed until saved even if that change is undone. Fixing it needs react-hook-form's private `control._defaultValues`, or a `reset` that would drop the field arrays' keys.

### The variants

An ingredient comes in forms, and each form adds to the ingredient and never overrides it ([`ingredients.md`, "An ingredient and its forms"](../design-decisions/ingredients.md#an-ingredient-and-its-forms)).

- **Each variant is one summary line until opened**, a card showing the form as typed ("Unnamed Form" while empty) with its curated group after it, and `variantSummary` in its sections' order or "Nothing yet". The card is a fieldset named by the form alone through `aria-labelledby`.
- **Remove asks first and only removes.** It never opens or closes the card; focus goes to the New Form box.
- **Edit opens it in place, one at a time**, closing any other. Focus moves to its Form box while Identity is open, else to Identity's heading. Done at the foot, or Edit pressed while open, folds it back and returns focus to its Edit. A variant added from the New Form box opens first of the cards, closing the one open, while the New Form box keeps focus. An edit opens with every variant closed, in the read's order by form.
- **A closed variant's fields stay in the page, hidden**, not unmounted, so nothing is lost by closing it (a box's text, a sortable list's place, an open reference panel and what was typed in it).
- **An error in a closed variant opens it.** A save (resolver or server) finding an error under a variant opens the first such variant, unless the open one has an error too, and the variant's sections holding one, in the same commit that draws the error, since the focus runs as it lands. Any other variant with an error stays closed, its card edged in the error red and its line saying so, read with its Edit.
- **Its fields are the ingredient's own field components** at the variant's place in the values (`variants.1.celestialBodies`), so each validates, errs, focuses and is held by text left in its box as the ingredient's is.
- **The New Form box adds one**: a pick from the form vocabulary adds a variant carrying the pick; on a coven, Add or Enter adds the typed text. A form the ingredient already comes in, folded as `ingredient_variants_form_unique` folds it (trimmed, case aside), is refused at the box with its text kept and the reason on the box's error (`repeatedForm`); the lookup leaves those forms out. Text left in the box holds a save.
- **On the compendium a form is a pick**: the box offers curated rows alone, with no typed row and no Add, and a Form box typed away from its pick is refused beside the box at save. While an entry has no form the section says one is wanted: an entry with none saves, as information only, which nothing can stock.
- **A variant's substitutes are picked form by form** (`formRows`). The box shows each ingredient found as a row per form, which links that form and is sent as the entry's `substituteVariantId`. A variant's link always names a form (a form stands in for a form), so there is no whole-ingredient row, and an ingredient in no form (only a coven's information-only entry) is not offered. Typed text is still added as a name only. The variant itself is never offered (`ingredient_substitutes_not_itself`); its sibling forms are. Once an ingredient is listed, every row of it leaves the box (`ingredient_substitutes_variant_link_unique` holds one link per ingredient in a form's list). The search matches ingredients by name, not by form.
- **The rows rank for the variant's form** (`rankForForm`): an ingredient with a form that folds alike first, then one with a form in the same curated group, then the rest, each tier in the search's order. Every form's row stays.
- **A link naming no form is refused at save.** Old data can hold one; its chip reads as the ingredient alone. The refusal is the schema's `formLinkRules` (`validation/ingredient.ts`), on a variant's substitutes alone, at `['variants', i, 'substitutes', j, 'substituteVariantId']`, which `fieldNameOf` places on the same entry ([`validation.md`](../validation.md)).
- **The ingredient's own substitutes keep a second picker**, `SubstituteForms`: a linked ingredient in forms gets "Form of <name>", Any Form until one is chosen, sent as `substituteVariantId`.
- **An edit opens with its variants**, each carrying its row's id as `variantId` (not `id`, which `useFieldArray` keys rows by), sent back as the input's `id` so a respelt form keeps its row.
- **A server issue on a variant is pathed beneath it** (`['variants', 1, 'form']`) and `fieldNameOf` places it on that variant's field, list entry or reference row; one on the variant as a whole, or its kept `id`, is its Form box's.

### Removing a variant or a reference

A variant's × and a reference row's × ask before removing, since both take more typing to put back than a chip. `RemoveQuestion` draws the form's usual `ConfirmQuestion` card ([`modal.md`](modal.md)), focus on Cancel.

- **Nothing is lost until the save**: Cancel on the form still discards the removal with the rest.
- **Cancel hands focus back to the ×; Remove hands it to the list's box**, since the × went with its row. The removal is committed at once (`flushSync`) so the card's own hand-back comes first and the box's second.
- **One question at a time**: a removal question steps aside while `DiscardAskingContext` is true (`remove-question.tsx`). Nothing in the form provides it, so it is always false here; it exists for a form that draws the shared unsaved-changes question.
- **The question holds the row's field-array id**, not its place, which an add while asking would move.
- **A chip's × still removes at once**, and Backspace in a chip list's empty box still takes the last chip.

### Promoting a folk name

- **A saved folk name's chip carries an up arrow ahead of its ×.** It makes that folk name the ingredient's name and the old name a folk name, in one step on the server (`promoteFolkName`). The arrow is the Combobox entry's `action` ([`combobox.md`](combobox.md), "An entry") that `ListField` fills per row through `rowAction`. A name typed and not yet saved has no id on the server, so no arrow.
- **It always asks first** (`PromoteFolkNameQuestion`, `promote.tsx`; the lines beneath the question are `ConfirmQuestion`'s `details`, [`modal.md`](modal.md)). The question names no name, since the swap beneath names both. On the compendium a caption says every coven sees the change at once.
- **A form with changes is offered Save & Promote, Discard & Promote and Cancel.** Save & Promote runs the form's own save first, with the same validation and errors; if it does not land, nothing is promoted, the question closes and the first invalid field takes focus. Discard & Promote resets to the saved values, then promotes. An open reference panel's edits survive Save & Promote; Discard & Promote closes the panels with the reset.
- **One round trip**: the mutation answers the new name and the full folk-name list with ids. The form resets from that answer, clears its edited marks and undo history, calls `onSaved`, and focuses Name, since the pressed chip is gone. A refusal (a name already taken) shows in the form's alert and the question closes.
- **Both tiers**: `usePromoteFolkName(workspaceId, ingredientId)` and the question take a null `workspaceId` for the compendium.

### Copying from the ingredient

Each of an open variant's fields but its Form has a **Copy From Ingredient** icon button (`copy.tsx`). The ingredient's own fields have none, and nor has a form's Toxic toggle: its flag is its own, never the ingredient's (the ingredient's is on when any part of it is poisonous, a form's when that form is).

- **Its name starts with the visible words** ("Copy From Ingredient: Celestial Bodies"), so the nine are told apart (WCAG 2.5.3).
- **It is `disabled` while the ingredient's field, as the form holds it now, is empty.** `disabled` rather than `aria-disabled`, since a press never empties the ingredient's field, so focus is never stranded on a shut button.
- **It adds and never takes away.** A list gains the ingredient's entries it lacks, after its own, in the ingredient's order: bodies, signs and colours by text folded as a save folds it, elements and categories by value, references by source with their locators. An empty text box takes the ingredient's text; one holding text gains it after a blank line unless it holds it already. **Substitutes copy "the same form"**: each linked substitute links the linked ingredient's form that folds alike to this variant's form; a name copies as a name; one already listed, by link or folded name, is left out. **One in no such form is skipped**, since a variant's link must name a form.
- **The skipped notice** (`SkippedNotice`, `useSkippedCopy`) is a block `warn` `Notice` taking no role, inside an always-present status region (as the duplicate warning is), empty and with its gap cancelled until a copy skips something. **Copy Anyway** adds the skipped ones as typed names with no link; × dismisses. Either returns focus to Copy From Ingredient. Any other change to the list removes it too.
- **After a press** the form is dirty and, once a save has been tried, the field is revalidated. A polite announcement says what was copied through the list's live region, else a hidden `output` beside the button. Focus stays on the button.

### The form's pick

Two curated forms may share a name (Wax under _Animal_ and under _Substance_, DESIGN.md §5), and both fill the box with "Wax". So a pick of a curated row is kept beside the text as `formLink` in the form's values: the row's id, the name picked, its group, the group's `icon` and its description.

- **Every form wears its group's icon**, as decoration outside every accessible name.
- **The box shows the group** as the combobox's `qualifier` ([`combobox.md`](combobox.md), "A qualifier"): "Wax" stays editable text with the group after it. The form's description is the qualifier's tooltip; the group and description are also the box's accessible description after its hint.
- **An edit away from the picked name drops the link, and the group with it.** Typing the name back does not restore it: what is left is typed text. A pick of the typed row, or of a form only in use, clears the link too.
- **It is sent as the variant's `formId`**, `""` for typed text. The service refuses an id naming no curated form at `['variants', i, 'formId']`, which `fieldNameOf` (server) and the resolver (schema) place on that variant's Form field.
- **A pick a keeper has since renamed asks the member.** A coven's variant keeps the text it was saved with, so after a keeper renames the curated form ("Wax" to "Beeswax") the text no longer matches the pick's name, which `renamedTo` (`values.ts`) notices. The form offers Use "Beeswax" (takes the new name, keeps the link) and Keep "Wax" (keeps the text, drops the link), and holds the save with an error on the Form field until one is pressed, since the service would refuse the mismatched pair. Only a coven's variant can hold one: a rename rewrites the compendium's own.
- **Save & Add Another clears it**, since `EMPTY_VALUES` holds no variants. An edit is given its picks back in its values: the compendium page reads the curated form with its group and each deity with its tradition, as `IngredientVariant.formChoice` and `IngredientDeity.deity` resolve them. A pick retired since reads as typed text.

### The duplicate warning

A "did you mean" on `possibleDuplicates` ([`graphql/schema.md`](../graphql/schema.md), "possibleDuplicates"). The form owns `useDuplicateWarning` (`duplicates.tsx`), since its save waits on it; `NameField` draws it.

- **It asks for the three closest entries** in the compendium and this coven (on the compendium, the compendium's alone, less the entry being edited), once the name has settled through `useDebouncedValue`. It asks nothing for a blank name, a one-letter name, or the name the form opened with until it has been typed in, so a save that never touched the name is never held. The threshold is the server's 0.4, so "no warning" is an empty answer. Nothing refuses the create on the server: the warning is the form's alone.
- **Each match is a plain anchor to where `duplicateHref` says**, in a new tab so the typed form stays; the caller hands back a plain string, and a typed `<Link>` wants a route the build contains. The warning is a block `warn` `Notice` ([`notice.md`](notice.md), "The block form") with a **Create Anyway** button.
- **In a coven's form the matches come in two groups**: **In This Coven** (`!isGlobal` or `inCupboard`), then **In the Compendium**, each in the answer's order. An empty group is not drawn; a lone group keeps its heading. The compendium's form draws one plain list.
- **Rows never jump.** While another answer is on its way each row stands as the skeleton's shape; shapes wait 200 ms before fading in, so a quick answer never shows them, and the region is `aria-busy`. The height slides with `useSlidingRows` (script-set, since `auto` cannot animate); reduced motion swaps at once. The name field shows the lookup through `busy` on its `TextField` ([`field.md`](field.md)).
- **An exact compendium name is a question, not a warning.** A new coven entry's save also asks `compendiumMatches` ([`graphql/schema.md`](../graphql/schema.md), "compendiumMatches") for entries bearing the typed name exactly (case aside; the formal name too). If any come back that the person has not set aside, the save waits and the notice says the compendium already has an entry of this name. Each row has a **+** ([`add-icon.md`](add-icon.md)) which adds the entry to this coven with no menu of covens, or the **Quick Look** eye where the cupboard already holds it; one **Create Anyway** sits beneath the list. A near match gets the same + or eye when it is a compendium entry (`isGlobal`); the coven's own entry gets the eye, never a +. Both need `onUse`, which the compendium's form leaves out.
- **The + calls `addCupboardEntry`** (no jar, no form) and adds the entry under its own name: the typed name is never sent as a `label`, since it could clash with a label the coven already gives another entry. It sends whichever of the description, safety notes, elements, celestial bodies, signs and colours were filled as the coven's overrides, then reports the entry through `onSaved` as `'another'`, so the modal stays open with what was typed. A refusal is said at the form's head. Once the add lands both lookups are asked again (`added`), since cached answers would say the coven still lacks it.
- **The + becomes the Quick Look eye where it stands.** While sent it is `aria-busy` and `aria-disabled` (not `disabled`, so focus stays). On success it shows AddIcon's check for `ADDED_HOLD_MS` ([`add-icon.md`](add-icon.md)), then the same button becomes Quick Look. Only then is the cache refreshed and the row moved to In This Coven. Focus moves to the eye. "Added to the coven." is said once through the status region (`useAnnounce`, [`click-feedback.md`](click-feedback.md), "The status region"); no Saved notice. The page beneath is not refreshed until the next navigation. A refusal leaves an idle +.
- **An edit's warning holds nothing.** Renaming makes nothing new, so on an edit the warning names and links its matches but offers no Create Anyway and never holds Save: the form skips `check`, and `NameField` takes `holds={false}`.
- **Quick Look in the admin compendium's form**: every match is a compendium entry, so each row gets the eye (`DetailsLink`, [`ingredient-entry.md`](ingredient-entry.md)) and no +. The form takes `quickLookOf`, which `CompendiumDialog` builds when the page passes `lookUnder`: the list's address with `?entry=<slug>` plus the form's parameter, so details open over the form and close back to it. The form stays mounted, so typing survives. Escape closes the details alone. Details over another entry's form offer no Edit; details under their own entry's edit keep it. The public search's form opens details by id and offers no Quick Look.
- **In the coven's form** (the shell's Add Ingredient dialog) the eye is a button (`QuickLookButton`, [`icon-tip.md`](icon-tip.md)), not a link, since that dialog opens over any shell page by `?new` and most have no details modal to route to. It opens `DuplicateQuickLook` (`quick-look.tsx`), the details modal over the form. Escape closes it alone.
- **The eyes are the add's green** (`$accent`, scoped to `.ingredient-form__group`) in every state, and as non-text controls clear 3:1 in both themes and on both notice tints (measured at least 3.96:1).
- **The warning has to be answered before the form saves.** While only typed against, it is a warning and the name is not marked. A new entry's save that passes validation asks about the very name it sends, through the query client's `fetchQuery` (cached when typing had settled, asked there and then when not, so a save inside the debounce cannot slip past). If a match not yet set aside comes back, nothing is sent: the notice turns `error` and its sentence changes (colour alone must not say it), the name is marked invalid and described by it, and focus goes to Create Anyway. A failed check holds nothing. The check runs after validation, so an error elsewhere takes focus first.
- **The hold belongs to the name it was set for.** Editing the name lifts it. Focus goes to the button through a layout effect declared after the one that focuses the first invalid field, so it wins when both run.
- **Create Anyway answers it**: it saves nothing, sets the named matches aside by id, and lets the next save go. The name takes focus before the button goes, found through the button's form rather than `setFocus`, which waits a tick with focus on the body; the name's error goes with the warning.
- **A screen reader hears it two ways**: the warning sits in a `<div role="status">` named "Possible duplicates", always in the page, and its sentence is in the name field's `aria-describedby` while showing. The notice inside takes no role of its own (`inRegion`, [`notice.md`](notice.md), "Inside a live region, a notice takes no role").
- **A save shows it is busy** from press to answer, the duplicate check included: both saves disabled, the pressed one `aria-busy`. The ring is slowed, not stopped, under reduced motion.

### The classification and formal name

The schema's rule has three cases: a botanical, fungal, zoological, mineral or chemical entry needs a formal name, a `none` entry takes none, and an `unknown` entry takes either ([`validation.md`](../validation.md), "The two ingredient variants").

- **The form enforces the second case by construction.** Choosing "None" empties the formal name and disables it, with a note beneath its label (a note, not a tip, since a shut field that does not say why reads as broken). It is shut with the HTML attribute, not react-hook-form's `disabled` option, which would also drop the value from what is validated and sent; emptying it keeps the value out. The schema's refusal stays the service's, for other callers. "Unknown" leaves it open and optional, so a name typed before the kind is settled is kept.
- **The first case stays a message**: a named kind with no formal name gets an error beside the formal name; a formal name with no kind is no error (it saves as `unknown`). The kind decides the formal name's error, so the classification registers the formal name as a `deps`, and nothing registers the other way. Once a submit has shown the error, changing either field revalidates the formal name and the error clears as soon as the pair agrees.

### What it sends

`toInput` (`values.ts`) reshapes the values as typed into the input the mutation and the schema take; the resolver runs with `raw: true`, so what it validated is exactly what is sent. Nothing is trimmed or parsed: a blank field goes as `''` and the service's run of the same schema turns it into an absence.

- **Forms go as `variants`**, the only place a form is sent: every field but `id` present, `""` or `[]` for none, since an entry replaces the forms it names; `formId` is the picked form's id or `""`; `id` is sent when an edit opened it. Every input type requires the list, so a form with none sends `[]`.
- **A reference goes as `{ referenceId, locator }`**, the locator as typed, never its citation.
- **Each toxic flag** goes as `toxic`: the ingredient's at the top, each form's on its variant, neither ever read from the other (DESIGN.md §5, "The toxic flag is the one exception").
- **Categories** go as `categoryIds` in the order picked, `[]` for none (an update needs it to clear them). **Elements** go as chosen, `[]` for none.
- **Unanswered closed sets are `null`.** A stub with only a name goes with `nomenclature: null`, which `LocalIngredientInput` reads as `none`, so a one-field entry is whole.
- **The boxes are left behind**, since a save is refused while one holds text. An entry's index in an issue's path is its place in the list shown: Add refuses a blank and a moved entry goes in its new place, so every entry sent is one the user can see, in order (a deity's place is its stored `position`).
- **A variant's issues also include the stale-pair refusal at `form`**, for a pick whose id and text no longer agree.
- **An edit's default values give each linked substitute a `variantId`** (`""` for Any Form), because its Form box registers that key as it mounts; react-hook-form counts a key added against defaults lacking it as a change, and React's development double mount re-checks, so an untouched entry would be asked about unsaved changes.

### Autosave

The form saves itself through `useAutosave` ([`autosave.md`](../autosave.md)); its status indicator sits beside the main button ([`autosave.md`](../autosave.md#savestatus)).

- **A new ingredient is created at its first save, once it has a name** (a "none" or "unknown" entry has no formal name, so the display name alone opens the gate). The create returns id, slug and revision; every later save is an update sending `expectedRevision`, an explicit Save included (a stale Save hands over to the conflict notice). The host moves the address through `onCreated` ([`modal.md`](modal.md#add-ingredient)). After a create by Save the form is clean, so Save waits for a change.
- **Save is disabled once an autosave has filed every edit.** A test that edits then waits for Save to enable depends on the autosave pause; the stories hold the save request until after the click (`holdSaves`).
- **Autosave waits while `heldBack` (`values.ts`) says the values are not yet an entry**: a blank name, text in a box or an open reference panel, a variant with a blank form, a renamed pick, a compendium variant typed and not picked, a compendium entry with no classification, a named kind with no formal name. A new entry with near-duplicate matches showing is held too, by the autosave's `enabled` clause in `index.tsx`, until they are dismissed or the name changes.
- **Writes are serialised** through one write path, each waiting for the one before, so a create is never raced by a second. **An identical write is skipped** once the row exists, when the input matches the last sent and no revision was named (a compendium end-redirect save is never skipped). `persist` hands the id to `onCreated` only for the write that created the row.
- **The blur flush is held while Save is submitting**: pressing Save disables it, moving focus out of the form, and the autosave must not create the row before Save has asked about duplicates.
- **An autosave of an existing ingredient calls `onAutosaved`** with the saved row (not on Close). The admin compendium dialog replaces its address with the saved slug (`replace`, no scroll) and fetches again; the coven entry dialog only fetches again (its address names the id). The form is keyed by entry id and reads `entry` only for starting values, so what was typed after the autosave stays.
- **Conflict** offers Reload Latest (reloads the page or calls `onReload`) and Keep My Version (sends over the newer revision). **Offline**: the local mirror stays until a save lands, and a reopened form with a newer mirror shows `RecoveryNotice` with Keep and Discard.
- **No Discard question and no Cancel**: Close saves first, so the form draws neither in any dialog ([`modal.md`](modal.md#unsaved-changes)). A viewer's form has no autosave and writes nothing.

### After a save

A new ingredient has two saves; an edit has the first alone. **Save Ingredient** is first, so Enter in a field presses it. Which was pressed is the submit event's `submitter` value; a submit with none is Save Ingredient's. The form navigates nowhere itself: the host does (the shell's add button pushes `/coven/[slug]/ingredients/[id]` on Save Ingredient only; its form is about to go, so it keeps its values).

- **The form says "Saved <name>."** in a `success` `Notice` above the fields, where a refusal's alert goes; the next submit drops it. The message is the form's, since only it knows a save landed.
- **After Save & Add Another the form resets to its empty values**, nothing is marked invalid, and Name takes the focus. A refused save keeps everything as typed. The reset is an effect on a count of landed saves, not on `isSubmitSuccessful` (which a save held on the duplicate warning sets too), and runs after react-hook-form's own end-of-submit update. Name is found in the page, not by `setFocus`, which reads a ref the reset has just dropped.
- **An edit's save resets to what it saved** (`reset(getValues())`), so Save is off until the next change.

### Undo and redo

The form uses `useFormHistory` ([`field.md`](field.md#undo-and-redo)), off while a question is asked over the form and while a save is in flight (its success handler resets over the values).

- **An add and its draft clear are one step**: adding a variant or picking a reference clears its typing box first, then adds the row, so one undo removes the row and returns the typed text.
- **Two resets clear the history**: after Save & Add Another's `reset(EMPTY_VALUES)` and after an edit's save, since a step past a save would undo what the server now holds.
- **A restore opens what holds the field it wrote**: `sectionsRestored(names)` (`values.ts`) turns changed paths into sections; a box's draft counts as its list (`drafts.colors` is Colours); a path under `variants.N` opens Variants and then that variant's section, through `reveal(index, sections)` from `useVariantFolds`.
- **A restored variants list is reconciled with the folds** (`reconcile(from, to)`): rows match by `variantId`, else by form text folded, each old row matched at most once, and a matched row keeps its open sections. An unmatched row (returning from a removal) opens fully and becomes the open card; if nothing returns, the open card stays on its variant, or none if gone. A redo swaps `before` and `after` so `from` is always the list as it stood.
- **Focus after a restore**: a classification pick that empties the formal name focuses Classification. A changed list focuses its typing box (`listBoxOf` in `values.ts`; the categories picker names its box `boxName`). A step on the variants list focuses `variants.<i>.form` of a row that came back, or `drafts.variants` (New Form) after a removal. Otherwise the hook focuses the field itself.
- **The reference panel has a history of its own**: the outer hook skips `referencePanelOpen` paths and ignores keys from a target inside `.ingredient-form__panel`. `PanelForm` runs its own `useFormHistory`, provider and `FormHistoryButtons`, under a `HeaderSlotContext` set to `null` (exported by `Modal`) so they never portal into the modal's header. Ctrl+Z in the panel undoes a panel edit alone.

### Forms are shown in title case

A variant's `form` is stored as typed. Wherever the site shows one it passes through `formLabel` (`src/modules/ingredients/validation/form-label.ts`), which calls `titleCase` (`src/lib/text.ts`): each word and hyphenated part capitalised, the small words (of, and, in, on, the, a, an, or, for, to, with, at, by, from) lowercase unless first, a word with an inner capital left alone. Display only: a field being typed into keeps the text, and GraphQL, services and seeds are unchanged. A label folds (`lower(btrim(x))`) to the stored text's identity, apart from a run of inner spaces, which it collapses. The lint rule `sorrel/form-shown-through-form-label` flags a component rendering `.form` without it.

### On the compendium

With a null `workspaceId` the form writes through the compendium mutations ([`graphql/schema.md`](../graphql/schema.md), "The compendium mutations").

- **An edit says so under the dialog's title** (`COMPENDIUM_EDIT_NOTICE`, `compendium-notice.ts`, the one place the wording lives), wherever the form opens. An add carries none, and nor does a coven's edit. In a modal it portals into the header's note line (`useModalHeaderNote`, [`modal.md`](modal.md), "A control in the header"), so it stays in view as the form scrolls.
- **The classification is required**: `compendiumResolver` validates with `CompendiumIngredientInput`, whose `nomenclature` has no default (every compendium entry declares one, DESIGN.md §5).
- **The form, celestial body, sign and deity boxes are pick-only.** Each offers the curated rows alone (a value only in use is one the services refuse), flat, under no From Compendium heading, with no typed row (`offerTyped`) and, on a list, no Add (`pickOnly`). Enter on unpicked text adds nothing and says `Pick "Moon-ish" from the list` at the box. A save is refused while such a box holds text and while the form is typed rather than picked, by the resolver, beside the box. Folk names and colours stay free text, having no curated list.
- **Every lookup reads the compendium alone**: folk names, references and their panel, and the duplicate warning ask with a null `workspaceId`; substitutes search `compendium(query)`.
- **An edit sends the whole entry** (`updateCompendiumIngredient`, every field present, `formId: ""` for no pick), with one save, off until something changes. Categories are sent in full, so those left alone stay ([`ingredients.md`, "The admin compendium page: its size, its modal, its lookups"](../design-decisions/ingredients.md#the-admin-compendium-page-its-size-its-modal-its-lookups)).
- **Delete asks on a `ConfirmQuestion` card over the form** ([`modal.md`](modal.md), "Asking over the form"), as [`GroupedValueForm`](grouped-value-form.md) asks, focus on Cancel and back on Delete Ingredient once Cancel puts it away. A coven's delete is from that coven alone. A refusal drops the question and shows the server's message as an alert above the fields. On a compendium entry `DeleteUsers` reads `compendiumEntryUsers` when the question opens and shows how many covens use it only once the number arrives; a slow or failed read leaves the question as it was, the count is never kept, never names a coven, and Delete stays unconditional.
- **The end-redirect question**: a save taking an address another entry still redirects from is refused at `['endRedirect']` ([`db/ingredient-slugs.md`](../db/ingredient-slugs.md), "Ingredient slugs"). That is no field's, so the form asks over itself: the server's message, **End Redirect & Save** (sends the same input with `endRedirect: true`) and **Cancel** (sends nothing, entry left as typed).
- **Questions the form asks over itself** share `ConfirmQuestion`, and no unsaved-changes question comes before them: the form calls neither `useDiscardGuard` nor `useLeaveGuard`, since Close saves first ([`modal.md`](modal.md#unsaved-changes)). A removal question runs `onRemove` (`flushSync`, so the card's cleanup commits first), then `afterRemove` once the card has gone, moving focus where the list says, since the pressed × went with its row.
- **On the admin page** `/curator/compendium` opens the form from its address: `?new` an empty form, `?edit=<slug>` the entry (through `resolveCompendiumSlug`). An old address redirects to the entry's current `?edit=`; one naming nothing opens nothing and says so in an alert above the list. The edit's values are built on navigation by `entryValues(entry, session)` (`src/app/entry-values.ts`, `server-only`), so opening sends no browser read (CLAUDE.md rule 1). `compendium-dialog.tsx` draws it through [`CompendiumEntryForm`](#compendium-entry-form) in a `RouteModal` that closes back to the list, with a router of its own: Save Ingredient replaces the address with the saved entry's `?edit=`, Save & Add Another stays on `?new`, a delete and the close replace it with the list's (filter and cursor kept), and each refreshes. A near match opens its own modal over the same list in a new tab. Why: [`ingredients.md`, "The admin compendium page: its size, its modal, its lookups"](../design-decisions/ingredients.md#the-admin-compendium-page-its-size-its-modal-its-lookups).

### Reading another entry in the form

The substitute summary and Quick Look both make one read of the `ingredient` query through `/api/graphql`, which already serves an entry by id in the compendium's tier or a coven's own and the compendium's, never another coven's. Quick Look is not the list's `DetailsDialog` (a route modal its server page fills): it has no route to change, and its answer is cast to the entry page's shape so the head and body are the details modal's own components. With the formal name unknown, a line skeleton stands in its head while the read is out, or nothing after a failed read. It never reads "Not yet looked up", which would say the entry has none.

### Suggestion lists

`CorrespondenceFields` (`IngredientForm/correspondence-fields.tsx`) draws the multi-select and list fields that ingredient, variant and cupboard-entry forms share, labelled from `FIELD_NOUNS`.
`ToggleField`, `MultiSelectField` and `ListField` live in this form, not `../Field` (`SuggestField` is in the Field set); `CupboardEntryForm` imports `ListField` and `MultiSelectField`. Lookups are in "The lookups"; ordering in "The fields and their sections".

### Variant fields and their folds

A variant's fields, adding and removing it, and the folds are in "The variants", "Sections fold" and "Undo and redo".

### Submitting and focusing the first error

`useOnEachSubmit` runs while rendering, once per new `submitCount`, and a save's last update carries its count with every error found, so a fold is open in the same commit that draws its error and the form never paints a closed fold with an error inside. [`FormErrorSummary`](field.md#announcing-errors) is a layout effect, so focus moves to it in that commit; it replaces react-hook-form's `shouldFocusError` (set to `false`), which focuses in registration order and only a registered field. The summary is not drawn while the duplicate warning is open, so Create Anyway keeps the focus. An issue naming a picked category lands on the picker's one error element, named by the pick.

### One error element, two sources

`FieldError` is the one element any field's error renders through, with `aria-invalid` on the control. Resolver issues and the server's `fieldErrors` both reach it through react-hook-form's error state, so a server-only rule draws as a schema rule does. Both go through **`fieldNameOf`**:

| Path                            | Field                                                                 |
| ------------------------------- | --------------------------------------------------------------------- |
| `['name']`                      | `name`                                                                |
| `['folkNames', 2]`              | `folkNames.2.value`, the third entry                                  |
| `['elements', 1]`               | `elements`, the whole control: its chips are not rows                 |
| `['variants', 1, 'formId']`     | `variants.1.form`, the Form box that made the pick                    |
| `['categoryIds', 1]`            | `categoryIds.1`, the second category picked: the picker's             |
| `['references', 1]`             | `references.1.value`, the second reference's row                      |
| `['references', 1, 'locator']`  | `references.1.locator`, its locator                                   |
| `[]` or any path it cannot name | none: the root alert, rather than an unseen error (`drafts` included) |

- **The form's resolver wraps `zodResolver`** and moves an entry's issue (`folkNames.2`) onto the entry's `value`, where `fieldNameOf` puts the server's; an element's issue (a repeat, which a caller can make) arrives at the element (`elements.1`) and is moved onto the field likewise.
- **A list's errors are the list's.** An entry is not a control, so the list has one `FieldError` beneath its box, reading each entry's message after the entry. The named entry takes the error edge and its × lists the message as description; the box takes `aria-invalid` and the same description, so a failed submit focuses it.
- **Rejections are read by the shared `readGraphqlIssues`** (`src/lib/graphql-failure.ts`), not `readGraphqlFailure`, which answers only the first field: the form places every issue at once (a draft's nested path included) through the shared `placeServerIssues`, which sets aside the redirect question's issue for the form to ask. Unplaceable messages join into the root one, each distinct message once. DESIGN.md §7 leaves a `FORBIDDEN` or `NOT_FOUND` to the page; until a wrapper does more it shows as the root alert with the service's message.
- **Announced from either source**: a failed submit moves focus to the first `aria-invalid` control in page order. The root error is a `role="alert"` above the first field, only while there is one.
- **Clearing**: the next submit replaces every error with the resolver's, and editing a field in error revalidates it, clearing a server error as readily as a schema one. A list revalidates on each add and removal once a submit has run, and removing an entry takes its error. The form is `noValidate`.

## Styling

Every button that waits on a request is a `BusyButton` ([`busy-button.md`](busy-button.md)); the alert is an `error` `Notice` ([`notice.md`](notice.md)), never a hand-written `notice` class. Colour is not the only sign of a held save: the duplicate sentence changes with the state. The pencil's `$accent` on a 20% tint clears 3:1 (`tests/scss/tokens.test.ts`). Chips are the [`Combobox`](combobox.md)'s entries: a long entry is cut off with an ellipsis, never wrapped; the full text stays in the DOM, in the ×'s name and in a `role="tooltip"` that opens only on a cut-off entry, closes on Escape (WCAG 1.4.13), waits 150 ms before closing, and breaks unbroken text. Touch opens it from the emulated hover. List entries have no length cap. The form primitives are in `_primitives.scss` ([`styling.md`](../styling.md), "Form fields").

## Stories and tests

The stories (`index.stories.tsx`) answer `/api/graphql` from invented rows through the fake API (`.storybook/mock-api.ts`); the TanStack Query client is the workshop's global provider's, since a second would split the cache. Category fixtures copy `src/db/seed/category-groups.ts` because a component may not import the seed. Vitest lookups are answered by `tests/support/msw/ingredient-lookups.ts`, and debounces are advanced with fake timers, never waited out. Accessibility is asserted in Playwright, not Vitest (CLAUDE.md, Testing); layers follow [`testing/layer-ownership.md`](../testing/layer-ownership.md).

## Compendium entry form

`src/components/CompendiumEntryForm/` is the compendium's ingredient form as both edit dialogs draw it (the admin compendium's `compendium-dialog.tsx` and the compendium branch of the entry page's `entry-dialog.tsx`), so the two are one piece of code. It renders `IngredientForm` with `workspaceId={null}` and `mayPromote` fixed, and turns its `sourcing` prop (the entry's `SourcingScore`, or null; an add has none) into the form's `sourcesIntro`, a [`SourcingScore`](sourcing-score.md) panel. Each dialog passes its own `onSaved`, `onAutosaved`, `onDeleted`, `duplicateHref`, `entryHref` and the rest, as each has its own addresses. A coven's own entry does not use this component.

## Used by

The shell's Add Ingredient dialog and a coven entry's edit dialog (`workspaceId` set); `CompendiumEntryForm` for the admin compendium and entry-page dialogs (`workspaceId: null`); `CupboardEntryForm` imports `ListField` and `MultiSelectField` from it.

## Not here

Navigation after a save (the host), the unsaved-changes guard and modal chrome ([`modal.md`](modal.md)), the autosave mechanism ([`autosave.md`](../autosave.md)), the combobox ([`combobox.md`](combobox.md)), the schemas ([`validation.md`](../validation.md)), and a coven's link between its own ingredient and a compendium entry (out of scope for v1, DESIGN.md §13).
