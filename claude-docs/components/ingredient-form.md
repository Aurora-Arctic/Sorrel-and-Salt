# IngredientForm

`src/components/IngredientForm/` — every property of a coven's own
ingredient, on react-hook-form with the Zod resolver (DESIGN.md §14). It
validates with the shared `LocalIngredientInput` before the mutation is sent,
sends `createWorkspaceIngredient`, and puts an error from either side beside
the field it names. It is built standalone: the add and edit modals and the
admin compendium page wrap it rather than containing their own form.

| File                  | What it holds                                                                                                                                                                     |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.tsx`           | The form: the mutation, the fields in order, the root alert, where a server error goes, and focus after a submit                                                                  |
| `fields.tsx`          | `TextField`, `SuggestField`, `SelectField`, `MultiSelectField`, `ListField` and `FieldError`, the element every field's error renders through, with each hint behind an `InfoTip` |
| `suggestions.tsx`     | The lookups (M5.10a, MB.131): the queries, `useLookup`, which debounces each, the shapes, and `FormField` and `LookupListField`, which wire one to its field                      |
| `duplicates.tsx`      | The duplicate warning (M5.10): its query, `usePossibleDuplicates`, and `NameField`, the name field with the warning beneath it                                                    |
| `references.tsx`      | The References field (MB.154): its search's query, and `ReferencesField`, the box, New Reference, the rows beneath and their locators                                             |
| `reference-panel.tsx` | The new reference panel (MB.154): `createReference`, each kind's fields, `toReferenceInput`, and its own react-hook-form                                                          |
| `values.ts`           | The empty values, `toInput`, `addEntry`, `commitDraft`, `fieldNameOf`, the resolver, and `issuesOf`, which reads a failed save                                                    |
| `types.ts`            | The props, the form's own values, and the input it sends                                                                                                                          |

## The props contract

| Prop          | Meaning                                                                                                                                                                                                                                             |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workspaceId` | The coven the new ingredient is written to. It goes to `createWorkspaceIngredient` as its argument.                                                                                                                                                 |
| `onSaved`     | Called with the saved row (`id`, `name`) once the server has accepted it, and which save was pressed: `'open'`, Save Ingredient, for the page to open the new ingredient, or `'another'`, Save & Add Another, after which the form clears (MB.131). |

Only the workspace create is wired. A compendium entry takes
`CompendiumIngredientInput`, whose `nomenclature` has no default, so M5.5's
form marks the classification required always, where this one never does. An edit takes the whole row through `updateIngredient`. Each
arrives with the task that wraps the form for it.

## The fields

Name, classification, formal name, form, folk names, description, element,
planets, zodiac signs, colours, deities, substitute ingredients, safety
notes and references — every field `IngredientInput` takes. Categories are
not an input yet.

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
  not a line beneath it, on every field whose meaning is not plain from its
  label: name, classification, formal name, form, folk names, planets,
  zodiac signs, colours, deities, substitute ingredients and safety notes.
  The colours tip says each is a correspondence, not the colour the thing is. A tip opens on its ⓘ, by
  hover, tap or focus, and never on the field's own focus (MB.133), above
  the label so it never covers the field. Its text stays in the control's
  `aria-describedby`, so a screen reader reads it with the field, open or
  not. A field's `note` is the one line kept beneath a label, for a state
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
  elements not yet chosen, so none can be chosen twice. A choice keeps the
  list open for the next; once all five are chosen it has nothing to offer
  and does not open. Backspace in the box takes the last. None chosen is
  the answer "none", so there is no None to choose: the box shows the
  placeholder "Choose elements". It is a field, labelled by its `<label>`
  and erring through its one error element, rather than a list's fieldset:
  its values are the enum's strings, `elements: IngredientElement[]`, not a
  `useFieldArray` of entry rows, so it is not one of `LIST_FIELDS`.
- **"Classification" is the label for `nomenclature`**, which DESIGN.md §5
  calls the naming system the formal name belongs to. The label is the one a
  practitioner reads (amethyst is mineral, lavender botanical), and the
  schema's messages use the same word.
- **`form` is a single free-text field that suggests** (M5.10a), as the
  schema takes it: a `SuggestField`, the [`Combobox`](combobox.md) over
  `useController`, so a pick fills the field with the suggestion's value. A
  pick of a curated form links its row as well, and the box shows the row's
  group beside the text until the text is edited (MB.169). See "The form's
  pick".
- **Planets, zodiac signs and colours are list fields** (MB.136), as DESIGN.md
  §5 gives an ingredient several of each, labelled "Planets", "Zodiac Signs"
  and "Colours" with boxes "Planet", "Zodiac Sign" and "Colour". Every list
  field's box is the `Combobox` (M5.10a); folk names have their lookup, MB.131
  gave planets, signs, deities and substitutes theirs, and colours take none,
  the owner's call.
- **The six lists are one combobox each, with the entries inside it.** Typing
  and pressing Add, or Enter with no suggestion highlighted, adds the text as
  an entry, trimmed, and empties the box, as does picking a suggestion. The
  box keeps the focus, so the next one can be typed at once. A blank box adds
  nothing. The entries sit inside the control ahead of the text, after
  react-select's multi-select on the owner's call, each a chip with an ×
  labelled "Remove Hedge Fixture" rather than a bare "Remove"; pressing it
  sends the focus back to the box, since the pressed × goes with its entry, and Backspace or Delete in the empty box takes the last entry. A
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
  `value` the ingredient's label and `link` its id, formal name, form,
  description and tier. A linked
  entry's pill reads as the label with its formal name, "Mugwort (Artemisia
  vulgaris)", and so does its × and any error naming it, since two
  ingredients can share a label; one with no formal name reads as its label.
  What the pill leaves out is its `detail`, from `entryDetail` (MB.164): the
  form, which with the formal name is the ingredient's identity, so two
  pills reading alike are told apart; "Compendium entry" or "This coven’s
  entry", as its lookup row said; and the description, "Dried leaf ·
  Compendium entry — A fixture herb." It shows in the pill's tooltip and
  describes its ×, as the combobox's "An entry" sets out; a typed entry has
  none. The pill itself stays as it reads, the owner's call.
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
- **Each add, removal and clear is announced.** A list keeps a visually hidden
  `<output>`, a status region by its role, named "Folk Names changes" to tell
  it from the box's own "Folk Name suggestions" region, which reads "Added
  Hedge Fixture", "Removed Hedge Fixture" or "Cleared Folk Names". Otherwise a
  screen reader hears the box empty, or an entry go, and nothing about what
  happened (WCAG 4.1.3).
- **Planets, zodiac signs, colours and deities move** (MB.170). Each keeps
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

### The lookups

Six boxes suggest, through `/api/graphql` with TanStack Query
([`graphql/client.md`](../graphql/client.md)): the form and folk names from
M4.7a's `formSuggestions` and `commonNameSuggestions` (M5.10a), and the
planets, zodiac signs, deities and substitutes from `planetSuggestions`,
`zodiacSuggestions`, `deitySuggestions` and `ingredientSuggestions`
(MB.131). Colours take none. `suggestions.tsx` holds them all, on one hook,
`useLookup`, and a shape per source: each debounces the box's text through
`useDebouncedValue` (300ms, `src/lib/debounce.ts`), asks for ten rows with
the form's `workspaceId`, keeps the last answer on screen while the next is
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

A planet or sign row is the value, with the curated row's description as its
second line, under "From Compendium" and "From Coven" as a form's are. The headings
say where a value comes from, the owner's call: a curated value is the
admin's list, which compendium entries are held to, and a value only in use
outside it is this coven's. A deity row is
"Hecate (Greek)", the tradition beside the value as a form's group is
(MB.130), so two same-named deities are told apart; one in use has no
tradition. Picking a planet or a sign adds its value as an entry. Picking a
curated deity adds its value linked to the deity through the row's `id`,
reading "Hecate (Greek)" (MB.169). A deity only in use has no row, so it adds
its value as typed text.
On M5.5's compendium form the form, planet, sign and deity boxes are
choose-only, offering the curated rows alone with no typed row, since the
compendium services refuse any other value beside its field (MB.162;
[`validation.md`](../validation.md), "The two ingredient variants").

A substitute row is the ingredient's label and formal name, "Mockwort
(Fixtura vulgaris)", and a second line saying whose it is, "Compendium entry"
or "This coven’s entry". The rows keep the search's ranking, best match
first, so the tier is a note and not a heading, which would reorder them. Each
row carries its ingredient's id as its key, since a compendium entry and a
coven's copy of it read alike until M8.3 suppresses the one shadowed, and as
its `link`: picking one adds an entry linked to that ingredient, reading as
the label and formal name, its tooltip telling its form, tier and
description (MB.164), and sent as `{ ingredientId }`. The lookup asks for
each ingredient's `form` and `description` for that tooltip alone; the row
shows neither. The typed row,
Add and Enter add the text as it stands, sent as `{ name }` with no warning.
A compendium entry's substitutes may link only the compendium, so the admin
form M5.5 wraps reads `compendium(query)` in their place; this form writes
only a coven's ingredient.

### The references

The last field, as a bibliography is (MB.154; DESIGN.md §5, "References"):
the sources what the entry says comes from, each picked from the ones
already recorded or written new in the panel beneath. `ReferencesField` in
`references.tsx` is a fieldset named "References", with its info tip in the
legend as a list's is.

- **The box searches, and never adds what was typed.** It is the
  [`Combobox`](combobox.md), labelled "Reference", over
  `referenceSuggestions` through `useLookup`, debounced and asking nothing
  until the box is focused, as every lookup. A row is the source's plain
  `citation`, with "Compendium source" or "This coven’s source" as its
  note, in the search's ranked order, so the tier is a note rather than a
  heading. A source already listed is not offered again. Typed text is a
  search and never a source, so the list has no "Use what you typed" row:
  its first row is "Add a reference", the combobox's create row
  ([`combobox.md`](combobox.md), "The create row"), which opens the panel.
  Enter with nothing highlighted does nothing but close the list, and never
  reaches the form.
- **New Reference stands where a list has Add**, opening the panel as the
  create row does, `aria-expanded` while it is open. Add has nothing to add
  here.
- **Each source picked is a row beneath the box, not a chip inside it**, the
  owner's call: a citation is long, and a row reads it whole, as a
  bibliography does. A row is the citation, wrapping and broken anywhere
  so an address never runs the page sideways at 320px; its tier beneath; a
  "Locator" box, "p. 112", described by the citation so a column of them is
  told apart, with an info tip beside its label saying what a locator is and
  that every place the source is cited at goes in the one box, "pp. 12–19,
  40; chap. 3" — a source is listed once, the owner's call — and tidied as
  it is left, `formatLocator`, its ranges dashed; and an × named "Remove"
  and the citation, after which the box keeps the focus. Backspace in the empty box takes the last row, as in every
  list, and each add and removal is announced in a "References changes"
  region. The rows keep the order picked: the service reads them back
  alphabetical by citation (MB.153), so nothing here moves them.
- **Entries are a `useFieldArray` of `{ value, link, locator }`**: `value`
  the citation, which is shown and never sent, `link` the source's id and
  tier, and `locator` as typed. They are not one of `LIST_FIELDS`, which are
  free text. The box's text is `drafts.references`, and whether the panel is
  open is `referencePanelOpen`, both the form's own.
- **A search left in the box stops the save**, as text left in any list's
  box does: 'Pick a source for "grimm", or clear the box'. **So does an open
  panel**: "Save the new reference, or cancel it". Both are the resolver's,
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
  and Note. The two days are `<input type="date">`. A title, a container
  and a note say in their tip that underscores italicise a title inside
  them (MB.151).
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
  focus. Save & Add Another closes it with the rest, since `EMPTY_VALUES`
  holds `referencePanelOpen: false`.
- **Asked for again while open, it takes you back**, the owner's call: New
  Reference or "Add a reference" scrolls the panel's top into view, its
  legend clear of the edge, and focuses Kind again, keeping everything
  typed. The field counts each request and the panel focuses on each new
  count, as it does when it opens.

Only the coven's form is wired. M5.5's compendium page writes the
compendium's sources, with `createReference` and a null `workspaceId`, and
searches the compendium's alone; nothing edits a saved source yet.

### The form's pick

Two curated forms may share a name, Wax under _Animal_ and Wax under
_Substance_ (DESIGN.md §5), and both fill the box with "Wax". So a pick of a
curated row is kept beside the text, as `formLink` in the form's values:
the row's id, the name picked, its group and its description (MB.169).

- **The box shows the group.** "Wax" stays as the box's editable text, and
  "(Substance)" follows it in the muted ink, so the box reads as the row
  picked did, "Wax (Substance)", the owner's call. This is the
  combobox's `qualifier` ([`combobox.md`](combobox.md), "A qualifier").
  The form's description is the qualifier's tooltip. It opens on hover and
  while the box has focus, and closes on Escape. Open on focus, it covers the
  Form label; MB.115's design review settles that, on the owner's word. The group and the
  description are also the box's accessible description, after its hint.
- **An edit away from the picked name drops the link, the owner's call.**
  `FormField` hears each edit through `SuggestField`'s `onEdit`. Once the
  text is no longer exactly the name picked, the link goes, and the group
  with it. Typing the name back does not bring it back: what is left is typed
  text. A pick of the typed row, or of a form only in use, clears the link
  too, and a later pick replaces it.
- **It is sent as `formId`**, null for typed text ("What it sends"). The
  service refuses an id naming no curated form at `['formId']`, and that
  issue is the Form field's. `fieldNameOf` maps the server's, and the
  resolver moves the schema's, so it lands beside the box that made the pick
  rather than above the form.
- **Save & Add Another clears it** with the rest, since `EMPTY_VALUES` holds
  `formLink: null`.

The form only creates, so nothing yet reads a pick back into it. An edit
form would prefill the link from `Ingredient.formChoice`, the curated form
with its group, and each deity's from `IngredientDeity.deity` with its
tradition (MB.167). A pick retired since then reads as `null`, so it shows
as typed text.

### The duplicate warning

Story 16's "did you mean" (M5.10), on MB.11's `possibleDuplicates`
([`graphql/schema.md`](../graphql/schema.md), "possibleDuplicates").
`useDuplicateWarning` watches the name and asks once it has settled, through
the same `useDebouncedValue` the lookups wait on, for the three closest
entries in the compendium and this coven. A blank name asks nothing and drops
the last warning. The threshold is the server's, M4.7's 0.4, so "no warning
below threshold" is an empty answer; the form adds no threshold of its own.
Unlike the lookups it needs no focus gate: an empty form has no name to send.
The form owns the hook, since its save waits on it, and `NameField` draws it.

The warning sits beneath the field, a plain `.notice`: "Did you mean Cat's
Claw (Uncaria tomentosa), Cat's Claw (Felis catus) or Mockleaf?", with a
Create Anyway button. Each match is a link named by its label and its formal
name, since the label alone can name five plants; one with no formal name
shows its label. Each links to `/ingredients/[id]`, DESIGN.md §9's signed-in
page, which reaches compendium and coven entries alike. It is a plain anchor,
as [`AdminNav`](admin-nav.md)'s are, since typed routes refuse a page the
build does not contain; M8.19 builds the page, and the link becomes a
`<Link>`. Nothing refuses the create on the server: the warning is the
form's alone.

**The warning has to be answered before the form saves**, the owner's call,
which corrects the issue's "does not block submission". While it is only
typed against, it is a plain notice and the name is not marked. A save that
passes validation asks about the very name it is sending, through the query
client's `fetchQuery`: the cached answer when the typing had settled, asked
there and then when it had not, so a save inside the debounce cannot slip past
the warning. If a match not yet set aside comes back, nothing is sent: the
notice turns to `.notice--error`, the name is marked invalid and described by
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

A screen reader hears it two ways. The warning is inside an `<output>`
named "Possible duplicates", always in the page, so it is announced as it
arrives; and the sentence is in the name field's `aria-describedby` while it
shows, so it is read with the field, as the hint is.

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

- The form goes as its text with `formId`, the picked form's id, or `null`
  for typed text.
- A deity goes as `{ deityId }` when picked from the curated rows, and as
  `{ name }` when typed.
- A substitute goes as `{ ingredientId }` when linked, and as `{ name }`
  when typed.
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

## After a save

**Two saves**, the owner's call during MB.131. **Save Ingredient** is the
primary, a `.btn--solid`, and first, so it is the form's default: Enter in a
field presses it. It saves and asks the page to open what it made, passing
`'open'` to `onSaved`. The form navigates nowhere itself: the page that
holds it does, M5.5's admin page and M8.16's modal, so the form never leads
to a page that does not exist yet (`/ingredients/[id]` is M8.19's), and the
workshop needs no router. Its form is about to go, so it keeps its values.
**Save & Add Another** is the secondary, a plain `.btn` beside it: it saves,
passes `'another'`, and leaves the form blank for the next ingredient. Which
was pressed is the submit event's `submitter`, read by its `value`; a submit
with none is Save Ingredient's.

After either, the form says what it saved, "Saved Testwort.", in a
`.notice--success` `<output>` above the fields where a refusal's alert goes,
and so at the form's width; the next submit drops it. The message is the
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
reset has just dropped. Only the create is wired; what an edit does after its
save is settled by the task that wires it.

## One error element, two sources

`FieldError` is the one element any field's error renders through: a
`.field__error` paragraph whose id the control lists in `aria-describedby`,
with `aria-invalid` set beside it. The resolver's issues and the server's
`fieldErrors` both reach it through react-hook-form's error state, so a
server-only rule draws exactly as a schema rule does. The test proves it is
the same element, not just the same text.

Both sources go through **`fieldNameOf`**, which turns an issue's path into
the form's field name:

| Path                           | Field                                                                 |
| ------------------------------ | --------------------------------------------------------------------- |
| `['name']`                     | `name`                                                                |
| `['folkNames', 2]`             | `folkNames.2.value`, the third entry                                  |
| `['elements', 1]`              | `elements`, the whole control: its chips are not rows                 |
| `['formId']`                   | `form`, whose box made the pick (MB.169)                              |
| `['references', 1]`            | `references.1.value`, the second reference's row (MB.154)             |
| `['references', 1, 'locator']` | `references.1.locator`, its locator                                   |
| `[]`                           | none: the root alert                                                  |
| any path it cannot name        | none: the root alert, rather than an unseen error (`drafts` included) |

The resolver returns an entry's issue at the entry (`folkNames.2`). The
form's resolver wraps `zodResolver` and moves it onto the entry's `value`,
which is where `fieldNameOf` puts the server's. An element's issue — a
repeat, which the form cannot make but a caller can — arrives at the
element too (`elements.1`), and the resolver moves the first onto the field,
as `fieldNameOf` does.

**A list's errors are the list's.** An entry is not a control, so its error
cannot sit beneath one. The list has one `FieldError`, beneath its box,
reading each entry's message after the entry: "hedge fixture: This folk name
is already listed". The entry named takes the error edge, and its × lists
the message as its description. The box takes `aria-invalid` and the same
description, so it is what a failed submit focuses.

`issuesOf` reads the rejection:

| Failure                                   | Issues                                                      |
| ----------------------------------------- | ----------------------------------------------------------- |
| `VALIDATION` with `fieldErrors`           | the field errors, each pathed to the input                  |
| any other GraphQL error                   | one empty-path issue, carrying the error's own message      |
| no GraphQL answer at all (a failed fetch) | one empty-path issue: "That didn't work. Please try again." |

Each placeable issue goes in through `setError`. Every other issue joins one
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
`.fieldset` with its legend for each list. The alert is `.notice--error`, and
Save Ingredient is the view's one `.btn--solid`. A disabled field's dashed
edge and dimmed label are the primitives' too; a closed set's box and its
muted placeholder are the combobox's.

The component's own stylesheet sets the form's width, a column of at most
`32rem`, narrower than the measure as the other forms keep. It also lays out
the row a list's box shares with Add, draws an entry's tooltip, and puts each
label and its info tip, or a legend and its tip, on one positioned row, so an
open tip lies above the label from the column's edge rather than hanging off
the icon. The duplicate warning's region cancels the field's gap while it is
empty, since a live region stays in the page, and its notice puts the gap
back, with a step more padding beneath Create Anyway than the notice's own. A list's legend and its box sit a step further apart than a single
field's label and control. The box, its entries and its list are the
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

[`index.stories.tsx`](../../src/components/IngredientForm/index.stories.tsx):
`Blank`, unframed, with every lookup answered and the save faked (MB.131),
under a "What to try" panel saying what to type for each state: the
suggestions, free text, the duplicate warning, the missing name, the
classification coupling, a pick of a form or a deity, moving an entry, text left in a box, a
repeated entry, a long entry,
the two server refusals, a save, and the references: picking sources,
a locator, the panel per kind and its refusals. The workshop has no API, and on staging
its pages may not fetch at all ([`workshop.md`](../workshop.md), "On
staging"), so the story answers the form itself: while it is mounted it
stands in for `window.fetch`, which graphql-request looks up on every
request, and answers a request to `/api/graphql` naming one of the eight
lookups, or either save, from invented rows filtered by what was typed. Each
answer is checked against its query's generated type with `satisfies`, so a
fixture that drifts from the schema stops compiling. A name holding "cat"
shows the duplicate warning. A save is answered after two seconds
(`SAVE_DELAY_MS`), so Save can be watched busy and shut with its spinner: a
name holding "taken" is refused as a `VALIDATION` error on the name, one
holding "refuse" as a `FORBIDDEN` above the fields, and any other is saved,
under a fresh id. Its three sources are invented, in both tiers, one a web
page with a long address, and each citation is rendered by `citationText`
as the server renders it; a new source is answered the same way, after the
same pause, and refused by its title as an ingredient is by its name. The workshop has no page to open, so after Save Ingredient
the story says beneath the buttons where its page would go,
"/ingredients/<id>", in a `.story-note` from `.ladle/story-frame.scss`;
Save & Add Another clears it.
The original `fetch` is put back on unmount. The TanStack Query client is the
workshop's global provider's: a second provider would split the cache, which
`tests/guards/graphql-client.test.ts` refuses. This replaces M5.10's
`DuplicateWarning` story, which filled that cache ahead for one exact name.

## Testing

`tests/components/IngredientForm/index.test.tsx` answers
`CreateWorkspaceIngredient` through MSW: `mockGraphQLMutation` for a saved
row, and `mockGraphQLError` for a refusal, so the error body is the route's
own mapping; the seven lookups are answered with `mockGraphQLQuery`. Its `save()` focuses the button before clicking it, as a real
click does, since `fireEvent` moves no focus and a focus test would otherwise
pass on whatever an earlier step had focused. It covers:

- **Saving**: a name-only stub, sent with `nomenclature: null` and parsed by
  `LocalIngredientInput` as `none`; every field sent as typed; `onSaved`
  called with the returned row and `'open'` or `'another'`, Save Ingredient
  the default and keeping the form; the submit held down while in flight; every
  field and list cleared once saved, with nothing marked invalid and the
  focus in Name; "Saved Testwort." said inside the form until the next
  save; and a refused save keeping what was typed.
- **Resolver errors**: beside the field, focused, invalid and described, with
  no request sent; on the list entry it names, focusing the list's box;
  cleared by an edit, or by removing the entry; an element list given a
  repeat, refused on the Element control; an issue with the form's pick, or
  with its text, on the Form field.
- **Server errors**: beside the field and on the list entry their path names;
  rendered through the same element as a resolver error on that field; an
  issue pathed to one element on the Element control, focused; one pathed
  to `formId` on the Form field; cleared by an edit.
- **Root errors**: an empty path, a path naming no field, a `FORBIDDEN`'s
  message and a failed fetch, each as an alert above the fields, cleared on
  the next submit.
- **The coupling**: the formal name shut and emptied for None, with its
  reason, open and optional under Unknown, and opened again for a named
  kind; the issue that remains, cleared inline by changing either field.
- **Fields**: Name alone marked required; each hint behind an info tip yet
  still read with its field, and kept shut while its field, or a list's box,
  has focus; the classification's placeholder, `form`
  as free text, and each list's box, Add, Enter, blank, remove, Backspace, Clear, focus,
  order and announcements, the box a combobox with a chevron only where there
  is a source, the entries inside the control, and a save refused while a box
  holds text until it is added or cleared; the element's five choices and no
  None, several chosen as chips inside the control, the list offering only
  those left, Backspace and the × removing, sent in the order chosen, `[]`
  once cleared, and an element list given its values drawn as chips in that
  order, as an edit will prefill it; a handle on each planet, sign, colour
  and deity and none on a folk name or substitute, a move by keyboard said,
  the focus kept on the moved entry and the new order sent, a move by
  pointer sent the same, an error kept on the entry it names as another
  moves past it, and a picked deity and a typed one sent in the order they
  were moved to.
- **The lookups**: a request only once the typing settles, with the coven's
  id and the settled text, and none until the box is used; the vocabulary
  first with each form's group and claimants, then forms in use, under their
  headings; a pick filling the form field, showing its group in the box with
  its description in a tooltip on hover and focus, closed by Escape, and
  read as the box's description, and sending its id; a later pick of the
  other Wax replacing it; a form with no description showing its group and
  no tooltip; an edit away from the pick dropping the group and the id; a
  form only in use picked with no id; the pick cleared by Save & Add
  Another; and a value in no vocabulary taken from its own row with no
  warning and no id; a common name picked by click or by
  keyboard adding an entry, and Enter with nothing picked adding typed text.
  For each of the planets, signs, deities and substitutes: a request only once
  the typing settles, and none until the box is used; the planets and signs
  curated apart from those in use, with descriptions; a curated deity with its
  tradition, two of one name told apart; a pick adding the value, emptying the
  box and announcing it; a deity picked by the arrow keys and Enter, Escape
  closing the list and keeping the text, and Enter with it closed adding the
  text, sent as its id and the typed one as its name; Greek and Roman Hecate
  picked as two pills, each with its tradition and its description, sent as
  two ids; the same deity picked twice refused beside the repeat; a deity
  only in use added and sent as its name; each ingredient with its formal name and tier in the order found; a
  picked ingredient saved as a link, its entry reading as it; and a
  substitute added or picked as typed saved as text, with no warning.
  Every lookup, the duplicate check included, is answered empty by default, so
  a test about one answers it after rendering, the later handler winning. The
  debounce runs on fake timers that still advance, so the mocked answers
  arrive.
- **The duplicate warning**: a request only once the name settles, with the
  whole name trimmed, and none for a blank one, which drops the last warning;
  each match linked and named by its label and formal name, read with the
  field, and not marking it invalid until a save meets it; nothing for an
  empty answer or a failed lookup; a save held, and held again, while it shows,
  the name marked invalid and the focus on Create Anyway, read with the
  warning; a save inside the debounce asking about the name it sends and
  holding on what it finds; Save busy while it checks, then sending when
  nothing is close; the hold lifted by editing the name, the focus left in it;
  an error elsewhere taking the save first; Create Anyway clearing it and the
  name's error, focusing the name, and the next save sending; and the matches
  set aside staying gone while a new one returns. The in-flight save tests,
  one per button, assert both held down, the pressed one's `aria-busy` and
  its "Saving Ingredient" label until the answer, and the other's own label.
- **A long entry**: a cut-off entry's tooltip shown on hover and while its ×
  has focus, closed on Escape, and absent for an entry that fits, with the
  layout jsdom lacks stubbed through `scrollWidth` and `clientWidth`; its ×
  still named by the whole text. The hover is fired on the entry's words, found
  by their text, the closed tooltip that repeats them ignored: the wrapper
  that listens has no role to query by.

**The references** are `tests/components/IngredientForm/references.test.tsx`
(MB.154): the search asking only once the box is used and the typing
settles, each source by its citation and tier after "Add a reference", and
none already listed; a pick by click and by keyboard adding a row beneath
the box, announced, the box emptied and focused; each row's locator
labelled and read with its citation; the × and Backspace removing a row;
Enter with nothing picked submitting nothing; each source sent by its id
with its locator as typed and no citation, `[]` for none, and parsed by
`LocalIngredientInput`; a server error naming a source on its row alone;
Save & Add Another clearing them; a search left in the box, and an open
panel, each stopping the save. The panel: opened by New Reference and by
the create row, Kind focused and nothing else shown; each of the five
kinds showing exactly its fields in order, the required ones marked; a
chapter with no book and a web page with no address or day refused beside
the fields, the first focused; a server field error on the element a
resolver error uses; a refusal naming no field as an alert inside it; a
save adding the new source by id and closing, the box focused; only the
chosen kind's fields sent; Enter in a field saving the source and not the
ingredient; Cancel; and, asked for again while open, Kind focused again
with what was typed kept. And MB.154's formatting and checks: the
Locator's tip read with its box; a locator, a title, an edition, a date
range and a bare address each tidied as it is left; and a date with no year
refused beside Published. The formats and checks themselves are tested
where the schema is, `tests/modules/ingredients/validation/`
(`reference-format.test.ts` and `reference.test.ts`), with the server's
storing of them in `services/references.test.ts`.

Role and label queries only. It runs in the `dom` (jsdom) Vitest project —
`npm run test:coverage`.

**Accessibility is asserted in Playwright** (CLAUDE.md, Testing), once a page
holds the form: M5.5's admin page and M8.16's modal each carry an axe scan.
MB.154's References field was driven in a browser — Ladle's story through
the `playwright-server` service, at 375px in both themes — and scanned
with `@axe-core/playwright` at each state: the suggestions open, three
rows, the panel refusing a chapter, a web page's fields. No WCAG 2.2 AA or
best-practice violations from the field, and no sideways scroll; the
frame's page-level rules (a `main`, an `h1`, landmarks) were left out, as
the story is a fragment. Until then the form was scanned by hand in M5.9, against the workshop story
in both themes, blank, after a failed save, with a tip open and with the
formal name shut: no WCAG 2.2 AA or best-practice violations. M5.10a's
combobox was not scanned in a browser, the devcontainer having none; its
ARIA is Downshift's, and M5.5's scan is the first over it. Axe could not
decide the contrast of the selects, whose chevron is a gradient, or of a
field an open tip overlaps. Those were measured instead: the placeholder
4.70:1 light and 6.69:1 dark, and an open tip 5.6:1 and 6.59:1.
