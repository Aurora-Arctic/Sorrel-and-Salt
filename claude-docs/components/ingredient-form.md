# IngredientForm

`src/components/IngredientForm/` — every property of an ingredient, on
react-hook-form with the Zod resolver (DESIGN.md §14): a coven's new one, or a
compendium entry, new or edited (M5.5). It validates with the shared
`LocalIngredientInput`, or `CompendiumIngredientInput` on the compendium,
before the mutation is sent, sends `createWorkspaceIngredient` or the
compendium mutations, and puts an error from either side beside the field it
names. It is built standalone: the add and edit modals and the admin
compendium page wrap it rather than containing their own form.

| File                     | What it holds                                                                                                                                                                                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.tsx`              | The form: the mutations, the fields in order in their folding sections and which are open, the root alert, where a server error goes, focus after a submit, and an edit's delete and MB.82's question                                                                |
| `fields.tsx`             | `TextField`, `SuggestField`, `SelectField`, `MultiSelectField`, `ListField` and `FieldError`, the element every field's error renders through, with each hint behind an `InfoTip`                                                                                    |
| `suggestions.tsx`        | The lookups (M5.10a, MB.131): the queries, `useLookup`, which debounces each, the shapes, and `FormField` and `LookupListField`, which wire one to its field                                                                                                         |
| `duplicates.tsx`         | The duplicate warning (M5.10): its query, `useDuplicateWarning`, and `NameField`, the name field with the warning beneath it                                                                                                                                         |
| `references.tsx`         | The References field (MB.154): its search's query, and `ReferencesField`, the box ending in New Reference, the one-line rows beneath, their edit and remove, and their locators                                                                                      |
| `categories.tsx`         | The Categories field (MB.126): its query, and `CategoryField`, which holds [`CategoryPicker`](category-picker.md) on `categoryIds` and names a pick's error by its chip                                                                                              |
| `reference-panel.tsx`    | The new reference panel (MB.154): `createReference`, each kind's fields, `toReferenceInput`, and its own react-hook-form                                                                                                                                             |
| `variants.tsx`           | The Variants section (MB.221): `VariantsField`, the New Form box that adds a form, each variant's summary line and the fields that form adds, `variantSummary`, and `useVariantFolds`, which of each variant's sections are open                                     |
| `copy.tsx`               | A variant's Copy From Ingredient (MB.115): `CopyFromIngredient`, and what each field takes from the ingredient's                                                                                                                                                     |
| `summaries.tsx`          | `SectionSummary`, the one line a closed section reads, each section's watching its own fields, and `variantSectionSummary`, a variant's section's line                                                                                                               |
| `icons.tsx`              | The rows' icons: `EditIcon` (IconTip's pencil, re-exported), `RemoveIcon`, and Edit Source's `SourceEditIcon`                                                                                                                                                        |
| `substitute-forms.tsx`   | `SubstituteForms`, the ingredient's own substitute list's second pickers: which form of each linked ingredient a substitute names                                                                                                                                    |
| `substitute-summary.tsx` | A linked substitute's summary (MB.115): its query, `SubstituteSummary`, `substituteSummary`, which a list's chip opens, and `EntryHrefContext`, which carries `entryHref` to it                                                                                      |
| `values.ts`              | The empty values and `EMPTY_VARIANT`, `toInput`, `draftOf`, `addEntry`, `commitDraft`, `repeatedForm`, `rankForForm`, `formRows`, `fieldNameOf`, `SECTION_KEYS`, `sectionsWithErrors` and their variant forms, and the two resolvers, a coven's and the compendium's |
| `options.ts`             | The closed sets' choices, `NOMENCLATURE_OPTIONS` and `ELEMENT_OPTIONS`, which the admin compendium filter shares                                                                                                                                                     |
| `types.ts`               | The props, the form's own values, and the input it sends                                                                                                                                                                                                             |

## The props contract

The props are a union on `workspaceId` (`IngredientFormProps`, `types.ts`):
a coven's id writes to that coven — a new ingredient, or the coven's own
`entry` given, saved over itself through `updateIngredient` (M8.17) — and
`null` writes the compendium — a new entry, or the `entry` given. Either
tier's edit offers Delete Ingredient (the coven's since M8.17, moved from
M9.10 on the owner's call, 2026-10-19). The coven's edit draws it in its
foot, as the compendium's does, as the bin icon (`BinButton`, named and tipped "Delete Ingredient") at the far end in `FormActions`' `aside` ([`ingredient-entry.md`](ingredient-entry.md), "Edit").

| Prop            | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `workspaceId`   | The coven the new ingredient is written to, as `createWorkspaceIngredient`'s argument; or `null` for the compendium, which every lookup then asks about alone (["On the compendium"](#on-the-compendium)).                                                                                                                                                                                                                                                                                 |
| `workspaceName` | With a coven's id only: the coven's name, said in "Added to <coven>." after the duplicate warning's + adds an entry. Left out, the sentence says "My Ingredients".                                                                                                                                                                                                                                                                                                                         |
| `entry`         | The entry to edit, `{ id, values }`, its values in the form's own shape, `IngredientFormValues`: a compendium entry with a null `workspaceId`, or the coven's own with a coven's id (M8.17). Left out, the form creates.                                                                                                                                                                                                                                                                   |
| `onSaved`       | Called with the saved row (`id`, `name`, `slug`, and for a coven’s new ingredient `stock`, the jars it holds, each with its form, quantity and unit, which is always empty since M12.27 stopped a save moving jars; a compendium save carries none) once the server has accepted it, and which save was pressed: `'open'`, Save Ingredient, for the page to open the ingredient, or `'another'`, Save & Add Another, after which the form clears (MB.131). An edit's one save is `'open'`. |
| `onDeleted`     | Called once the `entry` given has been deleted, from the compendium or, with a coven's id, from that coven.                                                                                                                                                                                                                                                                                                                                                                                |
| `onCancel`      | Given, a quiet Cancel follows the saves (the coven's Add and Edit Ingredient dialogs and the public route's edit leave it out, so their only ways out are Close, Escape and a click outside), and calls it: the page holding the form closes it. With unsaved changes Cancel asks first, and calls it on Discard Changes (["On the compendium"](#on-the-compendium), "Unsaved changes").                                                                                                   |
| `duplicateHref` | Required. Where the duplicate warning links a near match: the admin's compendium page opens its modal, the shell's add button goes to the coven's ingredient page, `/coven/[slug]/ingredients/[id]` (["The duplicate warning"](#the-duplicate-warning)).                                                                                                                                                                                                                                   |
| `quickLookOf`   | Given, each near match in the duplicate warning offers its Quick Look, opening the details `{ href, heading }` it names over the form ("Quick Look in the warning", under ["The duplicate warning"](#the-duplicate-warning)). The admin compendium's form passes it; the public search's and the coven's leave it out.                                                                                                                                                                     |
| `entryHref`     | Where a linked substitute's summary links its ingredient, given `{ slug, isGlobal }`, opened in a new tab; `undefined` for one with no page. Left out, a summary links nothing (MB.115; ["A linked substitute's summary"](#a-linked-substitutes-summary)).                                                                                                                                                                                                                                 |
| `mayPromote`    | Whether the saved folk names offer to become the display name. Left false, the arrow is absent. The compendium's edit mounts pass true, and a coven's edit when the member's role may promote (M8.17). It shows only on an edit, and only on a folk name the server has saved (one with an id).                                                                                                                                                                                            |

## The fields

Name, classification, formal name, folk names, description, element,
celestial bodies, zodiac signs, colours, deities, substitute ingredients, categories,
safety notes, the toxic flag and references, then the variants, each a form with its own
description, safety notes, toxic flag, elements, celestial bodies, zodiac signs, colours,
categories, substitutes and references — every field `IngredientInput`
takes (["The variants"](#the-variants)). The ingredient has no form of its
own: its forms are its variants (MB.222).

**The fields run in six titled sections** (MB.115, the owner's call, once
the form read as one long column): Identity (name, classification, formal
name, folk names), Details & Care (description, then safety notes; the
owner's call, 2026-10-12; then the Toxic toggle, M11.21), Correspondences (element, celestial bodies, zodiac
signs, colours, deities), Relations (categories, substitute ingredients),
Sources (references) and Variants. The sections cut
the order the fields already ran in, bar one move on the owner's call:
Categories leads Relations, ahead of the substitutes, where MB.126 had put
it after the lists. Each is a `<section>` under a small `h3`,
the dialog's title being the `h2`; it has no accessible name, so it is no
landmark, and a screen reader moves by the headings. Each folds to one line
of what it holds ([Sections](#sections)). Inside the Variants section, a
fieldset named by its heading holds the New Form box and the cards, so the
group keeps its name. In Details & Care both labels are visible,
Description's and Safety Notes', since the heading names the section, not
either field.
**An open variant's fields run in the same sections** (MB.115, the owner's
call), in the same order and under the same names as far as a form's fields
go: Identity (its form), Details & Care (description, safety notes, then its
own Toxic toggle),
Correspondences (element, celestial bodies,
zodiac signs, colours), Relations (categories, substitute ingredients)
and Sources (references). Their headings are `h4`s,
a level beneath the Variants `h3`, and each folds as the ingredient's do
(["Sections"](#sections)).

**Every field shows a short action while it is empty**, and what it is for,
where its label does not say it, sits in its hint (the owner's call at MB.115's review; [`field.md`](field.md),
"Contracts"): "Add a name", "Add formal name", "Add a folk name", "What it is, where it comes from and how it is used" on the Description, "Add an element", "Add a body", "Add a sign", "Add a colour", "Add a deity", "Add a category", "Add a substitute", "Add safety notes", "Search references" and
"Add a locator", a variant's Form "Add a form" and Description "What sets this form apart", and the new reference
panel's fields "Add a title", "Name the book" and so on, or an example
where the format matters ("2nd ed."; ["The new reference panel"](#the-new-reference-panel)). `SuggestField`,
`ListField` (and so `LookupListField`) and `CategoryPicker` take
`placeholder` for it, and a reference field's spec carries its own. A date
field shows none: the browser draws its own format there.

- **Name is the one field always required**, as story 29's stub needs, and
  says so twice: `aria-required` on the control for a screen reader, and a
  red asterisk hard against the label for the eye, "Name\*", in the error
  red. The asterisk is `aria-hidden`, so the field's name stays "Name"
  rather than "Name star" and the requirement is not heard twice.
  `aria-required` rather than `required`, whose `:invalid` would mark the
  empty field before anyone had tried to save.
- **The formal name is marked required while a named kind is chosen**, the
  coupling's first half shown before a save rather than after it. The
  classification is not marked by a typed formal name, since a name with no
  kind saves as `unknown` (MB.161), and under Unknown the formal name is
  optional. The mark comes and goes with the value, and the schema's message
  still refuses a save that ignores it.

- **A field's hint is an info tip beside its label**, [`InfoTip`](info-tip.md),
  not a line beneath it, kept only where the label cannot carry a rule, a
  flow or a format with a trap ([`info-tip.md`](info-tip.md), "When a field
  gets a tip", the owner's call, 2026-10-20): classification (what Unknown and
  None mean), colours (each is a correspondence, not the colour the thing
  is), the Variants list, References and a reference's locator. The rest,
  which restated their labels, went: name, formal name, form, folk names,
  celestial bodies, zodiac signs, deities, substitute ingredients, categories,
  safety notes and both Toxic toggles.
  How a tip opens and is read is [`info-tip.md`](info-tip.md#behaviour). A field's `note` is the one line kept beneath a label, for a state
  that must stay in view: only the formal name's reason for being shut uses
  it.
- **Closed sets are the combobox's select-only box**, `ComboboxSelect`
  ([`combobox.md`](combobox.md), "The select-only box"), the owner's call
  during MB.131: the same control, chevron and list as the form field, with
  nothing to type. `SelectField` holds it through `useController`, its
  `deps` in the controller's rules. The classification is over
  `NOMENCLATURE_KINDS`, read from `schema/ingredient-enums.ts`, so the
  options cannot drift from the schema. It starts with the value `''`,
  shown as a placeholder, "Choose a classification", which is not in its
  list, so it cannot be chosen back once a kind is picked. It has no need to
  be, since "None" is itself a kind. A choice is made before the field
  revalidates, so choosing None empties the formal name first.
- **The element is a list on the same box** (MB.159), since an ingredient
  holds several, in the order chosen: `MultiSelectField`, on the combobox's
  multi-select box, `ComboboxMultiSelect` ([`combobox.md`](combobox.md),
  "The multi-select box"), over `INGREDIENT_ELEMENTS`. Each element chosen
  is a chip inside the control with its ×, "Remove Air", and a "Clear
  Element" and the chevron sit on the control's right, as a list field's
  do; but nothing is typed and there is no Add, and the list offers only the
  elements not yet chosen, so none can be chosen twice (the box's own
  behaviour, [`combobox.md`](combobox.md)). None chosen is
  the answer "none", so there is no None to choose: the box shows the
  placeholder "Add an element". It is a field, labelled by its `<label>`
  and erring through its one error element, rather than a list's fieldset:
  its values are the enum's strings, `elements: IngredientElement[]`, not a
  `useFieldArray` of entry rows, so it is not one of `LIST_FIELDS`.
- **"Classification" is the label for `nomenclature`**, which DESIGN.md §5
  calls the naming system the formal name belongs to. The label is the one a
  practitioner reads (amethyst is mineral, lavender botanical), and the
  schema's messages use the same word.
- **A variant's `form` is a single free-text field that suggests** (M5.10a), as the
  schema takes it: a `SuggestField`, the [`Combobox`](combobox.md) over
  `useController`, so a pick fills the field with the suggestion's value. A
  pick of a curated form links its row as well, and the box shows the row's
  group beside the text until the text is edited (MB.169). See "The form's
  pick".
- **Celestial Bodies, zodiac signs and colours are list fields** (MB.136), as DESIGN.md
  §5 gives an ingredient several of each, labelled "Celestial Bodies", "Zodiac Signs"
  and "Colours" with boxes "Celestial Body", "Zodiac Sign" and "Colour". Every list
  field's box is the `Combobox` (M5.10a); folk names have their lookup, MB.131
  gave celestial bodies, signs, deities and substitutes theirs, and colours take none,
  the owner's call.
- **The six lists are one combobox each, with the entries inside it.** Typing
  and pressing Add, or Enter with no suggestion highlighted, adds the text as
  an entry, trimmed, and empties the box, as does picking a suggestion. A
  blank box adds nothing. The entries sit inside the control as the
  combobox draws them ([`combobox.md`](combobox.md)), each × labelled
  "Remove Hedge Fixture" rather than a bare "Remove". A
  "Clear Folk Names" control on the control's right empties the list while it
  holds entries, beside the chevron a box with a source has. The box is
  labelled by the singular, "Folk Name", since the legend names the group, and
  its button is named "Add Folk Name"; Add stays, the task's own criterion,
  though Enter does the same. Entries are a `useFieldArray` of `{ value }`
  objects, since react-hook-form refuses an array of bare strings. What sits
  in a box is the form's own `drafts`, held through `useController` so the
  combobox can be told its text, which `toInput` leaves out. A list's info
  tip sits in its legend, so the fieldset is named by the legend's text
  alone, through `aria-labelledby`: the tip's button would otherwise join the
  group's name, "Folk Names About Folk Names". `substitutes` is labelled
  "Substitute Ingredients", its box "Substitute Ingredient". A substitute
  entry is typed text, or a link to an ingredient (MB.140): `{ value, link }`,
  `value` the ingredient's label and `link` its id, formal name, `forms` (the
  forms it comes in, `[]` for none), description and tier. A linked
  entry's pill reads as the label with its formal name, "Mugwort (Artemisia
  vulgaris)", and so does its × and any error naming it, since two
  ingredients can share a label; one with no formal name reads as its label.
  A link naming one form of the ingredient adds that form after a dot,
  "Mugwort (Artemisia vulgaris) · Dried leaf" (`entryText`, MB.115), read
  from the values watched, so a form chosen beside the list redraws it.
  What the pill leaves out is its `detail`, from `entryDetail` (MB.164): the
  form of it linked, or "Any form" (the ingredient's own list alone, since a
  variant's link always names a form); and "Compendium entry" or "This coven’s
  entry", as its lookup row said, so two pills reading alike, a compendium
  entry and a coven's copy, are told apart: "Dried leaf · Compendium entry".
  It stays that one short line, the owner's call (MB.115); the description
  and the rest are the summary a linked pill opens. It shows in the pill's tooltip and
  describes its ×, as the combobox's "An entry" sets out; a typed entry has
  none. The pill itself stays as it reads, the owner's call. A linked
  substitute's pill is a button, led by a link mark, that opens a summary of
  its ingredient, and a typed one is plain text read as a name only (MB.115;
  ["A linked substitute's summary"](#a-linked-substitutes-summary)).
  `toInput` sends a link as `{ ingredientId }` and typed text as `{ name }`
  (DESIGN.md §5, `ingredient_substitutes`). A link is made only by picking an
  ingredient from the substitutes' lookup (MB.131); Add, Enter and the typed
  row add typed text, as in every list. A deity entry has the same shape
  (MB.169): `{ value, link }`, `value` the deity's name and `link` its id,
  tradition and description. A linked deity's pill reads "Hecate (Greek)",
  the tradition beside the name as its lookup row reads it, and so do its ×
  and any error naming it, so Greek and Roman Hecate are two pills that read
  differently; its `detail` is its description. `toInput` sends a link as
  `{ deityId }` and typed text as `{ name }`, the two halves of MB.167's
  `IngredientDeityInput`.
- **A list's suggestions span the field**, its box and its Add together, as
  the combobox's `listAnchor`, and never run off the screen: they open above
  the box when there is more room there (MB.154; [`combobox.md`](combobox.md),
  "Where the list opens").
- **Text left in a box stops the save.** The form's resolver adds an error to
  any box still holding text, 'Press Add to keep "Hedge Fixture", or clear
  the box', on the list's error element, so a save never sends a list the
  user thinks holds an entry it does not. The schema never sees a box, so the
  rule is the form's own. Adding the text or clearing the box clears it.
- **A repeat is refused at the box** (MB.174), the owner's call: the schema
  refuses one only at save, so the form refuses it as it is added. Add, or
  Enter with nothing highlighted, on text repeating a listed entry adds
  nothing: the box keeps the text, to be put right, and the list's one
  error element reads `"Mars" is already listed` — a folk name repeating
  the name reads `"Testwort" is already the name` — where the save's
  refusal would read, the owner's call over an announcement alone. The
  box takes `aria-invalid` and the message as its description, the changes
  region announces it, and the focus stays in the box. The error is the
  box's, `drafts.<list>` with type `repeat`, set by `setError`; changing
  the text, or adding anything, clears it. What is a repeat is
  `repeatOf` in `values.ts`, on the schema's keys: text trimmed and
  case-folded, for every list; a deity or substitute link by its id; and a
  typed deity or substitute among the typed entries alone, so "Hecate"
  typed beside a linked Greek Hecate is added, as at save. Colours, with no
  lookup, refuse a repeat the same way. The schema stays the backstop for an
  API caller, its refusals and their tests unchanged.
- **Each add, removal and clear is announced.** A list keeps a visually hidden
  `<output>`, a status region by its role, named "Folk Names changes" to tell
  it from the box's own "Folk Name suggestions" region, which reads "Added
  Hedge Fixture", "Removed Hedge Fixture" or "Cleared Folk Names". Otherwise a
  screen reader hears the box empty, or an entry go, and nothing about what
  happened (WCAG 4.1.3).
- **Celestial Bodies, zodiac signs, colours and deities move** (MB.170). Each keeps
  the order entered (DESIGN.md §5), so its `ListField` takes `ordered` and
  draws its chips as the combobox's sortable list
  ([`combobox.md`](combobox.md), "A sortable list"): each chip moved by its
  grip and text, "Move Venus", dragged by pointer, or lifted with Space or
  Enter, moved a place with Left and Right, a row with Up and Down, or to either
  end with Home and End, and put down again, each step said and the
  focus kept on the moved chip. A move is the field array's `move`, keyed by
  its `id`, so a picked deity's link travels with its pill, and so does an
  error naming the entry, which the field array moves with it; once a submit
  has shown errors, the list revalidates, as an add does. The list's own
  "changes" region is left to adds, removals and clears, since the sortable
  list says each move itself. Folk names and substitutes read alphabetically
  (DESIGN.md §5), so their chips have no handle.

### Sections

**The ingredient's six sections fold** (MB.115, the owner's calls on the
collapsible-sections proposal), so an edit reads at a glance and opens only
where the change is. Each is a `CollapsibleSection` at `h3`
([`collapsible-section.md`](collapsible-section.md)): its heading is the
toggle, a muted line says what a closed one holds, and its fields stay in the
page while closed. The Variants section's ⓘ is its `info`.

- **Closed, a muted line says what it holds.** `SectionSummary` (`summaries.tsx`)
  draws it, each section's watching its own fields, so a keystroke redraws one
  line, not the form. A list of one is named and a longer one counted
  ("Mercury · 2 colours"); categories are always counted; the forms are
  always named ("2 forms: Dried leaf, Whole root", an empty Form box as
  "Unnamed Form", as its card names it); Details & Care reads the
  description's first words, then the safety notes', then "Toxic" when the
  flag is on, joined by a middle dot
  (`detailsLine`, `summaries.tsx`), cut by the line's ellipsis; Identity reads the name, the
  classification and the formal name in italics; Relations says both its
  lists once either has an entry ("1 category · No substitutes"); an empty
  section says "Nothing yet".
- **Several open at once, each on its own.** A new entry opens with every
  section open, the long form it is, and so does the form Save & Add Another
  clears; an edit opens with every one closed.
- **Open All / Close All**, a small quiet button under the modal's ×,
  level with the foot of its heading, or under the heading on a phone (the
  owner's call; [`Modal`](modal.md),
  "A control in the header"), or at the end of the line above the first section
  where the form is in no modal, reads Close All while any section is open and Open All
  once every one is closed. A press from any mix therefore folds the form to
  its summary lines, the view the sections are for, and a new entry, all
  open, offers Close All at once.
- **Validation runs on leaving a field, and on each change once a field is in error** (`mode: 'onTouched'`, `reValidateMode: 'onChange'`; story 31, M8.16), as well as on submit; but an error is _shown_ only after a submit, or on a field the person has both left (`touchedFields`) and edited at some point since the form started (`useEditedFields`; typing a name and deleting it still counts, which `dirtyFields` would not, and `clear()` runs beside each `reset`). The rule lives once, in `errorShown` beside `useField` (`src/components/Field/use-field.ts`), and the section flags read it too, so a section is never flagged for an error no field in it draws. So a required field typed into and left empty is flagged as the person moves on, while one merely passed through, or flagged only by another field's change (a classification pick raising the formal-name rule), stays quiet until it is edited and left itself or a submit. The error is the same element the submit sets, linked by `aria-describedby`. The check is asynchronous, so a test that moves the focus settles before it ends. Both tiers get it, the form being shared.
- **Save opens every section holding an error**, the schema's or the
  server's, and the focus moves to the first field marked invalid as before.
  `sectionsWithErrors` (`values.ts`) finds them by each error's first key, a
  box's draft by its list; a save held on the duplicate warning counts as
  Identity's. A submit's last update carries its count with every error, so
  the form opens them while rendering, in the very commit that draws the
  errors, which is when the focus effect runs. A section holding an error is
  flagged beneath its heading, "Has an error to fix", open or closed, and its
  top hairline takes the error red.
- **The questions are the actions'**: Delete, MB.82's redirect and the
  discard guard replace the saves beneath the sections, so they work whatever
  is closed.

**A variant's sections fold too** (MB.115, the owner's ask: "The sections
of the Variants should also collapse"). Inside an open variant card, its five
`h4` sections are the same `CollapsibleSection` at `level={4}`: a heading
button with a chevron, a muted line while closed, the error flag, the fields
kept in the page while hidden. The card keeps its own disclosure, one open
at a time, around them (["The variants"](#the-variants)).

- **What opens.** A variant added in this session, from the New Form box,
  opens with every section open, as a new entry does; one an edit opened
  with opens, by its pencil, with every section closed, as an edit does.
  Each variant keeps what was opened in it while its card is closed and
  opened again.
- **Its closed lines** read as the ingredient's sections of the same name
  do, through the same functions in `summaries.tsx`, from the variant's own
  values (`variantSectionSummary`): Correspondences without deities, which
  are the ingredient's alone, and Identity its form with the group after it,
  "Dried leaf (Plant part)", as the card's own line reads it.
- **Where the state lives.** The form holds it beside its own sections',
  through `useVariantFolds` (`variants.tsx`): a list by each variant's
  place, kept in step as the New Form box adds a variant first and Remove
  takes one out, a place past the list's end reading every section closed.
  The form holds it, not each card, so that Save and Open All / Close All
  reach it.
- **Save** opens, in every variant holding an error, each of its sections
  holding one, the schema's or the server's, as it opens the ingredient's:
  `variantsWithErrors` (`values.ts`) reads each from `errors.variants`, by
  the first key beneath the variant, its Form and its kept `id` Identity's.
  With the card the save opens, that puts the first field marked invalid in
  view, in the commit that draws it, so the focus lands. A variant's
  substitute link naming no form opens its Relations.
- **Open All / Close All** reaches every variant's sections too: Open All
  opens all five of each, Close All closes them. It opens and closes no card.
  Its label is unchanged, Close All while any section is open: a variant's
  sections are in view only while Variants is open, which already reads
  Close All, so a section open inside a card the Variants section hides
  never keeps it reading Close All.
- **Copy From Ingredient** is an icon-only button (two sheets, tip "Copy From Ingredient", the owner's call, 2026-10-19) on the shared `.field__label-action` primitive, at the right end of its field's label row, so it is
  hidden with its section and pressed once the section is open. The
  skipped notice stays in the page with the list, so it outlasts its
  section closing and opening; what a copy adds shows on the closed line.

### The lookups

Six boxes suggest, through `/api/graphql` with TanStack Query
([`graphql/client.md`](../graphql/client.md)): the form and folk names from
M4.7a's `formSuggestions` and `commonNameSuggestions` (M5.10a), and the
celestial bodies, zodiac signs, deities and substitutes from `celestialBodySuggestions`,
`zodiacSuggestions`, `deitySuggestions` and `ingredientSuggestions`
(MB.131). Colours take none. `suggestions.tsx` holds them all, on one hook,
`useLookup`, and a shape per source: each debounces the box's text through
`useDebouncedValue` (300ms, `src/lib/debounce.ts`), asks for ten rows under
its scope — the form's `workspaceId`, null on the compendium, or nothing for
the compendium's own search — keeps the last answer on screen while the next is
fetched, and never throws: a lookup that fails offers nothing. Neither asks
until its box has been focused, so opening the form sends no request; the
first ask is for a blank query, the vocabulary and the names in use, which the
chevron then opens. `FormField` and `FolkNamesField` watch their box's text
with `useWatch` and hand each field its `Suggestions`, so the fields in
`fields.tsx` know nothing of the network. `LookupListField` is every
suggesting list, given its lookup hook as `useSuggestions`; the colours are
a plain `ListField`.

A form suggestion's row is "Wax (Animal)", the group beside the value so two
same-named forms are told apart (M4.2a), with a second line of the curated
row's description and "Used by Testwort (Fixtura testalis), Mockleaf", the
claimants by label and formal name; a claimant with no formal name shows by
its label. Curated rows and rows in use sit under "From Compendium" and "From Coven"
headings. A common-name row is the value and its claimants, in one bucket,
since no vocabulary of common names exists. Each list opens with "Use what you typed: rhizome", the owner's call over the issue's "ends in". Picking a form row writes its value into the field, and
picking a common name adds it as an entry. A curated form's row carries the
row's `id` (MB.167) as its `link`, so picking it links the form as well
("The form's pick", below). A form only in use has no row, so picking it
links nothing, and neither does picking a common name. Free text outside the
vocabulary saves with no warning, as M4.5's schema asks.

A celestial body or sign row is the value, with the curated row's description as its
second line, under "From Compendium" and "From Coven" as a form's are. The headings
say where a value comes from, the owner's call: a curated value is the
admin's list, which compendium entries are held to, and a value only in use
outside it is this coven's. A deity row is
"Hecate (Greek)", the tradition beside the value as a form's group is
(MB.130), so two same-named deities are told apart; one in use has no
tradition. Picking a celestial body or a sign adds its value as an entry. Picking a
curated deity adds its value linked to the deity through the row's `id`,
reading "Hecate (Greek)" (MB.169). A deity only in use has no row, so it adds
its value as typed text.
On the compendium the form, celestial body, sign and deity boxes are pick-only,
since the compendium services refuse any other value beside its field
(MB.162; [`validation.md`](../validation.md), "The two ingredient
variants"); ["On the compendium"](#on-the-compendium) says how.

A substitute row is the ingredient's label and formal name, "Mockwort
(Fixtura vulgaris)", and a second line saying whose it is, "Compendium entry"
or "This coven’s entry". The rows are the search's two groups (M12.19), under the headings
"Your Ingredients", the coven's cupboard, then "Compendium", each in the
search's order, best match first; the heading comes from the edge's `group`,
and a form ranking never lifts a compendium row above a cupboard one. A held
entry reads under the label the coven gave it. Each
row carries its ingredient's id as its key, since a compendium entry and a
coven's copy of it can read alike, both offered since a name match hides nothing (M12.28), and as
its `link`: picking one adds an entry linked to that ingredient, reading as
the label and formal name, its tooltip telling its form and tier
(MB.164; MB.115), and sent as `{ ingredientId }`. The lookup asks for
each ingredient's `description`, which the link still carries though no
tooltip shows it since MB.115, and its forms through `variants`, which the
tooltip and the ranking read; the row shows neither. The typed row,
Add and Enter add the text as it stands, sent as `{ name }` with no warning.
**A lookup leaves out what its list holds** (MB.174), as the Element
multi-select and the References search do, through the same `repeatOf`:
a celestial body, sign or folk name by its text folded, a folk-name lookup leaving
out the ingredient's name too; a curated deity by its id, so Greek Hecate
listed still offers Roman, and a deity only in use by its text against the
typed deities; and an ingredient by its id, so the compendium's Mockwort is
still offered beside the coven's copy. The filter is `ListField`'s, over
whatever `suggestions` it is given, so every lookup shares it, and "Use
what you typed" is not offered for text the list would refuse (the
combobox's `offerTyped`). A pick is therefore never a repeat, and only Add
and Enter refuse one.

A compendium entry's substitutes may link only the compendium, so on the
compendium the box reads `compendium(query)` in their place,
`useCompendiumSubstitutes`, each row a compendium entry with its forms,
joined, as its note, and leaves out the entry being edited, since nothing is its own
substitute.

### A linked substitute's summary

The owner's ask at MB.115: a substitute that links an ingredient must be
told from one that is only typed text, and must open a summary of what it
links. In both substitute lists, the ingredient's and each variant's:

- **A linked chip is a button; a typed one is text.** The linked chip's
  text is a button led by a link mark (two chain links) in the accent, the
  text in the body ink with no underline at rest (underlined while its summary
  is open), and the accent's hover on both when pointed at. A typed chip has
  no mark and nothing to press
  but its ×. So the two differ by shape, not by colour alone. A screen
  reader hears the linked one as a button, named by its text, that opens a
  dialog and says whether it is open (`aria-haspopup`, `aria-expanded`),
  described by the chip's detail, "Dried leaf · Compendium entry"; it hears
  the typed one as its text followed by "(name only)", a visually hidden
  `note` (`NAME_ONLY`). Each × keeps its name, "Remove Mockwort (Fixtura
  vulgaris)". Which lists these are is `holdsSubstitutes` in `values.ts`.
- **Pressing the button opens a small panel beneath the chip**, a non-modal
  `<dialog>` named "About" and the chip's text. It is
  [`Combobox`](combobox.md)'s, "A linked entry's summary": it shuts on a
  second press, on Escape, on a press anywhere else, and when the focus
  leaves it; Escape hands the focus back to the chip and is cancelled, so
  the compendium's modal around the form does not take it as its own
  cancel and ask about unsaved changes.
- **What it shows** (`SubstituteSummary`, `substitute-summary.tsx`): the
  ingredient's name and formal name, its description cut to three lines
  with an ellipsis on screen (`line-clamp`) and read whole by a screen
  reader, the owner's call, then its Classification, the Form the
  entry names when it names one, its Elements, Celestial Bodies, Zodiac Signs and
  Colours, each left out when empty, and whose entry it is, "Compendium
  entry" or "This coven’s entry". With a form named, each list is the
  ingredient's and the form's together, since a form adds to its ingredient
  and never takes away (MB.215).
- **It is read when the panel opens, and not before**, so a list of chips
  asks nothing until one is opened: the `IngredientSummary` document runs
  the existing `ingredient(id, workspaceId)` query through `/api/graphql`,
  with the coven the lookups ask about, or none on the compendium. That
  query already reads an entry by id in the compendium's tier, or a coven's
  own and the compendium's, and never another coven's, so no new query was
  needed. TanStack Query keeps the answer, so a second opening is instant.
  While it reads, the panel shows a one-line skeleton at a tip's width
  (`entry-summary__loading`), since a panel sized to its content would
  otherwise collapse around it; a failed read shows the server's
  sentence, or the generic one, as an alert, with Try Again.
- **It links the entry's page where the form is given one** (`entryHref`),
  in a new tab, so the form and its unsaved changes stay where they are. The
  admin's compendium page gives the entry's own modal,
  `/admin/compendium?edit=<slug>`. The shell's add button gives the public
  compendium's entry page, `/compendium/ingredients/[slug]`, for a compendium
  substitute and nothing for a coven's own, since the summary is given a slug
  and not an id and a coven's page is addressed by id.

### The categories

After the lists (MB.126; story 30): every live category, picked from one
box as a deity is, the rows under their groups and each pick a chip inside
the control in its group's colour — the owner's call, over a wall of grouped
chips ([`design-decisions/mb.126-categories-on-the-combobox.md`](../design-decisions/mb.126-categories-on-the-combobox.md)).
The box is [`CategoryPicker`](category-picker.md), which M8.11 reuses as
its filter and so knows nothing of this form. `CategoryField` in
`categories.tsx` is what ties it here: it reads the public `categories`
query, `PickerCategories`, as the form opens, and holds the picker on
`categoryIds` through `useController`.

- **One page holds them all.** The query asks for `first: 100`, the hard
  maximum, written out because `lib/pagination.ts` is the server's; rule 8's
  cursor still pages it, and some sixty categories fit one page. Each comes
  with its group's id, name and colour pair, so a group an admin adds is a
  heading and a colour without a deploy. The box narrows them itself: with
  every category in hand there is nothing to ask the server as the text
  changes, so unlike the lookups it waits on no debounce.
- **Read once, not as typed.** Unlike the lookups it asks without waiting
  for a focus: the picks are the field, and an edit's arrive before anyone
  types. While it loads the box says it is looking, and a read that fails
  says "The categories could not be loaded." beneath the box and takes
  nothing else down: the form still saves, with no categories.
- **Nothing typed is a category.** There is no Add and no "Use what you
  typed" row; Enter with nothing highlighted adds only the one category the
  text names whole. A category is a pick, on or off, so a repeat cannot be
  sent, and the schema refuses none.
- **A pick's error names it**, as a list entry's does. An issue at
  `['categoryIds', i]` is `fieldNameOf`'s `categoryIds.i`, the i-th id
  picked, and the picker's one `FieldError` reads it after the category's
  name: "Fixture Shield: No such category". The box takes `aria-invalid`
  and the message as its description, so the submit's focus lands on it,
  and the entry named is edged, its x reading the message.
- **Changing the picks revalidates**, as an edit to a field does:
  react-hook-form's `reValidateMode`, since the controller's change is the
  field's. Save & Add Another's reset empties them with the rest.

### The references

The last field, as a bibliography is (MB.154; DESIGN.md §5, "References"):
the sources what the entry says comes from, each picked from the ones
already recorded or written new in the panel beneath. `ReferencesField` in
`references.tsx` is a fieldset named "References", with its info tip in the
legend as a list's is.

- **One box searches, and never adds what was typed.** It is the
  [`Combobox`](combobox.md), labelled "Reference", over
  `referenceSuggestions` through `useLookup`, debounced and asking nothing
  until the box is focused, as every lookup. A row is the source's plain
  `citation`, with "Compendium source" or "This coven’s source" as its
  note, in the search's ranked order, so the tier is a note rather than a
  heading. A source already listed is not offered again. Typed text is a
  search and never a source, so the list has no "Use what you typed" row:
  its last row is "New Reference", the combobox's create row
  ([`combobox.md`](combobox.md), "The create row"), which opens the panel.
  It replaced MB.154's first row, "Add a reference", and the New Reference
  button that stood beside the box where a list has Add (MB.115, the owner's
  call, the field having read as busy): one control both finds a source and
  makes one, the sources found first, since a source is far more often
  picked than written. Enter with nothing highlighted does nothing but close
  the list, and never reaches the form.
- **Each source picked is a one-line row beneath the box, not a chip inside
  it**: the source's Chicago short form, "Fixture, _Testwort Herbal_", its
  italics real `<i>` markup, then its locator in the muted ink if it has
  one, the short form taking the comma before it, "p. 112", then two icon
  buttons, an edit (a pencil, in `$accent` as a variant's is) named "Edit"
  and the short form, and a remove (×) named "Remove" and the short form
  (MB.115, the owner's calls). The
  short form is `renderShortCitation`'s
  ([`db/references.md`](../db/references.md), "The short form"), from the
  four fields each row's `link` carries; a row too narrow for it is cut with
  an ellipsis by the stylesheet. The whole citation is each button's
  description, through a hidden element holding it, and the pointer's
  tooltip (`title`), so a screen reader still has it whole. The add and
  removal announcements and an error naming the row use the short form.
- **A source just added opens at once**, its Locator focused, picked or
  saved through the panel alike, since a page is what it most often needs
  next (MB.115, the owner's call); the box empties but no longer keeps the
  focus.
- **The edit opens the row**, `aria-expanded` and controlling what it opens:
  the citation whole, wrapping and broken anywhere so an address never runs
  the page sideways at 320px; its tier beneath; and a "Locator" box, focused
  as the row opens, described by the citation so a column of them is told
  apart, with an info tip beside its label saying what a locator is and
  that every place the source is cited at goes in the one box, "pp. 12–19,
  40; chap. 3" — a source is listed once, the owner's call — and tidied as
  it is left, `formatLocator`, its ranges dashed. One row is open at a time,
  and the edit pressed again closes it. A row whose locator is in error
  stays open whatever was pressed, so the focus after a save can reach the
  box. The × asks before it removes the row, and once removed the box takes
  the focus ([Removing a variant or a reference](#removing-a-variant-or-a-reference)).
  Unlike the chip lists, Backspace and Delete in the empty box take no row,
  asked or not (the owner's call, 2026-10-16). Each add and removal is
  announced in a "References changes" region. The rows
  keep the order picked: the service reads them back alphabetical by
  citation (MB.153), so nothing here moves them. Beside the tier, an open
  row whose source the form may change has **Edit Source**, which edits the
  source itself ([Editing a source](#editing-a-source)).
- **Entries are a `useFieldArray` of `{ value, link, locator }`**: `value`
  the citation, which describes the row and is never sent, `link` the
  source's id and tier and the four fields its short form is made of —
  `kind`, `authors`, `title`, `container` — which `referenceSuggestions`,
  `createReference` and the compendium entry's values (`entry-values.ts`)
  each read beside the citation, and `locator` as typed. They are not one of `LIST_FIELDS`, which are
  free text. The box's text is `drafts.references`, and whether the panel is
  open is `referencePanelOpen`, both the form's own.
- **A search left in the box stops the save**, as text left in any list's
  box does: 'Pick a source for "grimm", or clear the box'. **So does an open
  panel**, new or editing: "Save the source, or cancel it". Both are the resolver's,
  on the field's one error element, through the box.

### The new reference panel

A source not yet recorded is written without leaving the ingredient:
`ReferencePanel`, in `reference-panel.tsx`, opens inline beneath the field,
the owner's call over a dialog, since M8.16 puts the whole form in a modal
and a dialog there would stack two. It is a fieldset named "New Reference",
not a `<form>`, which cannot nest in the ingredient's, running a
react-hook-form of its own under its own `FormProvider`, so its fields are
the form's own `TextField` and `SelectField`, which take whichever form
provides them, and its errors render through `FieldError`.

- **Kind first**, a `SelectField` over `REFERENCE_KINDS` read as Book,
  Chapter in a Book, Journal Article, Reference-Work Entry and Web Page,
  and focused as the panel opens. No other field shows until a kind is
  chosen.
- **Then only the fields that kind needs**, in the order its citation
  prints them: `FIELDS_OF`, read off what `renderCitation` prints for each
  kind (`src/lib/citation.ts`), so the panel offers nothing the citation
  would drop. The title and the container take each kind's own label —
  "Chapter Title" and "Book", "Article Title" and "Journal", "Entry" and
  "Reference Work", "Page Title" and "Site" — as MB.151 asked. The required
  ones are marked as Name is, an asterisk and `aria-required`: the title
  always, a book's date, a chapter's, article's or entry's container, and a
  web page's address and day read. A printed work's online fields follow
  its publication: Read Through (`host`), Address, Last Modified, Accessed
  and Note. The two days are `<input type="date">`.
- **One How to Cite tip, in place of a hint per field** (the owner's call,
  2026-10-20; [`info-tip.md`](info-tip.md), "When a field gets a tip"). It
  sits at the end of the panel's head, just before its ×, in New Reference
  and Edit Source alike (the owner's call, 2026-10-20), and says
  the rules once, each on a line of its own and each a sentence ending in a full stop, any example in round brackets before it so the stop is never read as part of what to type (the stored values carry none): the first author inverted,
  edition and volume as printed, contributors as a sentence, a date as
  precise as the source gives it, underscores round a title inside a title
  to italicise it (MB.151), and a note printing after the citation in
  brackets. The rules are a list, read as separate lines; since the bubble
  is a `<span>` and may not hold a `<ul>`, they are spans with the `list`
  and `listitem` roles, and the bubble is only as wide as its longest
  rule needs, up to the tip's cap. The panel's
  `aria-describedby` names it, after an edit's reach note, so it is read on
  entering the panel rather than with every field. A field whose format
  matters shows an example as its placeholder instead of an action:
  Authors "Shelley, Mary", Edition "2nd ed.", Volume "Vol. 2", Place
  "London", Published "1985", Pages "112–30", Address "https://" and Read
  Through "Perseus Digital Library". The rest keep their actions.
- **A kind change keeps what was typed** in every field, but only the
  chosen kind's are sent: `toReferenceInput` sends the rest as null, and a
  blank day as null, since `LocalDate` takes no empty text. The resolver
  is the shared `ReferenceInput` schema over that input, so its refusals,
  "Name the book this chapter is in", land beside their fields, and so do
  MB.154's checks: a date with no year, pages or an article's volume that
  are not numbers, an address with no named host, a day not yet come
  ([`db/references.md`](../db/references.md), "Formatting and checks").
- **Each field is tidied as it is left**, the way the server will store it:
  `TextField`'s `format`, the field's `FORMAT_OF` entry from the same
  module the schema formats with — spacing collapsed, a title's wrapping
  quotes dropped, ranges en-dashed, `https://` added to a bare address,
  "second edition" written "2nd ed." An error the field was showing is
  judged again on the tidied text.
- **Save Reference sends `createReference` for this coven.** A
  `VALIDATION` error's field errors land beside the fields they name, if
  the kind shows them, through the element a resolver error uses; anything
  else is an alert at the top of the panel. A failed save focuses the first
  field marked invalid in the panel. Saved, the source is added as a row by
  its id, announced, the panel closes, the box takes the focus, and the
  cached searches are dropped so the new source is found next time.
- **Enter in one of its fields saves the source**, not the ingredient, as
  Enter in a form of its own would. Cancel closes it, the box taking the
  focus.
- **A × at its top closes it too** (MB.258), so a panel taller than the
  dialog can be left without scrolling to its foot. It does exactly what
  Cancel does, saving nothing and asking nothing, and is held with Cancel
  while a save is in flight. The panel's Undo and Redo, the How to Cite ⓘ
  and the ×, the ⓘ and × abutting, stand at the right end of the panel's
  top border, level with the legend and on the dialog's surface colour so
  the line stops short of them (the owner's call, 2026-10-20); the note,
  if there is one, is the panel's first line. The legend's words and the
  group's marks stop the border the same distance short,
  `$panel-head-gap` (one step), so the two cannot drift apart (the
  owner's call, 2026-10-20). The group goes onto the border only where the
  panel's content is at least 18rem wide, a container query, since the
  panel's width, not the viewport's, decides whether it clears the
  longer legend. In a narrower panel, as on a phone, the head is one
  line: the note at the start and the group at the end, and where the
  note would be squeezed under 14rem the group drops to a line of its own
  directly beneath it, still at the right. The owner approved that split:
  "I like it splitting the line" (2026-10-20). The × is named for the panel, "Close New Reference" or "Close Edit Source",
  since the modal's own × is "Close". It comes before Kind in Tab order, as
  it does on screen. Save & Add Another closes it with the rest, since `EMPTY_VALUES`
  holds `referencePanelOpen: false`.
- **Asked for again while open, it takes you back**, the owner's call:
  "New Reference" scrolls the panel's top into view, its
  legend clear of the edge, and focuses Kind again, keeping everything
  typed. The field counts each request and the panel focuses on each new
  count, as it does when it opens.

On the compendium the search and the panel ask with a null `workspaceId`:
the search offers the compendium's sources alone, and Save Reference writes
one to the compendium, under the admin proof.

### Editing a source

A source already recorded is changed in the same panel (MB.115, the owner's
call: "We don't have a way to edit existing references"). The edit changes
the source, not the row's link to it, so it reaches every entry citing it.

- **Edit Source, in the open row**, a small quiet button beside the tier,
  named "Edit Source" and the short form, as the pencil is named "Edit" and
  the short form, and described by the whole citation. A separate control
  rather than the pencil itself: the pencil opens the row for its Locator,
  what a row most often needs, and an edit that reaches every entry citing
  the source should be a second, deliberate step.
- **Only where the form may change the source.** A coven's form edits its
  own sources; a compendium source there has no Edit Source, and its tier
  line adds that only the site's admins can edit it. A button left
  disabled was the alternative, refused because a disabled button takes no
  focus, so its tip could not be reached by keyboard. The compendium's form
  edits every source it lists, all the compendium's. Another coven's source
  never appears: the search never offers one.
- **The panel opens on the whole source.** A row carries only the four
  fields of its short form, so the panel reads the rest by id through the
  `reference` query, in the source's tier: the coven's for a coven's own,
  none for the compendium's ([`db/references.md`](../db/references.md),
  "Reading and writing them"). It says it is loading until the read lands,
  then shows the fields prefilled, Kind focused as for a new source. The
  read is kept only while the panel is open (`gcTime: 0`), so opening it
  again reads the source as it now is.
- **Its legend is "Edit Source" and its save Save Source**, Saving Source
  while in flight, off until a field changes. A line under the legend,
  which also describes the group, says a change reaches every entry citing
  the source. Validation and other refusals land as a new source's do.
- **Save Source sends `updateReference`** with the source's id and tier, and
  every field, since an update replaces the source. Saved, every row in the
  form citing that source — the ingredient's and each variant's — takes the
  new citation and short form in place, the change is announced in the
  field's "References changes" region, the panel closes, the row stays
  open, and its Edit Source takes the focus. The rows are rewritten without
  marking the ingredient changed: the source is saved already and the links
  the form sends are as they were, so Save Ingredient and the unsaved-changes
  guard ([`modal.md`](modal.md), "Unsaved changes") are left as they were.
  The cached searches are dropped, so the picker shows the new text; rows on
  other ingredients read it on their next load, which the page's refresh
  after the modal closes gives them.
- **Cancel, or the × at its top, closes it without saving**, the focus back on the row's Edit
  Source. The panel's edits live in its own form, never the ingredient's,
  so closing it discards only them and never asks the unsaved-changes
  question. New Reference while an edit is open, or Edit Source on another
  row, starts that panel afresh.
- **A panel's edits still count as unsaved changes** to the ingredient form,
  new or editing (MB.115, the owner's call that every way out of an admin
  form asks while it has changes). Each panel reports its own `isDirty`
  through `PanelChangesContext` (`panel-changes.ts`), and the form's guard
  reads its `isDirty` or any panel holding edits, so the form's Cancel, the
  modal's ×, Escape and the backdrop all ask first. Keep Editing returns to
  the panel with its text as typed; Discard Changes closes everything. A
  closed panel reports nothing.
- **One limitation is known**: rows rewritten after an edit hold a citation
  the form's defaults do not, so once another field is changed the
  ingredient counts as changed until it is saved, even if that change is
  undone. Moving the defaults with the rows needs react-hook-form's private
  `control._defaultValues`, or a `reset` that would drop the field arrays'
  keys, so it is left.

### The variants

An ingredient comes in forms — Rosemary as a dried herb and as an oil — and
each form adds to the ingredient, never overriding it: the oil's safety note
sits beside the herb's description, not in place of it (MB.215,
[`design-decisions/mb.215-ingredient-variants.md`](../design-decisions/mb.215-ingredient-variants.md)).
The form holds them in a Variants section after the ingredient's own fields,
as the ingredient's page shows its forms after it (MB.221).

- **Each variant is one summary line until it is opened** (MB.115, the
  owner's call, once every variant's ten fields made the section busy). The
  line is a card: the form as typed ("Unnamed Form" while its Form box is
  empty) with its curated group after it in the muted ink, "Dried leaf
  (Plant part)", as the Form box reads; beneath, what it carries,
  `variantSummary`, in its sections' order — "1 celestial body · 2 categories ·
  Safety note · 1 reference" — or "Nothing yet", as an empty section says,
  the two built from the same parts in `summaries.tsx`; and at the end the reference
  rows' two icon buttons, a pencil and a × (MB.115, the owner's call),
  named for the form, "Edit Oil" and "Remove Oil". The card is
  a fieldset named by the form alone, through `aria-labelledby`.
- **Remove asks first, and only removes.** It never opens or closes the
  card: Keep It leaves the variant as it was, open or closed, and Remove
  takes it, the focus going to the New Form box
  ([Removing a variant or a reference](#removing-a-variant-or-a-reference)).
- **Edit opens it in place, one at a time.** Edit carries `aria-expanded`
  and `aria-controls`, naming the region of the variant's fields, and is
  described by the summary while closed. Opening one closes any other; the
  focus moves to the first thing in it: its Form box while Identity is
  open, else Identity's heading, closed, as an edit's variants open
  (["Sections"](#sections)). A Done at
  the foot of the fields, "Done with Oil", folds it back to its line and
  returns the focus to its Edit; Edit pressed while open folds it too. A
  variant added from the New Form box opens, first of the cards, closing
  the one open, while the New Form box keeps the focus for the next. An edit opens
  with every variant closed.
- **A closed variant's fields stay in the page, hidden**, rather than
  unmounted, so nothing in them is lost by closing it: a box's text, a
  sortable list's place, or an open new reference panel and what was typed
  in it. Its values are the form's either way.
- **An error in a closed variant opens it.** A save, the resolver's or the
  server's, that finds an error under a variant opens the first such
  variant, unless the one open has an error too, and the form opens the
  variant's sections holding one, so the form's focus on the first field
  marked invalid reaches its field. The variant opens while the
  section renders the save's result, in the same commit that draws the
  error, since the focus runs as that commit lands. Any other variant with
  an error stays closed, its card edged in the error red and its line saying
  it has an error to fix, read with its Edit.
- **Its fields** are the variant's Form, Description, Safety Notes, Toxic, Element, Celestial
  Bodies, Zodiac Signs, Colours, Categories, Substitute Ingredients and
  References, in the ingredient's sections (["The fields"](#the-fields)), the ingredient's own field components at the variant's
  place in the values, `variants.1.celestialBodies`, so each validates, errs, focuses
  and is held by text left in its box as the ingredient's is. Deities and
  folk names are the plant's, and stay on the ingredient alone.
- **The New Form box adds one**, a list's box for whole variants, at the
  head of the section (MB.115, the owner's call): under its heading and the
  compendium's no-form prompt, its error beneath it, and above the cards.
  A variant it adds goes first, just beneath it, and opens there while the
  box keeps the focus, so what was added is in view without the focus
  leaving the box; an edit reopens them in the read's order, by form. Its
  label is hidden, as a list box's is, its placeholder "Add a form" saying
  what it is for: a pick from
  the form vocabulary adds a variant carrying the pick, and on a coven Add or
  Enter adds the text typed. A form the ingredient already comes in, folded
  as `ingredient_variants_form_unique` folds it (trimmed, case aside), is
  refused at the box, its text kept and the reason on the box's error, as a
  list refuses a repeat (`repeatedForm`); the lookup leaves those forms out.
  Text left in the box holds a save, as a list's does.
- **On the compendium a form is a pick**: the box offers the curated rows
  alone, with no typed row and no Add, and a variant's Form box typed away
  from its pick is refused beside that box at save (MB.162). While an entry
  has no form the section says one is wanted: an entry with none saves, but
  as information only, which nothing can stock.
- **A variant's substitutes are picked form by form** (`formRows`, MB.115,
  the owner's calls). The lookups already read each ingredient's forms, so
  the box shows each ingredient it found as a row per form, "Mockwort ·
  Dried leaf (Plant part)", which links that form and is sent as the
  entry's `substituteVariantId`. **A variant's link always names a form**:
  a form stands in for a form, so there is no row for the ingredient whole,
  and an ingredient in no form at all, which only a coven's
  information-only entry can be, is not offered, having nothing to link.
  The pill names what was picked, "Mockwort · Dried leaf". Typed text is
  still added as a name only, its pill the text as typed: a name links
  nothing, so it needs no form. The variant itself is
  never offered, as `ingredient_substitutes_not_itself` refuses it; its
  sibling forms are. Once an ingredient is listed, every row of it leaves
  the box, since `ingredient_substitutes_variant_link_unique` holds one
  link per ingredient in a form's list, whichever form it names. The
  search matches ingredients by name, not by form.
- **A link naming no form is refused at save.** Old data can hold one, a
  link made before the rule. Its chip still reads, as the ingredient alone,
  "Mockwort", but the save is refused with an error on that entry, as any
  entry's error is placed (its `errorId` on the chip's ×, its line in the
  list's error element): the admin removes it and picks a form from the
  box. The refusal is the schema's, `formLinkRules` in
  `validation/ingredient.ts`, which runs on a variant's substitutes alone,
  so the resolver refuses it in the browser and both services on the
  server, at `['variants', i, 'substitutes', j, 'substituteVariantId']`,
  which `fieldNameOf` places on the same entry
  ([`validation.md`](../validation.md)).
- **The rows rank for the variant's form** (`rankForForm`): an ingredient
  coming in a form that folds alike is listed first, then one with a form in
  the same curated group, then the rest, each tier in the search's order,
  and within each ingredient its forms run in the same order. Every form's
  row stays, since a form of anything may stand in for a form.
- **The ingredient's own substitutes keep their second picker**,
  `SubstituteForms`: a linked ingredient in forms gets "Form of Mockwort",
  Any Form until one of its forms is chosen, sent as the entry's
  `substituteVariantId`. A variant's substitutes have none: their row names
  the form.
- **An edit opens with its variants**, each carrying its row's id as
  `variantId` (not `id`, which `useFieldArray` keys rows by), sent back as
  the input's `id` so a respelt form keeps its row.

A server issue on a variant is pathed beneath it, `['variants', 1, 'form']`,
and `fieldNameOf` places it as it places the ingredient's: on that variant's
field, its list entry, or its reference row; one on the variant as a whole,
or on its kept `id`, is its Form box's.

### Removing a variant or a reference

A variant's × and a reference row's × each ask before they remove, the
owner's call (2026-10-16). Both rows take more typing to put back than a
chip does, and a variant's × had read as closing its card. The question is
the form's usual card ([`ConfirmQuestion`](modal.md)), drawn by
`RemoveQuestion` in `remove-question.tsx`: "Remove "Oil"? …" with
**Remove** and **Keep It**, the focus on Keep It.

- **Nothing is lost until the save.** Remove takes the row from the form,
  as the × did before; the entry changes only when it is saved, and Cancel
  still discards the removal with the rest.
- **The focus.** Keep It hands it back to the ×. Remove hands it to the
  list's box, New Form or Reference, since the × went with its row. The
  removal is committed at once (`flushSync`) so the card's own hand-back,
  to the first field when the × is gone, comes first and the box's second.
- **One question at a time.** While the unsaved-changes question asks, a
  removal question steps aside, through `DiscardAskingContext`, and comes
  back on Keep Editing.
- **The row by its id.** The question holds the row's field-array id rather
  than its place, which an add while asking would move.
- **The chip lists are unchanged.** A chip's × still removes at once, and
  Backspace in their empty box still takes the last chip.

### Promoting a folk name

A saved folk name's chip carries an up arrow ahead of its ×, named "Make
<name> the Display Name" (M12.1). It makes that folk name the ingredient's
name, and the old name becomes a folk name, in one step on the server
(`promoteFolkName`). The arrow is a button in the tab order, so the chips'
sortable and Backspace behaviour are untouched. It is drawn by the Combobox
entry's `action` ([Combobox](combobox.md), "An entry"), which ListField fills
per row through `rowAction`. A name typed and not yet saved has no id on the
server, so it has no arrow.

- **It always asks first**, in the form's usual card (`PromoteFolkNameQuestion`,
  `promote.tsx`). The card's lines are told apart by type, not by space
  alone, the owner's call:
  - The question, "Make this folk name the display name?", is set larger, as
    the card's heading. It names no name, since the panel beneath names both.
  - The swap is a `dl` on a tinted panel. Each term ("New display name",
    "Becomes a folk name") is a small uppercase overline, with its name
    larger beneath it.
  - On the compendium a muted caption says every coven sees the change at
    once. A coven's question leaves that out.
  - A form with changes adds "You have other unsaved changes. Save them, or
    discard them?", ruled off above the buttons that answer it.

  The lines beneath the question are `ConfirmQuestion`'s `details`
  ([Modal](modal.md), "`ConfirmQuestion`").

- **A form with changes** is offered **Save & Promote**, **Discard &
  Promote** and **Cancel**. Save & Promote runs the form's own save
  first, with the same validation and errors. If it does not land, nothing is
  promoted: the question closes and the first invalid field takes the focus.
  Discard & Promote puts the form back to its saved values, then promotes.
  An open reference panel's own edits survive Save & Promote, and Discard &
  Promote closes the panels with the reset.
- **One round trip.** The mutation answers the new name and the full folk
  name list with ids. The form resets from that answer, clears its edited
  marks and its undo history, calls `onSaved`, and says "Saved" in the status
  line. The focus goes to the Name field, since the chip that was pressed is
  gone.
- **A refusal** (a name already taken, say) shows in the form's alert and the
  question closes.
- **Both tiers.** `usePromoteFolkName(workspaceId, ingredientId)` and the
  question take a null `workspaceId` for the compendium, or a coven's id.
  Both edits reach the control: the compendium's in `promote.test.tsx`, a
  coven's in `coven-edit.test.tsx` (M8.17).

### Copying from the ingredient

A form often says much of what its ingredient says, so each of an open
variant's fields but its Form has a **Copy From Ingredient** icon button
(`copy.tsx`, MB.115, the owner's call): Description, Safety Notes, Element, Celestial
Bodies, Zodiac Signs, Colours, Categories, Substitute Ingredients and
References. The ingredient's own fields have none, and nor has a form's
Toxic toggle: its flag is its own and never the ingredient's (M11.21).
Neither Toxic toggle carries a hint (2026-10-20): the ingredient's is on when
any part of it is poisonous, and a form's when that form is, and the label
says as much.

- **Where it sits.** A small quiet button, `.btn--small.btn--quiet`, at the
  right end of the field's label row or legend, after its tip, through the
  field's `action` slot: `FieldShell`'s and `TextField`'s
  ([`field.md`](field.md)), `MultiSelectField`'s, and a legend's on
  `ListField`, `ReferencesField` and `CategoryPicker`
  ([`category-picker.md`](category-picker.md)), the last three handing it
  their announcer. In a variant the label rows and legends span the card
  and wrap, so on a phone the button drops beneath a long label.
- **Its name** is the visible words first, then the field, "Copy From
  Ingredient: Celestial Bodies", so the nine are told apart and the name still
  starts with what is seen (WCAG 2.5.3). It is a `type="button"`.
- **Shut while there is nothing to copy**: `disabled` while the
  ingredient's field, as the form holds it now, is empty, read through
  `useWatch`, so it opens as soon as the ingredient's field gains a value.
  `disabled` rather than `aria-disabled`, since a press never empties the
  ingredient's field, so the focus is never stranded on a shut button.
- **What it copies, adding and never taking away** (the owner did not say;
  this is the lane's reading). A list gains the ingredient's entries it
  lacks, after its own, in the ingredient's order: celestial bodies, signs and
  colours by their text folded as a save folds it, elements and categories
  by value, references by source, each with its locator. A text box empty
  takes the ingredient's text; one holding text gains it after a blank
  line, unless it holds it already, so nothing typed is overwritten.
  **Substitutes copy "the same form"**: each of the ingredient's linked
  substitutes links the linked ingredient's form that folds alike to this
  variant's form, Oil for Oil, as a variant's form row does; a name copies
  as a name. One already listed, by link or by folded name, is left out.
  **One in no such form is skipped**, the owner's call, since a variant's
  link must name a form: the announcement adds how many, "Skipped 1 with
  no Oil form", and a notice beneath the list names them.
- **The skipped notice** (`SkippedNotice` and `useSkippedCopy`, the
  owner's call). A block `Notice` of the `warn` kind, taking no role, inside a
  status region labelled "Substitute Ingredients skipped", always in the page, as a live region
  must be to be heard (the duplicate warning's pattern), and empty, its gap
  cancelled, until a copy skips something. It names what was skipped, "No
  Oil form to link, so not copied: Mockwort.", beside a small quiet **Copy
  Anyway**, which adds them as names only, typed text with no link, so the
  rule holds and the admin can swap a name for a form later, and a ×,
  "Dismiss". Either one takes the notice away and the focus back to Copy
  From Ingredient, since the pressed button goes with it. Any other change
  to the list, an entry added or removed, takes it away too: the variant
  keeps the list as the copy left it (`listKey`), and the notice goes
  once the list no longer matches. It sits in `ListField`'s `after`
  slot, beneath the box and its error.
- **After a press** the field shows the result and the form is dirty, so
  Save opens; once a save has been tried the field is revalidated. A polite
  announcement says what was copied, "Copied 3 celestial bodies from the
  ingredient", or "Nothing new to copy from the ingredient", through the
  list's own live region where it has one, else through a hidden `output`
  beside the button. The focus stays on the button.

### The form's pick

Two curated forms may share a name, Wax under _Animal_ and Wax under
_Substance_ (DESIGN.md §5), and both fill the box with "Wax". So a pick of a
curated row is kept beside the text, as `formLink` in the form's values:
the row's id, the name picked, its group, its group's `icon` and its
description (MB.169, M12.7).

- **Every form wears its group's icon** (M12.7), resolved once, as
  `<FormIcon name={icon ?? null} />`, the salt spoon for a null: before each
  curated suggestion and the typed row (the spoon, for a value only in use),
  before the name in the Form box while it holds a pick, through the
  combobox's `icon` (the owner's call, rather than beside the group in
  brackets), before the variant card's head and
  before the substitute summary's Form line, which reads it from
  `formChoice { group { icon } }`. The icon is decoration, outside every
  accessible name.

- **The box shows the group.** "Wax" stays as the box's editable text, and
  "(Substance)" follows it in the muted ink, so the box reads as the row
  picked did, "Wax (Substance)", the owner's call. This is the
  combobox's `qualifier` ([`combobox.md`](combobox.md), "A qualifier").
  The form's description is the qualifier's tooltip. It opens on hover and
  while the box has focus, above the box from its right edge so the Form
  label stays in view, and closes on Escape, at the first printable key and
  when the list opens (MB.115, the owner's call). The group and the
  description are also the box's accessible description, after its hint, so
  a screen reader hears them while typing.
- **An edit away from the picked name drops the link, the owner's call.**
  `FormField` hears each edit through `SuggestField`'s `onEdit`. Once the
  text is no longer exactly the name picked, the link goes, and the group
  with it. Typing the name back does not bring it back: what is left is typed
  text. A pick of the typed row, or of a form only in use, clears the link
  too, and a later pick replaces it.
- **It is sent as the variant's `formId`**, `""` for typed text ("What it
  sends"). The service refuses an id naming no curated form at
  `['variants', i, 'formId']`, and that issue is that variant's Form field's. `fieldNameOf` maps the server's, and the
  resolver moves the schema's, so it lands beside the box that made the pick
  rather than above the form.
- **A pick an admin has since renamed asks the member** (M8.17). A coven's
  variant keeps the text it was saved with, so after an admin renames the
  curated form (M5.6a; "Wax" to "Beeswax", say) the text no longer matches the pick's name, which
  `renamedTo` in `values.ts` notices. Beneath the box the form says "This
  form is now called "Beeswax"." and offers two buttons: Use "Beeswax", which
  takes the new name and keeps the link, and Keep "Wax", which keeps the
  text and drops the link. The save is held, with the error "Use "Beeswax" or
  keep "Wax" before saving" on the Form field, until one is pressed, since
  the service would refuse the mismatched pair anyway (MB.167). Only a
  coven's variant can hold one: a rename rewrites the compendium's own
  (MB.162).
- **Save & Add Another clears it** with the rest, since `EMPTY_VALUES` holds
  no variants.

An edit is given its picks back in its values: the compendium page reads
the curated form with its group, and each picked deity with its tradition,
as `IngredientVariant.formChoice` and `IngredientDeity.deity` resolve them
(MB.167; ["On the compendium"](#on-the-compendium)). A pick retired since
then reads as typed text.

### The duplicate warning

Story 16's "did you mean" (M5.10), on MB.11's `possibleDuplicates`
([`graphql/schema.md`](../graphql/schema.md), "possibleDuplicates").
`useDuplicateWarning` watches the name and asks once it has settled, through
the same `useDebouncedValue` the lookups wait on, for the three closest
entries in the compendium and this coven — on the compendium, the
compendium's alone, less the entry being edited, which its own name always
matches. A blank name asks nothing and drops
the last warning, nor does a single letter, which resembles too much to warn
of anything (the owner's call, 2026-10-18), and so does the name the form opened with until it has
been typed in (MB.115, the owner's calls): opening an entry to fix something
else never asks about its own name's neighbours, and a save that never
touched the name is never held. Once typed in, the name asks as any does,
back at the opened name too; a save's reset starts the count again. The threshold is the server's, M4.7's 0.4, so "no warning
below threshold" is an empty answer; the form adds no threshold of its own.
Unlike the lookups it needs no focus gate: an empty form has no name to send.
The form owns the hook, since its save waits on it, and `NameField` draws it.

The warning sits beneath the field, a block `Notice` of the `warn` kind
([`notice.md`](notice.md), "The block form"; M12.48), the ochre bar and
tint with the ochre triangle: "Did you mean one of these?" and a list beneath it, one
match a row (`.ingredient-form__matches`), then a Create Anyway button,
medium-sized and in the accent outline (`.btn.btn--medium`; the owner's call of
2026-10-18, which took it off MB.115's quiet style). The rows' title links
wear the body ink and the faded underline of the entry page's links, with
a ◆ centred on the row: the `list-marker` shape (`_mixins.scss`), not
typography-base's glyph, whose box sat its top rather than its middle on a
centre line (M12.48).

**In a coven's form the matches come in two groups** (M12.48, the owner's
call), each under its own heading: **In This Coven**, the coven's own entries
and the compendium entries its cupboard already holds (`!isGlobal`, or
`inCupboard`), then **In the Compendium**, the compendium entries it does
not hold. Each keeps the answer's order. A group with no rows is not drawn,
but a lone group keeps its heading, so the reader always knows which kind a
match is. The headings are `h4`s, under the modal's `h2` and the Identity
section's `h3`, set as a fieldset's legend is (`.fieldset__legend`): Lexend at the
small size and 500, in the notice's own ink rather than the muted one (the
owner's call, 2026-10-21); each list is a
`<ul>` named by its heading through `aria-labelledby`. Each group slides
its own rows (`useSlidingRows`, once per list) and opens and closes by
height round them, 0fr to 1fr as the region does, so a heading never stands
over an emptied list. The sentence above both is unchanged, and the region's
`aria-describedby` still covers the whole block. The compendium's form has
no coven, so it draws one plain list with no headings. An add by the + moves
its row from In the Compendium to In This Coven, by these same slides ("The +
in the duplicate warning" below). While another name's answer is on
its way, each row stands as the skeleton's shape (`skeleton-shape`,
`_mixins.scss`, as a tab's list does), a bar for the title and an icon's box where
the row had a + or a Quick Look, so the box keeps its
height and nothing jumps when the answer lands (the owner's call over a
spinner, 2026-10-18). Row and shapes both stay mounted and cross-fade: the
shapes wait 200ms before fading in over 300ms, so an answer back sooner never
shows them, and fade out as slowly, so a late one never flashes (the owner's
call); the region is `aria-busy` meanwhile. Whether or not the region is
drawn, the name field itself shows the lookup, `busy` on its `TextField`
([`field.md`](field.md)): the spinner inside the box at its right end, so
nothing appears below the field until an answer has something to show (the
owner's call, 2026-10-18). Rows are slots by place: when an
answer has more rows than the last, the list's height slides down to show the
new ones as they fade in; when it has fewer, the spare rows stay whole and
fade while the list's bottom slides up over them, and they leave the list once
the slide ends (the owner's call, over each row shrinking on its own). The
height is set on the list by script for the slide, from its last measured
height to its settled one, since an auto height cannot otherwise be moved;
reduced motion swaps at once. A row whose place keeps but whose entry changes
cross-fades its title: the new row fades in and the last entry's title and
button lie over it as text alone, fading out, both linear so the place stays
just covered and the old title in the link's own ink (the owner's call). An
answer back while the shapes are still fading in waits under them, read off
the shapes' own transition events, and the rows change once they are fully
in, so the change is never seen; one back with the shapes in changes the
rows under them, and one back before they began cross-fades (the owner's
finding, 2026-10-18). The region itself, always in the page as a live region
must be, opens by height round the first warning, grid rows 0fr to 1fr as
the facet panel opens, while the notice fades in, and closes the same way
round the last rows as they fade, so neither the first warning nor the last
lands or leaves outright (the owner's calls). A list rather than a
sentence, since the owner found the sentence with buttons run into it
unreadable at the cupboard review (2026-10-18); a compendium match's +
or Quick Look eye (below) sits at the right of its row. Each match is a link named
by its label and its formal name, since the label alone can name five
plants; one with no formal name shows its label. Each links where `duplicateHref` says — the admin's
compendium page opens the match's own modal, `?edit=<slug>` — and the shell's add button to
`/coven/[slug]/ingredients/[id]`, DESIGN.md §9's coven page, which
reaches compendium and coven entries alike. It opens in a new tab, so the
form and what is typed in it stay where they are (the owner's call at
MB.115's review), and its name ends "(opens in a new tab)" for a screen
reader, as the substitute summary's Open Entry does. It is a plain anchor,
since the caller hands back a plain string, where a typed `<Link>` wants a route
the build contains. Nothing refuses the create on the server: the warning is the
form's alone.

**An exact compendium name is a question, not a warning** (M12.20). A new
coven entry's save also asks `compendiumMatches`
([`graphql/schema.md`](../graphql/schema.md), "compendiumMatches") for the
compendium entries bearing the typed name exactly, case aside, on the formal
name too. If any come back that the person has not set aside, the save waits
and the notice reads "The compendium already has an entry of this name."
("entries", with several), over the same list: each row the entry's link
with a **+** at its right (M12.48, the owner's call, in place of M12.20's Use
It button): an icon button in the card's plus's look (`add-icon`,
[`add-icon.md`](add-icon.md)), named "Add to My Ingredients: " and the
entry's label and formal name, as the card's plus is, which adds the entry to
the coven the form is adding to, with no menu of covens. Or the **Quick Look** eye
where the cupboard already holds it (M12.48, in place of M12.20's Open It;
"Quick Look in the warning" below), and one **Create Anyway** beneath the list (the
owner's word for both lists, 2026-10-18; M12.20 had named the question's Add
Our Own). The
block's id, the sentence and the list together, is what the button and the
field are described by, so a focus landing on it still hears the names. It sets
the entries aside and takes the focus the way the warning's does, so the next
Save makes the coven's own entry as before. The + calls `addCupboardEntry`
(no jar, no form) and adds the entry under its own name: the typed name is never
sent as a `label` (M12.48, the owner's call, in place of M12.20's "with the typed
label"). The typed name was the search that found the entry, and sent as a label
it could clash with a label the coven already gives another entry, which refused
the add: "rosemary" pressed on Rose, where the coven calls its Daisy Rosemary. The
entry can be relabelled on its page. It sends whichever of the description,
safety notes, elements, celestial bodies, zodiac signs and colours were filled
as the coven's overrides, and then reports the entry, by its own name, through
`onSaved` as `'another'`, so the modal stays open with what was typed ("The +
in the duplicate warning" below). A refusal is said at the form's head. Once the add lands, both
lookups, `possibleDuplicates` and `compendiumMatches`, are asked again for every
name (`added` on `useDuplicateWarning`), and a held save's exact matches mark the
entry held: their cached answers would otherwise say the coven still lacks it for
the cache's stale time, so the form opened again on that name listed it under In
the Compendium with its + (the owner's report, M12.48). A near match in the
did-you-mean list gets the same + or eye at the right of its row when
it is a compendium entry (`isGlobal`); the coven's own entry, which the
cupboard holds by being the coven's, gets the eye and never a + (the owner's
calls, 2026-10-18 and M12.48). Both need `onUse`, which the compendium's
form leaves out, since it has no cupboard. Viewers never reach the modal.

**The + in the duplicate warning** (M12.48, the owner's calls, 2026-10-21).
This replaces navigating to the entry's page after the add: the form stays open,
and the + turns into the entry's Quick Look eye where it stands.

- **While the add is sent**, the + shows the spinner, and is `aria-busy` and
  `aria-disabled` rather than `disabled`, so the focus stays on it.
- **Once it has worked**, the + shows AddIcon's check (`data-state="added"`,
  drawn along its stroke) for `ADDED_HOLD_MS` (1000 ms,
  [`add-icon.md`](add-icon.md)). It keeps its name, "Add to My Ingredients: "
  and the entry, and stays `aria-disabled`.
- **Then the check turns into the eye**: the same button, now named "Quick Look"
  and the entry's label and formal name, which opens the details over the form.
  With motion, the check fades out over the eye arriving (`data-state="returning"`,
  the stack AddIcon fades back to its plus with; `.add-icon__eye` arrives as
  `.add-icon__plus` does). Under reduced motion the check is still shown for
  the whole hold; the eye then takes its place at once, with no fade or motion.
- **Only once the eye is in** is the cache refreshed (`added` on
  `useDuplicateWarning`, above), and the row then slides from In the
  Compendium to In This Coven. The duplicates region is `aria-busy` from the
  refresh's start until the rows have stopped sliding.
- **The focus follows**: if it was on the + when the move began, it goes to the
  eye in the row under In This Coven. If the person had moved it elsewhere, it
  stays there.
- **"Added to <coven>." is said once, through the page's status region**
  (`useAnnounce`, [`click-feedback.md`](click-feedback.md), "The status
  region"). The form shows no Saved notice for it. The coven's name comes from
  the `workspaceName` prop, which the shell's add button passes; without it
  the sentence says "My Ingredients".
- **The modal stays open** with everything typed, since `onSaved` is called with
  `'another'`, which the shell's add button ignores. The coven page beneath
  the modal is not refreshed until the next navigation, as with Save & Add
  Another.
- **A refusal** is said at the form's head, as before; the + shows no check and
  is back to an idle +.

In a coven's form, the warning's Quick Look eyes, the one a + turns into
included, are in the add's green (`$accent`, the colour of the check), not
the cards' ink (`$card-more-ink`), in every state (the owner's call). On hover
and focus the green wash under them is `icon-button-edit`'s, as under the +.
The rule is scoped to `.ingredient-form__group`, which only the coven's form
draws, so the admin form's eyes keep the cards' ink. The eye's contrast, as a
non-text control (WCAG 1.4.11 asks at least 3:1), on the notice's tint over
the surface the form sits on:

| Theme | Surface | On the `warn` tint | On the `error` tint | On the hover wash |
| ----- | ------- | ------------------ | ------------------- | ----------------- |
| Dark  | Card    | 6.29:1             | 6.55:1              | 4.97:1            |
| Dark  | Page    | 7.05:1             | 7.30:1              | n/a               |
| Light | Card    | 4.74:1             | 4.67:1              | 3.96:1            |
| Light | Page    | 4.28:1             | 4.22:1              | n/a               |

The tint is the notice's bar colour (`$warning` or `$secondary`) at
`--notice-tint` (8% dark, 7% light) over the surface; the wash is
`$accent` at 20% over the card surface.

**An edit's warning holds nothing** (MB.115, the owner's call). Renaming an
entry makes nothing new, so on an edit the warning names its matches and
links them as above, but offers no Create Anyway and never holds Save: the
form skips `check`, and `NameField` takes `holds={false}`.

**Quick Look in the warning** (the owner's call, M12.48). In the admin
compendium's form every match is a compendium entry, so each row gets the
Quick Look eye (`DetailsLink`, [`ingredient-entry.md`](ingredient-entry.md))
at its right, named "Quick Look" and the entry's label and formal name, as a
list row's eye is. Its name still links the entry in a new tab, and there is
no +. The form takes `quickLookOf`, which `CompendiumDialog` builds when
the page passes `lookUnder`, the open form's `?new` or `?edit=<slug>`: the
address is the list with `?entry=<slug>` and that form's parameter, so the
details open over the form in their own modal place and close back to it. The
form stays mounted beneath, keyed as before, so what was typed survives.
Modals stack in the browser's top layer, so Escape closes the details alone,
and the focus goes back to the eye. Details opened over another entry's form
offer no Edit, which would replace that form and its typing; details under
their own entry's edit, M12.5's way round, keep it. A reload of such an
address draws the form over the details, since the order of the two in the
address is not kept. The public search's form opens details by id, not
slug, and offers no Quick Look.

In the coven's form, the shell's Add Ingredient dialog, the eye sits on each
row the coven holds, its own entries and the compendium entries in its
cupboard, and is a button (`QuickLookButton`,
[`icon-tip.md`](icon-tip.md)) rather than a link: that dialog opens over
any shell page by `?new`, and most of those pages have no details modal to
route to. Its press opens `DuplicateQuickLook` (`quick-look.tsx`), the
details modal over the form, which reads the entry in the page through the
existing `ingredient(id, workspaceId)` query, nothing new on the server.
It opens at once, `aria-busy` with the modal skeleton (M12.33), under the
head the details will have, the row's name with its formal name over it, as
a route modal's press opens under the head its opener names, so nothing in
the head moves when the details arrive. The head and body are then the
details modal's own (`headingOf`, `detailsHeading`, `IngredientSummary`),
and its foot's See in Your Cupboard opens the entry's page in a new tab, so
the form and what is typed in it stay. A failed read says so in the modal,
with Try Again. Escape closes it alone and hands the focus back to the eye.

**The warning has to be answered before the form saves**, the owner's call,
which corrects the issue's "does not block submission". While it is only
typed against, it is a warning notice and the name is not marked. A new entry's save that
passes validation asks about the very name it is sending, through the query
client's `fetchQuery`: the cached answer when the typing had settled, asked
there and then when it had not, so a save inside the debounce cannot slip past
the warning. If a match not yet set aside comes back, nothing is sent: the
notice turns to the `error` kind and its sentence to "Your save is on hold, as
these entries have a similar name" (colour alone must not say it), the name is marked invalid and described by
it, and the focus goes to Create Anyway, which the warning describes, so the
focus says why it moved. A second save stops the same way. A failed check
holds nothing, as a failed lookup warns of nothing. The check runs after
validation, so an error elsewhere takes the focus first: it must be fixed
either way, and the warning is still there when it is.

**The hold belongs to the name it was set for.** Editing the name lifts it:
the notice goes back to plain and the name unmarked, so a match arriving as
the name is typed never takes the focus, and the next save asks again. The
focus goes to the button through a layout effect on the hold, declared after
the one that focuses the first invalid field, so it wins when both run.

**Create Anyway answers it**, the owner's call over submitting the form: it
saves nothing, sets the matches it named aside, and lets the next save go.
The matches are kept by id, so a longer name finding the same entries warns of
nothing new, and one finding another entry warns of that one alone. The name
takes the focus before the button goes, through the button's form rather than
react-hook-form's `setFocus`, which waits a tick with the focus on the body,
and the name's error goes with the warning.

A screen reader hears it two ways. The warning is inside a status region
(`<div role="status">`, since an `<output>` holds phrasing content alone)
named "Possible duplicates", always in the page, so it is announced as it
arrives; and the sentence is in the name field's `aria-describedby` while it
shows, so it is read with the field, as the hint is. The notice inside the
region takes no role of its own (`inRegion`), so it is announced once,
whether a warning or, held, an error ([`notice.md`](notice.md), "Inside a
live region, a notice takes no role", for why the region holds the notice
rather than being it).

**A save shows it is busy**, from the press to the answer, the duplicate
check included: both saves disabled, and the one pressed marked `aria-busy`
with a spinning ring before its label, which reads "Saving Ingredient" until
the answer and then its own label again. The owner
chose the changing label during MB.131 over M5.10's fixed one, which kept the
name a screen reader knows the button by; `aria-busy` still says it is
working. The ring is in the button's own ink,
and slowed rather than stopped where motion is reduced, since a still ring
says nothing is happening.

### The kind↔name coupling, inline

The schema's rule has three cases: a botanical, fungal, zoological, mineral
or chemical entry needs a formal name, a `none` entry takes none, and an
`unknown` entry takes either (MB.161;
[`validation.md`](../validation.md), "The two ingredient variants").

The form enforces the second case by construction. Choosing "None" empties
the formal name and disables it, with a note beneath its label that says
why: 'A "none" entry records no formal name.' Choosing "Unknown" leaves it
open and optional, so a name typed before the kind is settled is kept. A note rather than a
tip, since a shut field that does not say why reads as broken. The field is
shut with the HTML attribute, not react-hook-form's `disabled` option, which
would also drop the value from what is validated and sent. Emptying it is what
keeps the value out. The schema's refusal of a formal name on `none`
is still the service's, for any other caller, and a user of this form never
sees it.

The first case stays a message. A named kind with no formal name gets "A
botanical entry needs its formal name" beside the formal name; a formal name
with no kind is no error, since it saves as `unknown`. The kind decides the
formal name's error, so the classification registers the formal name as a
`deps`, and nothing registers the other way, since the formal name no longer
decides the classification's. Once a submit has shown the error, changing
either field revalidates the formal name, and the error clears as soon as the
pair agrees, with no second submit. The classification's info tip
states the rule before anyone breaks it.

## What it sends

The values **as typed**, reshaped by `toInput` into the input the mutation
and the schema take: an unanswered select becomes `null`, a list entry
becomes its text, and the boxes are left behind. A pick goes as its row's id
(MB.169):

- The forms go as `variants`, the only place a form is sent: each variant
  with every field but `id` present, `""` or `[]` for none, since an entry
  replaces the form it names (MB.219), its form as its text with `formId`,
  the picked form's id or `""` for typed text, and `id` when an edit opened
  it. Every input type requires the list (MB.222), so a form with none sends
  `[]`, as story 29's stub does.
- A deity goes as `{ deityId }` when picked from the curated rows, and as
  `{ name }` when typed.
- A substitute goes as `{ ingredientId }` when linked, with
  `substituteVariantId` when a form of it is chosen, and as `{ name }` when
  typed.
- Each toxic flag goes as `toxic`, `true` or `false`: the ingredient's at the
  top and each form's on its variant, neither ever read from the other
  (M11.21; DESIGN.md §5, "The toxic flag is the one exception").
- The categories go as `categoryIds`, their ids in the order picked, `[]`
  when none is, which an update needs to clear them (MB.126). A repeat is
  not refused: a chip is on or off, so the form cannot send one.
- A reference goes as `{ referenceId, locator }`, the locator as typed, and
  never with its citation (MB.154). None goes as `[]`.

The elements go as chosen,
`[]` when none is, which `IngredientUpdateInput` needs to clear them and the
schema reads as absent. Nothing else is trimmed or
parsed: a blank field goes as `''`, and the service's run of the same schema
turns it into an absence. The resolver runs with `raw: true` for this, so
what it validated is exactly what is sent.

An entry's index in an issue's path is its place in the list the form shows.
Add refuses a blank, and a save is refused while a box holds text, so every
entry sent is one the user can see, in the order shown: a moved entry goes
in its new place, and a deity's place is what MB.167's replace stores as its
`position`.

The classification shows the as-typed rule too. A stub with only a name goes
with `nomenclature: null`, and the service's `LocalIngredientInput` reads
that as `none`, so story 29's one-field entry is whole. The component test
parses the sent input with that schema to show it.

## Autosave

The form saves itself (M13.24), through `useAutosave` ([`autosave.md`](autosave.md)): 3 s after the last change, and at least every 30 s while changes keep coming. `SaveStatus` sits beside the main button and shows Saving, Saved, "Couldn't save." with Retry, or the conflict notice.

- **A new ingredient is created at its first save, once it has a name.** The coven gate is the display name; a "none" or "unknown" entry has no formal name, so the name alone opens the gate. The create returns the row's id, slug and revision, the form keeps them, and every later save is an update that sends `expectedRevision`. The host moves the address (`onCreated`): see [`modal.md`](modal.md#add-ingredient) for the coven dialog and the compendium dialog.
- **A new entry with near-duplicate matches showing is not autosaved** until the matches are dismissed or the name changes (`heldBack` in `values.ts`).
- **An explicit Save also sends `expectedRevision`.** A stale Save hands over to the autosave's conflict notice. After a create by Save the form is clean, so Save waits for a change.
- **Writes are serialised.** Save and the autosave share one write path, and each write waits for the one before it, so a create is never raced by a second create.
- **An identical write is skipped once the row exists.** If the input matches the last one sent, the row exists and no revision was named, the write returns the earlier answer instead of sending. A compendium end-redirect save is never skipped.
- **The blur flush is held while Save is submitting.** Pressing Save disables the button, which moves focus out of the form; the form stops that focusout reaching the autosave until the submit ends, so the autosave cannot create the row before Save has asked about duplicates.
- **`persist` reads whether the write created the row.** The write itself records that it created the row, so the id is handed to `onCreated` only by the write that made it, even when a queued write ran first.
- **Conflict.** Another tab's save makes this one's refused with "This ingredient was changed elsewhere." **Reload Latest** reloads the page (or calls `onReload`); **Keep My Version** sends the form over the newer revision.
- **Offline.** A failed save retries after 2, 5 and 15 s, then shows "Couldn't save." with Retry. The form stays in the local mirror, which Retry clears when the save lands. A reopened form with a mirror newer than the row shows the recovery banner.
- **No Discard question.** The form no longer uses the unsaved-changes guard: Close saves first ([`modal.md`](modal.md#unsaved-changes)). Older passages here that describe Discard Changes for this form are out of date. A viewer's form has no autosave and writes nothing.

## After a save

**Two saves** on a new ingredient, the owner's call during MB.131; an edit
has the first alone. **Save Ingredient** is the
primary, a `.btn--solid`, and first, so it is the form's default: Enter in a
field presses it. It saves and asks the page to open what it made, passing
`'open'` to `onSaved`. The form navigates nowhere itself: the page that
holds it does, M5.5's admin page and M8.16's modal, so the form never leads
to a page of its own, and the
workshop needs no router. The shell's add button pushes
`/coven/[slug]/ingredients/[id]` (M8.19) for the saved ingredient on Save Ingredient, and
not on Save & Add Another. Its form is about to go, so it keeps its values.
**Save & Add Another** is the secondary, a plain `.btn` beside it: it saves,
passes `'another'`, and leaves the form blank for the next ingredient. Which
was pressed is the submit event's `submitter`, read by its `value`; a submit
with none is Save Ingredient's.

After either, the form says what it saved, "Saved Testwort.", in a
`Notice` of the `success` kind, an `<output>`, above the fields where a
refusal's alert goes, and so at the form's width; the next submit drops it. The message is the
form's own rather than the wrapper's: the form is the one place that knows a
save just landed, and a wrapper is still told through `onSaved`.

After Save & Add Another the form resets to its empty values — every field,
every list and every box — and Name takes the focus. Nothing is marked
invalid, since a reset clears the submit with the values. A refused save
keeps everything as typed, so the user corrects rather than retypes. The
reset is an effect on a count of landed saves rather than on
`isSubmitSuccessful`, which a save held on the duplicate warning sets too,
and it comes after react-hook-form's own end-of-submit update. The focus
finds Name in the page, as the error focus does: `setFocus` reads a ref the
reset has just dropped. An edit's save is
["On the compendium"](#on-the-compendium)'s.

## Undo and redo

The form has an undo and a redo (M12.10), the same `useFormHistory` that
[`field.md`](field.md#undo-and-redo) describes. It is wired on the form's own
`<form>` ref and switched off, as the chords and buttons are, while a question
is asked over the form (the discard guard, a delete, or the form's own
`question`). The modal's header row holds Open All at its start and the joined Undo and
Redo pair at its end: `FormHistoryButtons` is drawn just after the Open All
portal, and the pair's own `margin-inline-start: auto` carries it to the end.

**An add and its draft clear are one step.** Adding a variant or picking a reference clears its typing box first and then adds the row, because the field array reports its new row to the form's history in an effect while `setValue` reports at once; clearing second would hide the row from undo. One undo takes the row out and gives back the typed text.

**Two resets clear the history.** A step that leads back past a save would
undo what the server now holds. After Save & Add Another's `reset(EMPTY_VALUES)`
the form calls `history.clear()`, and so it does after an edit's save, where
the form resets to its own values (`reset(getValues())`) so the saved values
become the new start. The first undo after either has nothing to undo.

**A restore opens what holds the field it wrote.** Undo can change a field
that sits in a closed section, so `onRestored` turns the changed paths into
sections with `sectionsRestored(names)` in `values.ts`, the way
`sectionsWithErrors` does for an error: a box's draft counts as its list
(`drafts.colors` is Colours), and a path under `variants.N` opens Variants and
then that variant's own section. The ingredient's sections open through the
form's `open` set. A variant's open state lives in `useVariantFolds`
(`variants.tsx`), which also holds the open card, so the form can reach it:
`reveal(index, sections)` opens the card at that place and those sections of
it.

**A restored variants list is reconciled with the folds.** Adding, removing or
reordering a variant changes the list, and the folds are held by place, so a
restore would leave each fold on the wrong card. `reconcile(from, to)` matches
each row of the list being restored to a row of the list as it stood, by
`variantId`, else by its form text folded, and carries that row's open
sections across; an old row is matched at most once, so two unsaved
rows with the same form text are told apart by their order. A row that is not matched is one returning from a removal: it
opens fully and becomes the open card. If nothing returns, the open card stays
on the same variant, or none if that variant is gone. The step's `before` and
`after` are swapped on a redo so `from` is always the list as it stood.

**Focus after a classification pick.** Picking a classification can empty the
formal name in the same step, so the first changed field is not the one the
user acted on. `onRestored` returns `'nomenclature'` when it is among the
changed names, and the hook focuses Classification.

**Focus after an undo lands on a list's box or the returned variant.** A chip
list has no control of its own to name, only its typing box (`drafts.<list>`,
or `variants.N.drafts.<list>`), so `onRestored` maps a changed list to its box
with `listBoxOf` in `values.ts`, and the hook focuses it. A step on the
variants list is the exception: `reconcile` returns the index of a row that
came back, and focus goes to `variants.<i>.form`; a step that only removed a
row focuses `drafts.variants`, the New Form box. The categories picker names
its box the same way (`boxName`). A step that changes a plain field keeps
the hook's own order, the field itself.

**The reference panel has a history of its own.** The panel is a second form
inside this one, so the two must not share a list:

- The outer hook's `skip: isPanelState` keeps the `referencePanelOpen` paths
  (the form's note that a panel is open, which would otherwise be a step) out
  of its history.
- The outer `ignore` is `inReferencePanel`, a target inside
  `.ingredient-form__panel`. The panel's own listener runs first and calls
  `preventDefault`, and the outer one stands aside for a key already handled;
  `ignore` is the backstop for the moment the panel's loading shell is up and
  has no listener yet.
- `PanelForm` (`reference-panel.tsx`) runs its own `useFormHistory`,
  provider and `FormHistoryButtons`, in `PanelHead` before How to Cite and
  Close. They sit
  under a `HeaderSlotContext` set to `null`, so they draw there and never
  portal into the modal's header, which is the ingredient's.

So Ctrl+Z inside the open panel undoes a panel edit and leaves the ingredient's
Undo exactly as it was. `Modal` exports `HeaderSlotContext` for this.

## Forms are shown in title case

A variant's `form` is stored as typed. Wherever the site shows one, it passes through `formLabel` (`src/modules/ingredients/validation/form-label.ts`), which calls `titleCase` in `src/lib/text.ts`: each word and each hyphenated part is capitalised, the small words (of, and, in, on, the, a, an, or, for, to, with, at, by, from) stay lowercase unless first, and a word with an inner capital is left alone. This is display only. A field the user is typing into keeps their text, a suggestion fills the stored text, and the GraphQL output, the services and the seeds are unchanged. A label folds (`lower(btrim(x))`) to the same identity as the stored text, apart from a run of inner spaces, which the label collapses. the lint rule `sorrel/form-shown-through-form-label` flags a component that renders `.form` without it.

## On the compendium

With a null `workspaceId` the form writes a compendium entry (M5.5), the
site admin's, through the compendium mutations
([`graphql/schema.md`](../graphql/schema.md), "The compendium mutations").

- **An edit says so under the dialog's title** (M8.17). Editing a compendium
  entry, wherever the form opens (the admin Compendium, an entry's page, the
  public search for a curator), the form draws a plain `Notice`: "Changes are
  made to the Compendium, for everyone." An add carries none, and nor does a
  coven's edit. The wording is the owner's (2026-10-19), and
  `COMPENDIUM_EDIT_NOTICE` in
  `src/components/IngredientForm/compendium-notice.ts` is the one place it
  lives. In a modal it goes in the header, under the title and above the row
  holding Open All and Undo and Redo (the owner's call, 2026-10-19): the form
  portals it into the modal's note line (`useModalHeaderNote`,
  [`modal.md`](modal.md), "A control in the header"). It stands `space(2)`
  below the title, the gap the row has there in a dialog with no notice, and
  the row `space(2)` below it; the row keeps its own spacing to the form.
  Outside a modal it sits above the form. Being in the header, it stays in
  view as the form scrolls beneath it.

- **The classification is required.** `compendiumResolver` validates with
  `CompendiumIngredientInput`, whose `nomenclature` has no default, since
  every compendium entry declares one (DESIGN.md §5), and the select is
  marked required, where a coven's never is.
- **The form, celestial body, sign and deity boxes are pick-only** (MB.162). Each
  offers the curated rows alone, since a value only in use is one the
  services refuse, and lists them flat, under no From Compendium heading,
  since every row is the compendium's (`curated` dropped, so the combobox
  draws one bucket), with no typed row (the combobox's `offerTyped`) and, on
  a list, no Add (`ListField`'s `pickOnly`). Enter on text not picked adds
  nothing and says `Pick "Moon-ish" from the list` at the box, keeping the
  text to search on. A save is refused while such a box holds text, `Pick
"Moon-ish" from the list, or clear the box`, and while the form is typed
  rather than picked, "Pick a form from the list" — the resolver's, beside
  the box, before the service would. Folk names and colours stay free text,
  having no curated list.
- **Every lookup reads the compendium alone.** The folk names, the
  references and their panel, and the duplicate warning ask with a null
  `workspaceId`; the substitutes search `compendium(query)`
  (["The lookups"](#the-lookups)).
- **A new entry** has both saves, and sends `createCompendiumIngredient`.
- **An edit is the `entry` given.** The form opens on its values and has one
  save, Save Ingredient, off until something changes. It sends
  `updateCompendiumIngredient` with the whole entry, every field present and
  `formId: ""` for no pick, as the update input takes it (MB.159). Saved, it
  says "Saved Testwort." and resets to what it saved, so Save is off again
  until the next change.
- **The categories are MB.126's field, here as on a coven's form.** An
  edit opens with the entry's picked, and the update, which replaces the
  whole entry, sends them all, so categories left alone stay
  ([`design-decisions/m5.5-admin-compendium.md`](../design-decisions/m5.5-admin-compendium.md)).
- **Delete Ingredient** stands apart at the far end of an edit's actions,
  `.btn--destructive`. Pressed, it asks `Delete
"Testwort"? It leaves the compendium, but any spell that uses it keeps it.`, or
  on a coven's own entry `Delete "Testwort"? It leaves the coven, but any spell
that uses it keeps it.`, with
  Delete, destructive, and Keep It, quiet, as
  [`GroupedValueForm`](grouped-value-form.md) asks: on a card over the form,
  centred in the part in view however far the long form is scrolled, the
  form dimmed and held until it is answered, the focus on Keep It, its safe
  answer, and back on Delete Ingredient once Keep It puts it away (MB.115,
  the owner's call; [`modal.md`](modal.md), "Asking over the form"). Delete sends
  `deleteCompendiumIngredient`, or for a coven `deleteIngredient(id,
workspaceId)`, busy until the answer, and calls
  `onDeleted`; a refusal drops the question and shows the server's message
  as an alert above the fields. On a compendium entry the question also shows
  how many covens use the entry (M12.25): `DeleteUsers` reads
  `compendiumEntryUsers` when the question opens and renders a status line
  only once the number arrives, so a slow or refused read leaves the question
  as it was. It is a count and never names a coven, and Delete stays
  unconditional.
- **MB.82's question.** A save taking an address another entry still
  redirects from is refused at `['endRedirect']`
  ([`db/ingredient-slugs.md`](../db/ingredient-slugs.md), "Ingredient
  slugs"). That issue is no field's, so the form asks over itself, as the
  delete does: the server's message, then **End Redirect & Save**, which sends
  the same input again with `endRedirect: true`, and **Keep It**, which
  drops the question and sends nothing, the entry left as typed.
- **Unsaved changes** (MB.115, the owner's call). The form hands
  `formState.isDirty`, the flag that turns the saves on, to the shared guard
  ([`modal.md`](modal.md#unsaved-changes)). Its question comes before any
  other and takes its place until answered; Discard Changes closes as Cancel
  did. Every question's buttons stand on the card's `.modal__actions`
  row, the form's own `.form__actions` staying beneath the card. The form's
  row is the shared [`FormActions`](field.md), its two saves passed to it,
  and its Delete and End Redirect & Save questions the shared
  [`ConfirmQuestion`](modal.md), which also puts the unsaved changes' first.

**On the admin page.** `/admin/compendium` opens the form in `Modal`'s wide
size from its address, as `/admin/categories` opens GroupedValueForm: `?new` an
empty form, `?edit=<slug>` the entry at that slug, through
`resolveCompendiumSlug`. An edit's head is the eyebrow "Edit Ingredient" over the entry's saved name and its formal name, in italics for a binomial (`editHeading` in `page.tsx`; [`modal.md`](modal.md), "An edit dialog's head"), so it follows a rename once Save Ingredient re-reads the entry. An old address redirects to the entry's current
`?edit=`, and one naming nothing opens nothing and says so in an alert above
the list. The edit's values are built on the navigation by
`entryValues(entry, session)` in `src/app/entry-values.ts`, `server-only`, from the services
`Ingredient`'s fields resolve through — folk names, categories, substitutes,
deities with their traditions, references with their citations, and its
variants, each with its pick and group and its own categories, substitutes
and references (MB.221), a linked substitute carrying the forms its second
picker offers — so opening the modal sends no browser read
(CLAUDE.md rule 1). `compendium-dialog.tsx` is the client glue, a
`RouteModal` ([`modal.md`](modal.md), "RouteModal"), in the default width, that closes back to the
list, with a router of its own for what RouteModal does not do: Save
Ingredient replaces the address with the saved entry's `?edit=`, at the
slug its name now spells; Save & Add Another stays on `?new`; a delete,
Cancel and the modal's close replace it with the list's, filter and cursor
kept; and each refreshes, so the list re-reads. A near match opens its own
modal over the same list, in a new tab. Why a modal, and `?edit=` after a save:
[`design-decisions/m5.5-admin-compendium.md`](../design-decisions/m5.5-admin-compendium.md).

## One error element, two sources

`FieldError` is the one element any field's error renders through: a
`.field__error` paragraph whose id the control lists in `aria-describedby`,
with `aria-invalid` set beside it. The resolver's issues and the server's
`fieldErrors` both reach it through react-hook-form's error state, so a
server-only rule draws exactly as a schema rule does. The tests prove each
source marks its field invalid and described; that it is one element is the
code's, not a test's.

Both sources go through **`fieldNameOf`**, which turns an issue's path into
the form's field name:

| Path                           | Field                                                                   |
| ------------------------------ | ----------------------------------------------------------------------- |
| `['name']`                     | `name`                                                                  |
| `['folkNames', 2]`             | `folkNames.2.value`, the third entry                                    |
| `['elements', 1]`              | `elements`, the whole control: its chips are not rows                   |
| `['variants', 1, 'formId']`    | `variants.1.form`, the variant's Form box, which made the pick (MB.169) |
| `['categoryIds', 1]`           | `categoryIds.1`, the second category picked: the picker's (MB.126)      |
| `['references', 1]`            | `references.1.value`, the second reference's row (MB.154)               |
| `['references', 1, 'locator']` | `references.1.locator`, its locator                                     |
| `[]`                           | none: the root alert                                                    |
| any path it cannot name        | none: the root alert, rather than an unseen error (`drafts` included)   |

The resolver returns an entry's issue at the entry (`folkNames.2`). The
form's resolver wraps `zodResolver` and moves it onto the entry's `value`,
which is where `fieldNameOf` puts the server's. An element's issue — a
repeat, which the form cannot make but a caller can, as a list's repeat
since MB.174 — arrives at the
element too (`elements.1`), and the resolver moves the first onto the field,
as `fieldNameOf` does.

**A list's errors are the list's.** An entry is not a control, so its error
cannot sit beneath one. The list has one `FieldError`, beneath its box,
reading each entry's message after the entry: "hedge fixture: This folk name
is already listed". The entry named takes the error edge, and its × lists
the message as its description. The box takes `aria-invalid` and the same
description, so it is what a failed submit focuses. **The categories'
errors are the picker's** the same way: its box takes `aria-invalid`, and
the pick named is edged ("The categories", above).

The form and its reference panel read a rejection through the shared
`readGraphqlIssues` (`src/lib/graphql-failure.ts`, MB.116):

| Failure                                   | Issues                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| `VALIDATION` with `fieldErrors`           | the field errors, each pathed to the input                                     |
| any other GraphQL error                   | one empty-path issue, carrying the error's own message                         |
| no GraphQL answer at all (a failed fetch) | one empty-path issue: `GENERIC_FAILURE`, "That didn't work. Please try again." |

The last two rows are `readGraphqlFailure`'s answer. The first is why the
form uses `readGraphqlIssues` rather than that reader, which answers only
the first field it finds: this form places every issue at once, a draft's
nested path included, through the shared `placeServerIssues` beside it,
which sets aside the redirect question's issue for the form to ask. The messages it cannot place are joined into the root one, each distinct message once (the owner's call, 2026-10-29: a rule the schema and the service both state used to print twice).

Each placeable issue goes in through `setError`, bar
`['endRedirect']`, which is a question rather than an error
(["On the compendium"](#on-the-compendium)). Every other issue joins one
root error. DESIGN.md §7 leaves a `FORBIDDEN` or `NOT_FOUND` to the page.
Until something wrapping the form does more with one, it shows as the root
alert with the service's message rather than failing silently.

**Announced from either source.** A failed submit moves the focus to the
first control marked `aria-invalid`, in page order. react-hook-form's own
`shouldFocusError` is off: it focuses in registration order and only a
registered field, and a list entry is neither. The form's effect runs on
`submitCount` instead. react-hook-form's last update of a submit carries the
new count and every error the submit found, whether the resolver set it or
the save's `setError` did, so the effect runs once they are all drawn. A
screen reader then reads the label, the invalid state and the error as the
field's description. The root error is a `.notice--error` with
`role="alert"`, rendered above the first field and only while there is one,
so its arrival is announced.

**Clearing.** The next submit replaces every error with the resolver's, and
editing a field in error revalidates it, which clears a server error as
readily as a schema one. That is react-hook-form's `reValidateMode`, `onChange`
after a first submit. A list revalidates on each add and each removal once a
submit has run, and removing an entry takes its error with it.

The submit is disabled while a save is in flight. The form is `noValidate`,
so no refusal is the browser's own bubble.

## Styling

Built on the form primitives in `_primitives.scss` ([`styling.md`](../styling.md),
"Form fields"): `.form` and `.form__actions`, `.field` with its label, hint,
control and `.field__error`, `.input` and `.textarea`, and
`.fieldset` with its legend for each list. Since MB.115 the shared pieces
around them are primitives too, where this form had kept its own copies:
`.field__label-row` puts each label and its info tip, or a legend and its
tip, on one positioned row, so an open tip lies above the label from the
column's edge rather than hanging off the icon; `.field__required` is the
asterisk; and `.form__aside` pushes an edit's Delete Ingredient to
the row's far end, away from the saves, as GroupedValueForm's Delete
Category is. A narrow form stacks its buttons. A question is the modal's
`ConfirmOverlay`, a card over the form ([`modal.md`](modal.md), "Asking over
the form"). The alert is a `Notice` of
the `error` kind ([`notice.md`](notice.md)), the reference panel's too,
Save Ingredient is the view's one `.btn--solid`, and every button that
waits on a request (the two saves, End Redirect & Save, Delete and Save
Reference) is a `BusyButton` ([`busy-button.md`](busy-button.md)). A
disabled field's dashed edge and dimmed label are the primitives' too; a
closed set's box and its muted placeholder are the combobox's.

The Toxic switches, the ingredient's and each variant's, stand at the start
of the column with their label and hint, as the fields above them do, rather
than centred under the label as the switch primitive draws it for a filter
bar (`.ingredient-form .switch`; the owner's call, 2026-10-16).

**The duplicates notice is a block `Notice`** (M12.48), of the `warn` kind
while the name is typed against and the `error` kind once a save is held,
since it holds a sentence, a list and a button, which an inline notice's
`<p>` cannot. The skipped-copy notice is one too. Neither writes a `notice`
class by hand. Colour must not be the only sign of a held
save, so the sentence changes with the state too: "Did you mean one of these?"
while the name is typed against, "Your save is on hold, as these entries have a
similar name. Check them, or create this one anyway." once Save has been pressed
and held, and the exact-name question's own sentence, which was already
different (MB.120). `DuplicatesNotice` and its two phone stories show the
warning and the held state one above the other.

The component's own stylesheet holds what is the form's alone. Its column
is at most `$dialog-column` (32rem), narrower than the measure as the other
forms keep, and the compendium's modal is the default one, no wider than the
form: everything, the panels included, sits inside this column, so the wide
modal M5.5 chose only drew an empty strip beside it (MB.115, the owner's call). It lays out the row a list's box shares with Add, and sets a list's
legend and its box a step further apart than a single field's label and
control. The duplicate warning's region cancels the field's gap while it is
empty, since a live region stays in the page, and its notice puts the gap
back, with a step more padding beneath Create Anyway than the notice's own.
The ingredient's sections are `CollapsibleSection`'s own look, flush between
hairlines ([`collapsible-section.md`](collapsible-section.md), "Styling").
A variant's sections fold the same way, flush between the
same hairlines inside the card, a step closer for the narrower card: each
heading block `space(2)` deep above and below, its `h4` at 1.125rem, the
fields `space(4)` apart, `space(3)` short of the next hairline, and Done
`space(3)` beneath the last. The
references are one-line rows on the card surface with a 2px muted bar, the
short form, cut with an ellipsis where the row is too narrow, and its
locator in the muted caption, then two
24px icon buttons in the muted ink, the remove answering in the wax as a
chip's × does; an open row wraps the citation and shows its tier and the
locator, a 10rem box beside its label. Each variant is a card on the card
surface with a 1px muted edge, the error red's when it holds an error, its
line the form in weight 500, the group and the summary muted, and its pencil
and × the reference rows' 24px icon buttons, level with the form's name at
every width: the × as a reference row's, and the pencil in `$accent`, on a
tint of it 20% into the card while pointed at, focused or open, each clearing
3:1 on the card (`tests/scss/tokens.test.ts`); open, its fields follow at the form's gap, Done at their foot. The
new reference panel is a group set off by the same 1px muted edge. The
hidden variant fields and a row's closed detail are hidden by the `hidden`
attribute, which each restates as `display: none` because its own display
rule would otherwise undo it. Lengths come from `space()` and `radius()`,
and those left raw, the bar, the locator's width, the edges and the
section heading's size, say why in a comment.
The box, its entries and its list are the
[`Combobox`](combobox.md)'s: an entry is a filled, square-cornered chip in
the muted ink's wash, neutral since a free-text entry has no category group
to take a colour from, and the entry an error names takes the field's error
edge. Its × is a 24px target, WCAG 2.2's minimum, inside a chip too short for
44px. An ordered list's chip leads with a muted grip, and chips wrapped onto
several rows sit a step of space apart, more than along a row (MB.170), the
combobox's styling both.

**A long entry is cut off, never wrapped or let run** (MB.133). The entry is
the Combobox's `ComboboxEntry` since M5.10a ([`combobox.md`](combobox.md),
"An entry"), and the rule is drawn there: a chip is no wider than the control,
and its text ends in an ellipsis where the control does, so every chip stays
one line and nothing scrolls the page sideways at 320px. The × never shrinks: the text gives way. The whole text
stays reachable three ways: it is the entry's text in the DOM, so a screen
reader reads it in full; the × is still named by it; and a tooltip,
`role="tooltip"`, shows it above the chip while the entry is hovered or its
× has focus. It is [`InfoTip`](info-tip.md)'s bubble and fade, through the
`tip-bubble` mixin, and like InfoTip's it stays in the page while closed,
faded out and `aria-hidden`, so it fades out as well as in. The tooltip
opens only on an entry that is cut off, measured as it opens, closes on Escape
(WCAG 1.4.13), waits 150ms before closing as the pointer leaves, as InfoTip
does, so the pointer can cross onto it, and breaks an unbroken text anywhere
to stay inside the column. On touch it opens from the emulated hover a tap on the
entry's text fires. List entries take no length cap: the layout holds any
length, and no other text field has one either.

## Stories

The promote control has its own stories: `PromoteControl`, `PromoteQuestion` (clean), `PromoteQuestionWithChanges`, phone dark and light, and `PromoteQuestionCoven`.

[`index.stories.tsx`](../../src/components/IngredientForm/index.stories.tsx),
titled "Ingredients / Ingredient Form":
`Blank`, unframed, with every lookup answered and the save faked (MB.131),
under a "What to try" panel saying what to type for each state: the
suggestions, free text, the duplicate warning, the missing name, the
classification coupling, a pick of a form or a deity, moving an entry, text left in a box, a
repeated entry, a long entry,
the two server refusals, a save, and the references: picking sources,
a locator, the panel per kind and its refusals. The workshop has no API, and on staging
its pages may not fetch at all ([`workshop.md`](../workshop.md), "On
staging"), so the story answers the form itself: while it is mounted it
stands in for `window.fetch`, which the client wrapper looks up on every
request, and answers a request to `/api/graphql` naming one of the eight
lookups, the categories, or either save, from invented rows filtered by what was typed. Each
answer is checked against its query's generated type with `satisfies`, so a
fixture that drifts from the schema stops compiling. A name holding "cat"
shows the duplicate warning. `DuplicatesNotice`, with a phone dark and a phone
light, draws the warning and the held state in one column from fixed state. A save is answered after two seconds
(`SAVE_DELAY_MS`), so Save can be watched busy and shut with its spinner: a
name holding "taken" is refused as a `VALIDATION` error on the name, one
holding "refuse" as a `FORBIDDEN` above the fields, one holding "retired"
with a category picked as a `VALIDATION` error on the first category, and
any other is saved,
under a fresh id. The categories are two invented ones under each of the
seed's eight groups, in the seed's colours, copied from `src/db/seed/category-groups.ts`, which a component may not
import. Its three sources are invented, in both tiers, one a web
page with a long address, and each citation is rendered by `citationText`
as the server renders it; a new source is answered the same way, after the
same pause, and refused by its title as an ingredient is by its name. The workshop has no page to open, so after Save Ingredient
the story says beneath the buttons where its page would go,
"/ingredients/<id>", in a `.story-note` from `.storybook/story-frame.scss`;
Save & Add Another clears it.
`Compendium` and `CompendiumEntry` (M5.5) are the form on the compendium,
new and given an entry to edit, on the same stand-in, which also answers the
compendium's substitute search and its three writes: a name holding
"redirect" meets MB.82's question until it is sent again confirmed.
The original `fetch` is put back on unmount. The TanStack Query client is the
workshop's global provider's: a second provider would split the cache. This replaces M5.10's
`DuplicateWarning` story, which filled that cache ahead for one exact name.
`CompendiumEntry` holds two linked substitutes, Fixturewort and Testwort in
its oil, and a typed one, Hedge Mockroot, so both kinds of chip show; the
stand-in answers `IngredientSummary` for each invented ingredient, and
`CompendiumEntrySubstituteSummary` is the same entry with Fixturewort's
summary open (MB.115). It also holds three sources, so its rows show each short form —
a book with a locator, an article by two authors with one, and an
authorless web page — and two forms,
Dried leaf carrying a safety note, its own toxic flag (the entry's is off), a celestial body, two categories, a source and
two substitutes of its own, Fixturewort in its Whole root form and the name
Hedge Mockroot, and Whole root carrying nothing, so both summary lines show;
`CompendiumEntryVariantOpen` is the same entry with Dried leaf opened by its
Edit (MB.115), its own sections closed to their lines;
`CompendiumEntryVariantSectionOpen` opens Dried leaf's Correspondences too,
and `VariantAdded` is a coven's new entry with Oil just added from the New
Form box, every one of its sections open. `CompendiumEntryCopySkipped` adds Mockleaf, in no form, to
the ingredient's substitutes, opens Dried leaf and its Relations and presses its Substitute
Ingredients' Copy From Ingredient: Testwort links its Dried leaf, and the
notice beneath the list names Mockleaf with Copy Anyway;
And `CompendiumEntryEditSource` is the same entry with its first
source's row open and Edit Source pressed, the panel prefilled; the stand-in
answers `Reference` from each source's whole fields and keeps what
`UpdateReference` saves. `Compendium` and `Blank` show a new entry's sections all open,
`CompendiumEntry` an edit's all closed to their summaries,
`CompendiumEntrySectionOpen` the edit with Correspondences open, and
`CompendiumEntrySaveError` the edit, a colour left in its box, submitted
once drawn: Correspondences opens on the error, flagged, the box focused
(MB.115). `CompendiumEntryInModal` is the edit in its modal.
`AskingToDeleteInModal` opens every section, scrolls to the foot and presses
Delete Ingredient, and `AskingToDiscardInModal` types a change, opens every
section, scrolls half way and presses Close: each question over the long
form, centred where it was scrolled to (MB.115). The stories that open
something inside an edit open its section first, as a person would. The toolbar viewport menu shows any of them at 375px. On a phone the
compendium's modal stays inset, the page in view on every side, rather than
a full-height sheet: the owner's call in M5.5, kept at MB.115's design
review. Its shape is `Modal`'s, the wide dialog less the modal gap
([`modal.md`](modal.md)).

## Testing

Thirteen files hold the form's own tests, split along the owning layer (MB.181,
MB.182; [`testing/layer-ownership.md`](../testing/layer-ownership.md), "The
owning layer"): `index.test.tsx` for what needs the whole form,
`compendium.test.tsx` for what the compendium's mode changes,
`variants.test.tsx` and the three beside it for the Variants section, `sections.test.tsx` for the
folding sections, and six for
parts of it on their own — `list-field.test.tsx` for a list field,
`lookups.test.tsx` for the Form box and a list's box with their lookups,
`duplicates.test.tsx` for the name field and its warning,
`references.test.tsx` for the References field, `reference-panel.test.tsx`
for the new reference panel, and `substitute-summary.test.tsx` for a
substitute list's chips: a linked one a button that opens a dialog and a
typed one text alone, nothing read until one opens; the summary read for
the coven, showing the classification, the form named, and the
ingredient's and the form's lists together; the entry's link where the form
is given one; and a failed read's alert and Try Again (MB.115). What the box, its chips, its handles and its
closed-set variants do is Combobox's
(`tests/components/Combobox/index.test.tsx`, which also drives the select-only
box by the keyboard), what the picker does is CategoryPicker's, and the
debounce itself is `tests/lib/debounce.test.tsx`'s; none of it is repeated
here. The lookups are answered through
`tests/support/msw/ingredient-lookups.ts`, each recording the variables it was
asked with, and run on fake timers that still advance, so the mocked answers
arrive; a later answer wins, so a test about one answers it after rendering.
The panel's `CreateReference` is answered there too, by `acceptReference`,
and an edit's `Reference` and `UpdateReference` by `offerReference` and
`acceptReferenceUpdate`.
Role and label queries only, in the `dom` project.

`sections.test.tsx` holds the folding sections (MB.115): a new entry's all
open, its fields in view; an edit's all closed, each heading described by its
summary, Identity's reading the entry's own name and formal name; a heading
opening and closing its own section alone; Open All and Close All reaching
every one; a value typed surviving its section closing and opening, the same
box never unmounted, the summary reading it; and a save opening the closed
section holding the schema's error, or the server's, its field focused. An
edit opens closed, so a role query finds none of its fields until its
section is open: the other files open one first through
`tests/support/ingredient-sections.ts`'s `openSections`, by its heading, as a
person would, and a variant's through its `openSectionsIn`, within the card.

The Variants section's tests are four files (MB.221). Three render
`VariantsField` alone, inside a form provider with a Description box and a
Save button, from `tests/components/IngredientForm/variants-harness.tsx`,
which also holds their fixtures and locators; the fourth mounts the whole
form for what `index.tsx` adds around the section.

`variants-field.test.tsx` holds the section's own behaviour: an edit's
variants all closed, a field out of reach until Edit opens it
(`aria-expanded`, its region shown, the focus on its Identity heading); Done
folding it back with the focus on Edit and what was typed kept; one open at
a time; a variant added from the New Form box opened, the other closed,
listed first after the New Form box (MB.115), and sent in `variants` with no
top-level `form`; Add refusing a form not picked, and a repeat form, with no
second fieldset added; a variant removed by its own button once confirmed,
and kept open as it was on Keep It; an open variant's `h4` section headings
in the ingredient's order (MB.115); those sections folding (MB.115): an
edit's variant opened with every one closed, each heading described by its
line, the variant's own data in it; a variant added here with every one
open; a heading opening its own section alone, the ingredient's of the same
name left as it was; a form an admin has renamed refusing the save at the
Form field until Use or Keep settles it; and `useVariantFolds` carrying each
row's folds across an undo's restore, matching rows one to one.

`substitutes.test.tsx` holds a variant's substitute offers (MB.115): ranked
for its form, offered form by form after an any-form row, a typed name sent
as a name, the variant itself never offered. `copy.test.tsx` holds copying
from the ingredient (MB.115): a button per copied field, named for it; each
shut while the ingredient's field is empty and opened as it gains a value;
an empty text box filled and a filled one added to after a blank line;
substitutes linking the same form, one in no such form skipped and named,
and a name kept as a name; Copy Anyway adding the skipped as names; and the
notice taken away.

`variants.test.tsx` mounts the whole form: a compendium pick carried into
the variant's Form box; a typed compendium form refused beside its box,
focused, with nothing sent; a variant's remove question stepping aside while
the unsaved changes' asks; an edit's variant sent back by its `id`; a save
finding the schema's error in a closed variant opening it and its section,
the open one closed, its field focused (MB.115); a server issue at
`['variants', 1, 'form']` on that variant's box alone, its variant and
section opened; Close All and Open All reaching each variant's; a form row
sending `substituteVariantId` and an any-form row none; a link naming no form
refused on that entry alone, Relations opened; the copied lists gaining what
they lack after their own, none removed and none repeated, the focus kept,
Save opened, and every copy button the variant's; and undo and redo: an added
variant taken out and given back, the closed variant and section an undone
change was made in opened, and where the focus lands after one.

`tests/components/IngredientForm/index.test.tsx` mounts the whole form and
answers `CreateWorkspaceIngredient` through MSW: `mockGraphQLMutation` for a
saved row, and `mockGraphQLError` for a refusal, so the error body is the
route's own mapping; every lookup, and the categories, is answered empty as
the form mounts. Its `save()` focuses the button before clicking it, as a
real click does, since `fireEvent` moves no focus and a focus test would
otherwise pass on whatever an earlier step had focused. Its `waitFor` polls
every 5 ms rather than RTL's 50, since most of its waits are for a mock to
have been called, which no DOM mutation announces. A role query with a name
names every element of that role, which in a 25-field form was most of the
file's time, so its controls are found by their labels — the hidden `*` of a
required field dropped from the label's text. The saves are the one
exception, found by role and name across the whole form, since the class
that scoped them to the action row is a presentation detail a test may not
read (MB.115; [`testing/layer-ownership.md`](../testing/layer-ownership.md),
"What a test may assert", rule 4); it costs the file about a second. Every change on the form re-renders it whole, so a
test here costs its interactions rather than its mount, and each keeps to the
few it needs. It covers:

- **Saving**: a name-only stub, sent with `nomenclature: null` and
  `elements: []`, parsed by `LocalIngredientInput` as `none`; every field
  sent as typed, the elements in the order chosen; `onSaved` called with the
  returned row and `'open'` or `'another'`, Save Ingredient the default and
  keeping the form; the submit held down while in flight; every field, list
  and category pick cleared once saved, with nothing marked invalid and the
  focus in Name; a status naming what was saved, inside the form, until the
  next save; and a refused save keeping what was typed. The in-flight save
  test, on Save Ingredient, asserts both held down and the pressed one's
  `aria-busy` until the answer.
- **Resolver errors**: beside the field, focused, invalid and described, with
  no request sent, and cleared once the field is corrected.
  An issue with a variant's pick, or with its text, landing on its `form`,
  a variant's list entry, and a box still holding text are the resolver's
  own test, `tests/components/IngredientForm/values.test.ts`, mirroring
  `values.ts`, beside `fieldNameOf`'s rows for a variant's paths.
- **Server errors** — `fieldNameOf`'s routing: beside the field its path
  names, focused; on the list entry its path names; and one pathed to one
  element on the whole Element control. A variant's are `variants.test.tsx`'s.
- **The categories** (MB.126): the picks sent as `categoryIds` by id in the
  order picked, and `[]` with none; a pick alone enabling Save; an issue at
  `['categoryIds', i]` on the picker's error, naming the pick, the
  box invalid, described and focused and the pick's × described, with no
  alert, and cleared by taking the pick out; an index past the picks as the
  root alert; and the form still saving, with no categories, when they cannot
  be read.
- **Root errors**: an empty path, a path naming no field, a `FORBIDDEN`'s
  message and a failed fetch, each as an alert above the fields, cleared on
  the next submit.
- **The coupling**: the formal name shut and emptied for None, with its
  reason, open and optional under Unknown, and opened again for a named
  kind; a formal name with no kind saved and read as unknown; the issue that
  remains, cleared inline by changing the kind to Unknown or to None.
- **Fields**: Name alone marked required, the formal name while a named
  classification is chosen, and no classification for a typed formal name;
  and a variant's `form` as free text, sent as typed — the column's being text rather
  than a foreign key is
  `tests/modules/ingredients/schema/ingredients-schema.test.ts`'s. A hint behind its info tip is InfoTip's, and a
  list's box, chevron and handle are ListField's and Combobox's.
- **The duplicate warning**, what only the form does with it: a save held on
  a near match, asked about the name as sent, trimmed, for this coven, the
  name marked invalid and the focus on Create Anyway, and on it again at the
  next save; Create Anyway letting the save after it go; Save busy while it
  checks, then sending when nothing is close; and an error elsewhere taking
  the save first.
- **The lookups wired**, once per kind: the New Form box asking about this
  coven, its pick sent as a variant by id and cleared with the rest by Save &
  Add Another; and
  each of the five list boxes asking its own lookup about this coven, none
  before it is used, a pick from each sent in its shape — text for folk
  names, celestial bodies and signs, a deity's id, a substitute's ingredient id.

A linked substitute rendered only `ListField`, so its refused link, named by
its formal name too, is `list-field.test.tsx`'s; how a picked one reads and
is sent is `lookups.test.tsx`'s.

`tests/components/IngredientForm/lookups.test.tsx` renders `FormField` or
one `LookupListField` alone, in a `QueryClientProvider` and a form on the
form's resolver, and reads what a pick becomes from what the resolver hands
the submit — the input the form sends. The Form box: nothing asked until the
box is used, then once the typing settles, with the coven's id and the
settled text — the one debounce test of the lookups, `useLookup` being one
hook; the vocabulary first with each form's group and claimants, then forms
in use, under their headings, the typed row first; a pick filling the field,
showing its group in the box, read as its description, and sending its id; a
later pick of the other Wax replacing it, a group with no description the
whole of what the box adds; an edit away from the pick dropping the group and
the id; a form only in use picked with no id; and a value in no vocabulary
taken from its own row, with no warning and no id. The list boxes: a box
asking its hook's query about this coven once it is used, and not before, on
the folk names, `useLookup` being one hook under each; the common names in
use with their claimants, in one bucket, a pick adding an entry; the celestial bodies
curated apart from those in use, with descriptions, the signs sharing their
shape; a listed celestial body left out of the rows whatever its case, the typed row
offered for other text and withheld for a repeat; a curated deity with its
tradition, two of one name told apart; Greek and Roman Hecate picked as two
pills, each with its tradition and its description, sent as two ids; a deity
only in use added and sent as its name; each ingredient with its formal name,
the two of one name told apart by whose entry each is; a picked ingredient
saved as a link, its entry reading as it, its form and description its
detail; and a substitute added or picked as typed saved as text, with no
warning. The keyboard and a move are Combobox's and `list-field.test.tsx`'s.

`tests/components/IngredientForm/duplicates.test.tsx` renders `NameField`
with `useDuplicateWarning`, in a form whose save asks the warning's `check`
before it sends, as the form's does: an ask only once the name settles, with
the whole name trimmed, for this coven; none for a blank name, which drops
the last warning; each match linked and named by its label and formal name,
read with the field, and not marking it invalid until a save meets it;
nothing for an empty answer or a failed lookup, and the save let through; a
save held, and held again, while a match shows, the name marked invalid and
Create Anyway read with the warning; a save inside the debounce asking about
the name it sends and holding on what it finds; the hold lifted by editing
the name; Create Anyway clearing the warning and the name's error, focusing
the name, and the next save going; and the matches set aside staying gone
while a new one returns. A compendium match's + once its add has worked
(M12.48): AddIcon's check held `ADDED_HOLD_MS` and pressing it doing nothing,
then the eye on the same button, at once under reduced motion and faded in
otherwise; the row moving under In This Coven only once the eye shows, the
warning busy meanwhile and the focus going to the new row's eye, or staying
where it was moved to while the check showed. What the form sends for the +,
its status-region words and a refusal stay in `index.test.tsx`.

`tests/components/IngredientForm/list-field.test.tsx` renders `ListField`
alone, in a `FormProvider` on the form's resolver with a Name box beside it,
its suggestions given rather than looked up, as `LookupListField` gives them.
The behaviours independent of which list it is run over the two ways an
entry gets in — a plain list and a pick-only one, given a source since a pick
is its only way in: one empty box and no
entries at first, Add offered only where text is added; and an entry added,
the box emptied and kept focused, and announced by name. Once an entry is in
the two share every path, so these run on the plain list alone: an entry
removed by its ×, the focus back in the box; the last taken on Backspace in
the empty box and none with text in it; Clear taking every entry; and an
error naming an entry marking that entry alone, cleared once it is removed.
Once, on a typed box: Enter adding without saving the form; a blank box
adding nothing; a save refused while the box holds text, until it is added
or cleared, and the entries then sent. A repeat (MB.174): at a box with a
source, Add on text repeating an entry but for case and spacing
adding nothing, keeping the text, the box invalid and described, the refusal
announced, the focus kept in the box, and an edit clearing it so a
different entry adds; at a pick-only box, Enter on text not picked refused
with the text kept, an edit clearing it and a pick adding, and the curated
rows alone offered flat, less what is listed, with no typed row; a folk name
repeating the name, as typed in the Name box, refused and offered from no
source. The source beside the listed entries: a listed deity left out by its
id, Roman Hecate offered beside a listed Greek one and "hecate" typed beside
the link no repeat; a deity only in use left out once its name is listed,
its typed row withheld; a listed substitute left out by its ingredient's id,
its name added as typed text beside it, and a second typed one refused.
Moving (MB.170), on the ordered shape: a handle only where the list is
ordered; a move by keyboard announced, the focus kept on the moved entry and
the new order sent; and an error kept on the entry it names as another moves
past it. A move by pointer is Combobox's. Per shape, what differs: the
entries sent in order, less any removed, as text or, a typed deity or
substitute, as `{ name }`; the same deity listed twice, given, refused beside
the repeat, named with its tradition; and a refused substitute link marked
beside its pill, named by its formal name too (MB.140). `tests/support/sortable.ts`'s real 60 ms waits stay:
fake timers would couple to the dnd sensor.

The same file renders `MultiSelectField` alone, given its elements as an edit
would hold them: chips in the order held, the rest alone offered, and a repeat
the schema refuses marked on the Element control.

**The references** are `tests/components/IngredientForm/references.test.tsx`
(MB.154), which renders `ReferencesField` alone (MB.182), in a
`QueryClientProvider` and a form on the form's resolver, as `lookups.test.tsx`
renders a list's box, and reads what the field sends from what the resolver
hands the submit: the search asking about this coven only once the box is
used; each source by its citation and tier, none already listed and no typed
row, then "New Reference" last; a pick adding a row
beneath the box showing its short form, announced, the box emptied and
focused; a row's buttons named by its short form
and described by its whole citation, and, closed, its locator after the
short form, open, the citation whole; a row kept to one
line until its edit opens it (`aria-expanded`, the Locator focused) and
closes it again (MB.115); each row's locator
labelled and read with its citation and its tip, and tidied as it is left; the
× removing a row once confirmed and keeping it on Keep It; Backspace and
Delete in the empty box taking none; Enter with nothing picked submitting nothing;
a search left in the box, and an open panel, each stopping the save. The panel
from the field: opened by the create row, "New Reference", taking you to
Kind, and again while it is open; a source it saves listed by its id and
shown by its short form,
the panel closed, the new row open on its Locator, and sent with the ingredient; and Cancel
closing it, adding nothing, the focus back in the box. Two tests mount the
whole form, for what only it does with the field: each source sent by its id
with its locator as typed and no citation, parsed by `LocalIngredientInput`,
and the rows cleared, the panel shut, by Save & Add Another; and a server
error naming a source on its row alone, the box focused — `fieldNameOf`'s
references branch and the form's focus, which no list entry's test reaches.
`[]` for no references is `index.test.tsx`'s whole-input test.

`tests/components/IngredientForm/reference-panel.test.tsx` renders
`ReferencePanel` alone, asked for again by a rerender that raises its
`summons`, as "New Reference" does: Kind focused and nothing else shown as it
opens, and Kind focused again, what was typed kept, when it is asked for
again; each of the five kinds showing exactly its fields, the
required ones marked; a resolver error beside its field, focused, with nothing
sent, and a server field error on the element it uses; a refusal naming no
field as an alert inside it; a save sending the coven and only the chosen
kind's fields, a blank day as null, and handing back the saved source; Enter
in a field saving the source, held back from the form around it; each field
tidied by its own format as it is left; Save Reference held down and busy,
with Cancel, while in flight; and Cancel sending nothing. The
formats and checks themselves are tested where the schema is,
`tests/modules/ingredients/validation/` — `reference-format.test.ts`, and
`reference.test.ts` for a chapter, an article or an entry with no container, a
web page with no address or day, and a published date with no year — with the server's storing of them in
`services/references.test.ts`.

**On the compendium** is `tests/components/IngredientForm/compendium.test.tsx`
(M5.5), holding only what the mode changes (MB.182), with the compendium
mutations answered by MSW. A new entry: the classification marked required and
a save refused without one, then a create sent with `categoryIds: []` and
`'open'`, Save & Add Another kept; where a near match links, taken
from the page; and, in a modal, Cancel and Escape asking before a change is discarded. The lookups: every one asked with a null `workspaceId`, the
New Form box offering no typed row; substitutes
from `compendium`, less the entry itself. A variant's Form box and a deity's box
alone, on `compendiumResolver`: the Form box offering the curated forms alone,
flat, with no typed row; and a save held while a pick-only box holds text. A
typed form refused is `variants.test.tsx`'s. What a pick-only list does on its own — the curated rows alone
and flat, Enter on text not picked refused — is `list-field.test.tsx`'s. An
entry given: its values shown, one save, off until something changes, and the
update sent whole, its categories carried through; the duplicate warning
leaving the entry out, and a rename near another entry naming it but saving
at once, with no Create Anyway; MB.82's question, Keep It sending nothing and End
Redirect & Save sending again with `endRedirect: true`; and a refused delete's alert, and a confirmed delete calling `onDeleted`.
In a modal, the delete's and MB.82's questions are asked over the form: the
form inert while each asks, the focus on Keep It, both given back on Keep It,
and Delete deleting from over the form.
An entry's categories shown picked, and a pick beside them sent, are
CategoryPicker's and `index.test.tsx`'s.

Role and label queries only. It runs in the `dom` (happy-dom) Vitest project —
`npm run test:coverage`.

**Accessibility is asserted in Playwright** (CLAUDE.md, Testing), once a page
holds the form: `tests/e2e/admin-compendium.spec.ts` scans M5.5's admin page
with the list, the empty form in its modal, a lookup open inside it, and an
edit just saved. The coven's add and edit modals (M8.16, M8.17) carry no
scan of their own yet.
MB.154's References field was driven in a browser — Storybook's story through
the `playwright-server` service, at 375px in both themes — and scanned
with `@axe-core/playwright` at each state: the suggestions open, three
rows, the panel refusing a chapter, a web page's fields. No WCAG 2.2 AA or
best-practice violations from the field, and no sideways scroll; the
frame's page-level rules (a `main`, an `h1`, landmarks) were left out, as
the story is a fragment. Until then the form was scanned by hand in M5.9, against the workshop story
in both themes, blank, after a failed save, with a tip open and with the
formal name shut: no WCAG 2.2 AA or best-practice violations. M5.10a's
combobox was not scanned in a browser, the devcontainer having none; its
ARIA is Downshift's, and M5.5's spec is the first scan over it: it found
the buckets' `group` role on an `li`, fixed in the Combobox, and passes. Axe could not
decide the contrast of the selects, whose chevron is a gradient, or of a
field an open tip overlaps. Those were measured instead: the placeholder
4.70:1 light and 6.69:1 dark, and an open tip 5.6:1 and 6.59:1.

## Submitting and focusing the first error

`useOnEachSubmit` runs while rendering, once for each new `submitCount`, which is React's pattern for state that follows a value. A save's last update carries its count together with every error it found, whether the schema's or the server's. A fold opened there is therefore open in the same commit that draws the error, so the form never paints a closed fold with its error inside.

`useFocusFirstInvalid` is a layout effect, so the focus moves in the commit that draws the error. A passive effect would leave a gap in which the error shows and the focus has not moved. It stands in place of react-hook-form's `shouldFocusError`, which focuses in registration order and only a registered field, and a list's entry is not one.

An issue naming a picked category lands on the picker's one error element, named by the pick, the way a list entry's does.

## Questions the form asks over itself

**Remove.** A variant's × had read as closing its card, and a reference row takes more typing than a chip to put back, so both ask before removing. The form's own question card (Remove and Keep It) is the one way of asking. `RemoveQuestion` runs `onRemove`, which removes the row and stops asking, then `afterRemove` once the card has gone and handed the focus back. The pressed × went with its row, so the focus goes where the list says, not to the form's first field. `flushSync(onRemove)` commits at once, the card's cleanup with it, so the focus that cleanup gives back is moved on after it, not before.

**Promote.** `promote.tsx` is written for either tier, a compendium entry (a null `workspaceId`) or a coven's ingredient. The question always comes first. With unsaved changes it offers Save & Promote, which runs the form's own save first and promotes only if that landed, and Discard & Promote, which puts the form back to its saved values. Cancel sends nothing. The question steps aside while the unsaved-changes question asks, as a removal's does. Its four tiers are told apart by type as well as by space: the question as the card's heading, naming no name because the panel beneath names both; the swap on a tinted panel; the compendium's reach as a muted aside; and, ruled off above the buttons, the question they answer. The promote question's term overline takes the `.eyebrow` look, so the names carry the weight.

**Delete users count.** The count of users is not kept after the question closes, so the next one asks again. A failed read leaves the question unadorned, since the delete itself needs no count.

**Panel changes.** `panel-changes.ts` reports a panel's typed edits to the unsaved-changes guard. Without it the guard would let the modal close over them.

## Reading another entry in the form

The substitute summary and the Quick Look both make one read of the `ingredient` query through `/api/graphql`. The query already serves an entry by id in the compendium's tier or a coven's own and the compendium's, and never another coven's, under the service's own check. Nothing is new on the server.

The Quick Look is not the list's `DetailsDialog`, which is a route modal its server page fills. This one has no route to change. Its answer is cast to the entry page's shape, so the modal's head and body are the details modal's own components. The summary and its marks read only the fields asked for, and the rest of each row (its audit ids, its slugs) is nothing they draw. Substitutes and references are the page's alone.

The head before the entry arrives is the details' own head with the formal name known. With the formal name unknown, a line skeleton stands where it goes while the read is out, or nothing does after a failed read. It never reads "Not yet looked up", which would say the entry has none.

## Section summaries

An empty section and a variant carrying nothing read the same way, "Nothing yet". A variant's section line reads its Identity as its Form, "Dried leaf (Plant part)", and the rest as the ingredient's sections of the same name do. Each section's summary watches only its own fields, so a keystroke re-renders one line.

## Suggestion lists and fields

The form and folk-name lookups, and the celestial-body, sign, deity and substitute ones, each wait for the typing to settle, ask `/api/graphql` for a page, and shape the answer into the combobox's rows.

- Celestial bodies, signs and deities suggest from their curated vocabularies and the values in use. A pick adds the text, and a curated deity's pick is also a link to it. Substitutes suggest from the compendium and this coven, and a pick adds a link to the ingredient.
- On the compendium, celestial bodies, signs and deities are picks of the curated rows alone, and the substitutes are its other entries. A pick-only box lists its rows flat, because with every row the compendium's a From Compendium heading would tell the admin nothing.
- Celestial bodies, signs, colours and deities keep the order entered, so their entries move. Folk names and substitutes read alphabetically, so theirs do not.
- The Form field's box shows a curated form's group, which the text alone cannot: Wax under _Animal_ and under _Substance_ both read "Wax". A pick of a curated form links it. The text stays the member's to edit, and an edit away from the picked name drops the link, leaving typed text. On the compendium the field must be a pick, with no typed row.
- A pick an admin has since renamed asks the member, beneath the box, to use the new name or keep the text, which unlinks the pick. The resolver holds the save until one is pressed. Only a coven's variant can hold a stale pick, because an admin renaming a curated form rewrites the compendium's own rows.

`SuggestField`, `ToggleField`, `MultiSelectField` and `ListField` stayed in the ingredient form, where it grew them, rather than moving to `../Field` as generic fields. `CupboardEntryForm` imports `ListField` and `MultiSelectField`. A multi-select's chips sit inside the control, as a list's entries do.

## Variant fields and their folds

A form is added from the New Form box as a list's entry is, refused there when the ingredient already comes in it, and taken out by its own Remove. Each variant's fields stay in the page while closed, hidden, so nothing typed in them, an open reference panel included, is lost by closing it. They are the ingredient's own field components at the variant's place in the values (`variants.1.celestialBodies`), so they validate, err and focus as the ingredient's do.

The open state of each variant's sections is a list beside the variants, by place. It is kept in step as the box adds one first and a Remove takes one out. The form holds it, as it does its own sections' state, so that a save opens the section holding an error and Open All / Close All reaches each variant's. A variant added here opens with every section open, as a new entry does. A variant an edit opened with, past the list's end, opens with every section closed, as an edit does.

When a restored list comes back, the folds follow the rows: a row kept keeps its folds, one that returns opens with every section open and takes the card, one gone is dropped. Rows match by `variantId`, else by form.

## The reference panel

The citation sub-form cannot be a `<form>` of its own, nested in the ingredient's. It is a fieldset running its own react-hook-form, with the ingredient form's own fields, and Enter in one of them saves the source rather than the ingredient. Opened on a source already recorded, it edits that one, prefilled with every field it has, and the change reaches every row citing it.

- **Head.** It holds the panel's Undo and Redo, any tip it carries, and a × that closes it as Cancel does, so a long panel can be left without scrolling to its foot. The × stays last, is the one stop before the first field, is named for the panel (the modal around it has a Close of its own) and is held while a save is in flight, as Cancel is. The head's layout is under "Panel head layout" below.
- **Cite-how text.** It is said once for the whole panel, named by `aria-describedby` so it is read on entering. A title inside a title, the one format a placeholder cannot show, is in it. The rules are one to a line, as a list of spans given the list roles, because the bubble is a `span`, which may not hold a `ul`. Each rule is a sentence with its full stop, with an example in brackets before it, since the typed value has no stop.
- **Focus.** On opening to be filled in, the kind box, the panel's one combobox, takes the focus. It is found in the page at once, as the ingredient form finds Name, because `setFocus` waits a tick and would take the focus back from whatever a quick save had focused meanwhile. Asked for again while open, New Reference or "Add a reference" does the same.

## Copy From Ingredient

Copy From Ingredient brings the ingredient's own value for a field into the variant's, so a form that shares most of what its ingredient says need not have it typed twice. It adds and never takes away: a list gains the ingredient's entries it lacks, after its own, and a text gains the ingredient's after a blank line. It is shut while the ingredient's field, as the form holds it now, is empty.

A linked substitute is copied as "the same form": the linked ingredient's form that folds alike to the variant's (Oil for Oil). Where the ingredient comes in no such form there is none, since a variant's link names a form, never the whole ingredient. A typed name stays a name. The substitutes skipped are listed in the notice beneath the list, with Copy Anyway, which adds them as names only. Either control takes the focus back to Copy From Ingredient, since the pressed button goes with the notice. The notice's region is always in the page, as a live region must be to be heard, as the duplicate warning's is. The notice clears as it renders, not in an effect, so a stale notice never paints.

## How values become the mutation

`values.ts` builds the values as the mutation takes them.

- An unanswered closed set is null. Elements go as chosen, with `[]` for none, which the update input needs to clear them.
- A list entry is its text. A substitute or a deity is its link's id, or else its text as a name. Categories are their ids. The form is its text and its pick's id (null for typed text). A reference is its source's id and its locator as typed, never its citation.
- The boxes are left behind, since the resolver has refused a save while one holds text.
- Nothing is trimmed or dropped, as the schema does that on both sides, so an entry's index in an issue's path is its index here.
- A variant's issues also include the stale pair `MB.167` refuses at `form`.

**Pills.** A pill reads its text beside what tells it from a same-named one: a linked substitute's formal name, a picked deity's tradition ("Hecate (Greek)"), and for a substitute naming one form of what it links, that form after a dot ("Rosemary · Dried leaf"). A pill's tooltip leaves out what the chip's summary shows: a substitute's "Dried leaf · Compendium entry" (the form linked, or "Any form", and its tier) and a deity's description.

**A variant's substitute rows.** There is one row per form each found ingredient comes in ("Rosemary · Dried leaf (Plant part)"), since a variant's link names a form, never the whole ingredient. An ingredient in no form, which only a coven's information-only entry can be, is not offered. Typed text is the box's own row, a name only. The variant's own saved row is never its own substitute, as `ingredient_substitutes_not_itself` holds. Ranking puts forms folding alike first, then those in the curated group, then the rest.

**Duplicate checks.** The check reads the schema's keys: a link by its id, and typed text folded, among the typed entries alone, so a name beside a link is no repeat, as at save. The ingredient's `name` counts for a folk name. Folk names and colours have no curated list, so on a compendium entry the lists a pick is required of are the others.

**Default values.** The edit's default values give each linked substitute a `variantId` ("" for Any Form), because its Form of X box registers that key as it mounts. react-hook-form counts a key it adds against defaults that lack it as a change, and React's development double mount re-checks, so an untouched entry would have been asked about unsaved changes.

**Types.** A save answers the ingredient and, for a coven's new one, the jars it holds. A save moves no jar now, so the list comes back empty and the field is a leftover. A match's Quick Look is the details its list opens over the form. The admin's form has none to open, every match being the compendium's, so `quickLookOf` is left out there.

## Save & Add Another and the toolbar

Save & Add Another leaves the form ready for the next ingredient once the save has landed: every field and list empties and the name takes the focus. The reset is in an effect rather than in `save`, so it comes after react-hook-form's own end-of-submit update. The saves are counted rather than read off `isSubmitSuccessful`, which a save held on the duplicate warning sets too. The name is found in the page, as the error focus finds its field, because `setFocus` reads a ref the reset has just dropped and the field registers again only on the next render. Of the two saves, the one pressed says so while it is held.

Open All / Close All reads Close All while any section is open, so a press from any mix folds the form to its summary lines, the view the sections are for, and a new entry, all open, offers it at once. It reaches every variant's sections too. A variant's are in view only while Variants is open, which already reads Close All. It is off while the form asks a question over itself, as Undo and Redo are then, so a control that cannot be used reads as one. Undo and redo are off while a save is in flight, as its success handler resets over the values.

A deleted coven entry is deleted from this coven alone, and a spell holding it still reaches it. The update takes the whole entry and reads back what the create does but the jars, which a save has not moved.

## How the duplicate list behaves

This extends "The duplicate warning".

**Asking.** The "did you mean" list asks on the debounce the other lookups wait on. `opened` is the name the form opened with. Until the name has been typed in, nothing is asked or held, so an edit that leaves the name alone never warns. Once typed in, it asks as any name does, back at the opened name too. A near match not yet dismissed holds a save, which asks about the name being sent rather than waiting out the debounce. An autosave never holds on the list and never closes it: a save that moves `opened` on to the name typed leaves the list showing, until it is dismissed or the name changes. An edit's warning only names matches: renaming makes nothing new, so its save is never held and it offers no Create Anyway.

**What a match offers.** Each match is listed by its label and formal name, linked to its entry in a new tab (plain anchors, not `<Link>`, since the caller hands back a plain string), so unsaved changes stay. At the right:

- Where the page under the form has details to open, the Quick Look. The admin's form has none, every match being the compendium's.
- For a match the coven holds, its own or a compendium entry it has used, the eye, which opens the entry's details over the form. It is read in the page so nothing typed is lost.
- For a compendium match it does not hold, the +, which adds it to the coven the form is adding to, with no menu of covens.
- Nothing where none applies.

A compendium match's + sends the entry under its own name, with what else was typed as the coven's overrides. The typed name is never sent as a label: it was a search that found the entry, and as a label it could clash with one the coven already gives another entry, which refused the add. The entry can be relabelled on its page. The form stays open with what was typed, reported as Save & Add Another's save is (`another`).

**The + button.** The + is one button throughout, so the focus stays on it: a spinner while the add is sent, AddIcon's check held `ADDED_HOLD_MS`, then the check fades into the eye, the stack AddIcon draws when its check fades back to the plus. Under reduced motion the eye takes the check's place. Once the eye is in, `onShown` asks for the row to move under In This Coven, so the move never starts under the check. After an add, the cached answers would say the coven lacks the entry for their stale time, so every lookup of both kinds is asked again, since another name typed in this form may find it too. The held save's exact matches are state, not cache, so the entry is marked held there.

**Create Anyway.** There is one under either list, in the accent outline at the medium size. It is described by the warning: a save that stops here moves the focus to it, and the focus should say why.

**Sliding rows.** One list of the warning's matches slides between answers on its own (`useSlidingRows`), and is drawn while it has a row, the leaving ones too. Both lists stay mounted for the fade. A `heading` names the list, an `h4` beneath the form's Identity `h3`. The group opens by height round its first rows and closes round its last, as the region does round the whole notice, so a group arriving or leaving never jumps. The region opens by height round its notice, which fades in, as the first warning landed too abruptly.

- Rows are slots by place. A dropped row fades out whole while the list's bottom slides up over it, and a new row fades in as the bottom slides down, so the box never jumps. A row leaving is out of the accessibility tree at once.
- The height slides from the last measured height to the settled one, set on the list itself, the way a height otherwise `auto` can be moved. Rows settle by the slide's end or by the net. The list's height is let go only once the rows it slid for are settled. Let go as the leaving rows are asked out, the list stood a frame at its auto height with them still in the flow, a jump at the very end.
- The list is measured from the edges as drawn, with the row's own end margin (typography-base's `li`), which the list's resting height holds. A target short of that slid the list up a little and let it back down at the end.
- Shapes are tracked by their own transition events (`fading` in, `in`, or off). An answer back while they fade in waits under them and is shown once they are in. One back with them in changes the rows under them. One back before they began shows through the rows' own cross-fade. An answer landing mid-fade once showed the old rows a moment, then the new outright.
- Under reduced motion no transition runs, so every answer shows at once.

## Duplicate list styling

- **While an answer is on its way.** Each row the answer will replace cross-fades to the skeleton's shapes (`skeleton-shape`, `_mixins.scss`), laid over the row: a bar where the title was and, where the row had a control, its shape. That is a bar in the small button's own padding, border and type, or an icon's box for a + or a Quick Look. The row keeps its height and nothing jumps when the answer lands. The fade in waits `$skeleton-delay`, so an answer back sooner never shows the shapes at all, and the fade out is as slow, so a late one never flashes. Under reduced motion the swap is instant but still waits.
- **Height.** Between answers the list's own height slides, and the list clips meanwhile. A row the answer dropped stays whole and fades while the list's bottom slides up over it. The alternative, each row shrinking on its own, ended in a jump.
- **Own layer.** The list is on its own layer: text below a moving edge snapped to whole pixels, which jittered, and composited it glides. The button under the list goes the same way.
- **A place showing another entry.** The new row fades in while the last entry's text lies over it fading out, as text alone, until the slide settles. Both fades are linear, so between them the place is always just covered. Eased, both sit half-faded together in the middle and the text dims and brightens. The fade in is only for a row over a fading one, so a list's first rows fade in once, as their places do. It is filled backwards only. Filled forwards too, the fade's end would hold the row opaque over the cross-fade to the shapes above.

## Panel head layout

The reference panel's head holds the note if there is one, the panel's Undo and Redo, the How to Cite tip and the ×. The tip and the × abut, each its full `$icon-size` target. Narrow, they are one line with the group at the end. Where the note would be squeezed under 14rem the group drops to a line of its own straight beneath it, still at the right. Wide enough for the legend and the group side by side, the group goes up onto the top border at its right end, level with the legend and, like it, on the card's surface so the line stops either side of it. The note is then the first line inside. It is a container query, since it is the panel's width that decides, not the window's.
