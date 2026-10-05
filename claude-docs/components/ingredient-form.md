# IngredientForm

`src/components/IngredientForm/` — every property of a coven's own
ingredient, on react-hook-form with the Zod resolver (DESIGN.md §14). It
validates with the shared `LocalIngredientInput` before the mutation is sent,
sends `createWorkspaceIngredient`, and puts an error from either side beside
the field it names. It is built standalone: the add and edit modals and the
admin compendium page wrap it rather than containing their own form.

| File         | What it holds                                                                                                                                 |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.tsx`  | The form: the mutation, the fields in order, the root alert, where a server error goes, and focus after a submit                              |
| `fields.tsx` | `TextField`, `SelectField`, `ListField` and `FieldError`, the element every field's error renders through, with each hint behind an `InfoTip` |
| `values.ts`  | The empty values, `toInput`, `commitDraft`, `fieldNameOf`, the resolver, and `issuesOf`, which reads a failed save                            |
| `types.ts`   | The props, the form's own values, and the input it sends                                                                                      |

## The props contract

| Prop          | Meaning                                                                                              |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| `workspaceId` | The coven the new ingredient is written to. It goes to `createWorkspaceIngredient` as its argument.  |
| `onSaved`     | Called with the saved row (`id`, `name`) once the server has accepted it. The form keeps its values. |

Only the workspace create is wired. A compendium entry takes
`CompendiumIngredientInput`, whose `nomenclature` has no default, so M5.5's
form marks the classification required always, not only while a formal name
is typed. An edit takes the whole row through `updateIngredient`. Each
arrives with the task that wraps the form for it.

## The fields

Name, classification, formal name, form, folk names, description, element,
planets, zodiac signs, colours, deities, substitute ingredients and safety
notes — every field `IngredientInput` takes. Categories are not an input yet.

- **Name is the one field always required**, as story 29's stub needs, and
  says so twice: `aria-required` on the control for a screen reader, and a
  red asterisk hard against the label for the eye, "Name\*", in the error
  red. The asterisk is `aria-hidden`, so the field's name stays "Name"
  rather than "Name star" and the requirement is not heard twice.
  `aria-required` rather than `required`, whose `:invalid` would mark the
  empty field before anyone had tried to save.
- **The classification and formal name are marked required while each makes
  the other so**, the coupling's first half shown before a save rather than
  after it: the formal name while a named kind is chosen, and the
  classification while a formal name is typed. The marks come and go with the
  values, and the schema's messages still refuse a save that ignores them.

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
- **Closed sets are native `<select>`s**: the classification over
  `NOMENCLATURE_KINDS` and the element over `INGREDIENT_ELEMENTS`, both read
  from `schema/ingredient-enums.ts`, so the options cannot drift from the
  schema. Both start with the value `''`, drawn two ways. The classification
  shows a placeholder, "Choose a classification": a hidden, disabled first
  option, so it cannot be chosen back once a kind is picked. It has no need
  to be, since "None" is itself a kind. The element's blank is a real choice,
  "None", the one that clears it.
- **"Classification" is the label for `nomenclature`**, which DESIGN.md §5
  calls the naming system the formal name belongs to. The label is the one a
  practitioner reads (amethyst is mineral, lavender botanical), and the
  schema's messages use the same word.
- **`form` is a single free-text field**, as the schema takes it. M5.10a's
  combobox replaces its plain input and puts the common-name lookup on the
  folk-name box.
- **Planets, zodiac signs and colours are list fields** (MB.136), as DESIGN.md
  §5 gives an ingredient several of each, labelled "Planets", "Zodiac Signs"
  and "Colours" with boxes "Planet", "Zodiac Sign" and "Colour". M5.10a
  makes every list field's box its `Combobox`, and MB.131 gives planets and
  signs their lookups; colours take no suggestions.
- **The six lists are one box each, with the entries above it.** Typing and
  pressing Add, or Enter, adds the text as an entry, trimmed, and empties the
  box. The box keeps the focus, so the next one can be typed at once. A blank
  box adds nothing. Each entry is a pill with an ×, labelled "Remove Hedge
  Fixture" rather than a bare "Remove", and pressing it sends the focus back
  to the box, since the pressed × goes with its entry. The box is labelled
  by the singular, "Folk Name", since the legend names the group, and its
  button is named "Add Folk Name". Entries are a `useFieldArray` of `{ value }`
  objects, since react-hook-form refuses an array of bare strings. What sits
  in a box is the form's own `drafts`, which `toInput` leaves out. A list's
  info tip sits in its legend, so the fieldset is named by the legend's text
  alone, through `aria-labelledby`: the tip's button would otherwise join the
  group's name, "Folk Names About Folk Names". `substitutes` is labelled
  "Substitute Ingredients", its box "Substitute Ingredient". A substitute is
  text for now: MB.138 to MB.140 let an entry link an existing ingredient,
  and MB.131 picks one.
- **Text left in a box stops the save.** The form's resolver adds an error to
  any box still holding text, 'Press Add to keep "Hedge Fixture", or clear
  the box', on the list's error element, so a save never sends a list the
  user thinks holds an entry it does not. The schema never sees a box, so the
  rule is the form's own. Adding the text or clearing the box clears it.
- **Each add and removal is announced.** A list keeps a visually hidden
  `<output>`, a status region by its role, which reads "Added Hedge Fixture"
  or "Removed Hedge Fixture". Otherwise a screen reader hears the box empty,
  or an entry go, and nothing about what happened (WCAG 4.1.3).

### The kind↔name coupling, inline

The schema's rule is both ways round: a botanical, fungal, zoological, mineral
or chemical entry needs a formal name, and an `unknown` or `none` entry takes
none ([`validation.md`](../validation.md), "The two ingredient variants").

The form enforces the second half by construction. Choosing "Unknown" or
"None" empties the formal name and disables it, with a note beneath its label
that says why: 'A "none" entry records no formal name.' A note rather than a
tip, since a shut field that does not say why reads as broken. The field is
shut with the HTML attribute, not react-hook-form's `disabled` option, which
would also drop the value from what is validated and sent. Emptying it is what
keeps the value out. The schema's refusal of a formal name on a nameless kind
is still the service's, for any other caller, and a user of this form never
sees it.

The first half stays a message. A named kind with no formal name gets "A
botanical entry needs its formal name" beside the formal name, and a formal
name with no kind gets "Choose the classification this formal name belongs
to" beside the selector. Either field's value decides the other's error, so
each is registered with the other as a `deps`. Once a submit has shown the
error, changing either field revalidates both, and the error clears as soon
as the pair agrees, with no second submit. The classification's info tip
states the rule before anyone breaks it.

## What it sends

The values **as typed**, reshaped by `toInput` into the input the mutation
and the schema take: an unanswered select becomes `null`, a list entry
becomes its text, and the boxes are left behind. Nothing else is trimmed or
parsed: a blank field goes as `''`, and the service's run of the same schema
turns it into an absence. The resolver runs with `raw: true` for this, so
what it validated is exactly what is sent.

An entry's index in an issue's path is its place in the list the form shows.
Add refuses a blank, and a save is refused while a box holds text, so every
entry sent is one the user can see, in the order shown.

The classification shows the as-typed rule too. A stub with only a name goes
with `nomenclature: null`, and the service's `LocalIngredientInput` reads
that as `none`, so story 29's one-field entry is whole. The component test
parses the sent input with that schema to show it.

## One error element, two sources

`FieldError` is the one element any field's error renders through: a
`.field__error` paragraph whose id the control lists in `aria-describedby`,
with `aria-invalid` set beside it. The resolver's issues and the server's
`fieldErrors` both reach it through react-hook-form's error state, so a
server-only rule draws exactly as a schema rule does. The test proves it is
the same element, not just the same text.

Both sources go through **`fieldNameOf`**, which turns an issue's path into
the form's field name:

| Path                    | Field                                                                 |
| ----------------------- | --------------------------------------------------------------------- |
| `['name']`              | `name`                                                                |
| `['folkNames', 2]`      | `folkNames.2.value`, the third entry                                  |
| `[]`                    | none: the root alert                                                  |
| any path it cannot name | none: the root alert, rather than an unseen error (`drafts` included) |

The resolver returns an entry's issue at the entry (`folkNames.2`). The
form's resolver wraps `zodResolver` and moves it onto the entry's `value`,
which is where `fieldNameOf` puts the server's.

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
control and `.field__error`, `.input`, `.textarea` and `.select`, and
`.fieldset` with its legend for each list. The alert is `.notice--error`, and
Save Ingredient is the view's one `.btn--solid`. The select's muted
placeholder and a disabled field's dashed edge and dimmed label are the
primitives' too.

The component's own stylesheet sets the form's width, a column of at most
`32rem`, narrower than the measure as the other forms keep. It also draws a
list's entries, lays out the row its box shares with Add, and puts each label
and its info tip, or a legend and its tip, on one positioned row, so an open
tip lies above the label from the column's edge rather than hanging off
the icon. A list's legend, its entries and its box sit a step further apart
than a single field's label and control, and the entries take a margin above
and below on top of that, so they read as a row of their own. An entry is a pill
in the chip's geometry but neutral, edged in the muted ink, since a free-text
entry has no category group to take a colour from. The entry an error names
takes the field's error edge. Its × is a 24px target, WCAG 2.2's minimum,
inside a pill too short for 44px.

**A long entry is cut off, never wrapped or let run** (MB.133). A pill is no
wider than the column, and its text ends in an ellipsis where the column does,
so every pill stays one line in the chip's shape and nothing scrolls the page
sideways at 320px. The × never shrinks: the text gives way. The whole text
stays reachable three ways: it is the entry's text in the DOM, so a screen
reader reads it in full; the × is still named by it; and a tooltip,
`role="tooltip"`, shows it above the pill while the entry is hovered or its
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
`Blank`, unframed. Nothing is mocked. Save with an empty name shows the
resolver's errors, and Save with a name fails into the root alert, since the
workshop has no API. The TanStack Query client comes from the workshop's global
provider.

## Testing

`tests/components/IngredientForm/index.test.tsx` answers
`CreateWorkspaceIngredient` through MSW: `mockGraphQLMutation` for a saved
row, and `mockGraphQLError` for a refusal, so the error body is the route's
own mapping. Its `save()` focuses the button before clicking it, as a real
click does, since `fireEvent` moves no focus and a focus test would otherwise
pass on whatever an earlier step had focused. It covers:

- **Saving**: a name-only stub, sent with `nomenclature: null` and parsed by
  `LocalIngredientInput` as `none`; every field sent as typed; `onSaved`
  called with the returned row; the submit held down while in flight.
- **Resolver errors**: beside the field, focused, invalid and described, with
  no request sent; on the list entry it names, focusing the list's box;
  cleared by an edit, or by removing the entry.
- **Server errors**: beside the field and on the list entry their path names;
  rendered through the same element as a resolver error on that field;
  cleared by an edit.
- **Root errors**: an empty path, a path naming no field, a `FORBIDDEN`'s
  message and a failed fetch, each as an alert above the fields, cleared on
  the next submit.
- **The coupling**: the formal name shut and emptied for a nameless kind,
  with its reason, and opened again for a named one; the two issues that
  remain, and each cleared inline by changing the other field.
- **Fields**: Name alone marked required; each hint behind an info tip yet
  still read with its field, and kept shut while its field, or a list's box,
  has focus; the classification's placeholder and the element's "None", `form`
  as free text, and each list's box, Add, Enter, blank, remove, focus, order
  and announcements, and a save refused while a box holds text until it is
  added or cleared.
- **A long entry**: a cut-off entry's tooltip shown on hover and while its ×
  has focus, closed on Escape, and absent for an entry that fits, with the
  layout jsdom lacks stubbed through `scrollWidth` and `clientWidth`; its ×
  still named by the whole text. The hover is fired on the entry's words, found
  by their text, the closed tooltip that repeats them ignored: the wrapper
  that listens has no role to query by.

Role and label queries only. It runs in the `dom` (jsdom) Vitest project —
`npm run test:coverage`.

**Accessibility is asserted in Playwright** (CLAUDE.md, Testing), once a page
holds the form: M5.5's admin page and M8.16's modal each carry an axe scan.
Until then the form was scanned by hand in M5.9, against the workshop story
in both themes, blank, after a failed save, with a tip open and with the
formal name shut: no WCAG 2.2 AA or best-practice violations. Axe could not
decide the contrast of the selects, whose chevron is a gradient, or of a
field an open tip overlaps. Those were measured instead: the placeholder
4.70:1 light and 6.69:1 dark, and an open tip 5.6:1 and 6.59:1.
