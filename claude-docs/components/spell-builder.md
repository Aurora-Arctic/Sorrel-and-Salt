# SpellBuilder

`src/components/SpellBuilder/` is the form that writes a spell's own fields
(M10.12, story 47): its title, intent, jar size, seal wax colour, moon phase,
day of the week and note. It is a client component. The new-spell page,
`/coven/[slug]/grimoire/new`, draws it empty; M13.10's edit page,
`/coven/[slug]/grimoire/[id]/edit`, will draw it with a saved spell. The
recipe's steps (M10.15, M10.16, M13.3), visibility (M10.13), intent categories
(M10.14) and Mark Complete (M10.20) are later tasks that extend it. There is
no `instructions` field: the ritual is the spell's steps (M13.1).

## Props

`SpellBuilderProps` (`types.ts`):

| Prop          | What it is                                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------------------------- |
| `workspaceId` | The coven the spell belongs to, sent with every save                                                             |
| `spell`       | Optional: a saved spell, its `id`, `revision` and the seven fields (null for one not set). Without it, all empty |

## Saving

- **No field is required.** A draft saves with any one field, or all of them.
  Only marking a spell complete needs a title (the `spells_complete_has_title`
  CHECK, M13.15), and that is M10.20's control, so no label is marked required.
- **Save Spell stays disabled until there is something to save**: a field
  that reads differently from the last save. Blank and spaces alike read as
  none, as the shared schema (`SpellInput`) reads them. The row is
  `FormActions` ([`field.md`](field.md)) with `noun="Spell"`: Save Spell,
  busy as Saving Spell with the spinner from the press to the answer. It has
  no Cancel: the page's Back link leaves (the autosave plan,
  [`design-decisions/m13.14-plan.md`](../design-decisions/m13.14-plan.md)).
- **Created once, then updated.** With no `spell`, the first Save calls
  `createSpell`. The builder then holds the new spell's id and revision, and
  every later Save calls `updateSpell` on that spell with `expectedRevision`
  set to the revision the last save answered. Opened with a `spell`, every
  Save is an update. This is the shape M13.17's autosave adapter takes.
- **What it sends.** The seven fields, trimmed, and null for a blank one, so
  an emptied field is cleared rather than left as it was. Only these seven:
  the schema's default empty `steps` is never sent, so a save from here
  cannot replace a saved spell's recipe.
- **After a save the form starts again from the answer**, so Save goes
  disabled until the next change. The address stays at
  `/coven/[slug]/grimoire/new` after a create: there is no page for one spell
  to go to until MB.6 and M13.10, so reloading the page opens an empty
  builder, and the saved spell is listed under the grimoire's Drafts tab.

## Two error surfaces

As in the ingredient form (M5.9): the shared schema runs as the form's
resolver, so a field it refuses shows its error beneath that field before
the save, and a `VALIDATION` answer's `fieldErrors` for one of the seven
fields show beneath it after, through the same element (`aria-invalid` and
`aria-describedby`). Anything else, such as a viewer's `FORBIDDEN`, goes to
the `Notice` above the fields, in the server's words. The reading is
`placeServerIssues`. Today no builder field has a rule the schema can break
in the browser: the title rule needs `status: complete`, which M10.20 adds.

## Leaving with unsaved changes

`useDiscardGuard` with `DiscardQuestion`, as every long form has (M13.14): a
tab close asks the browser's question, and a link asks "Discard Changes?".
Nothing asks while a save is on its way, or once the changes are saved.
Undo and redo are the shared `FormHistoryButtons` (M12.9).

## The fields

Plain text fields, each with a one- or two-word placeholder and no info tip,
since none states a rule a person could trip on
([`info-tip.md`](info-tip.md), "When a field gets a tip"). The jar fields are
free text: there is no curated list of jar sizes, wax colours, moon phases
or days ([`../db/grimoire.md`](../db/grimoire.md)). Intent and Note are
multi-line. Every field but those two is `autoComplete="off"`.

## Styling

No stylesheet and no wrapper: the `<form className="form">` sits straight in
the page's column. The page uses `page-frame__section page-frame--narrow`
inside the coven layout, the forms' width, left-aligned. Its look past the
tokens is the grimoire's design review's.

## Stories

`index.stories.tsx`, titled "Grimoire / Spell Builder": `States`, with a
control that chooses Empty, Title Typed, Saved Spell or Refused After Saving,
inside the app shell and the page's frame and heading.

## Testing

`tests/components/SpellBuilder/index.test.tsx` uses role and label queries
against MSW, which answers in the route's own error shape. It covers the
empty fields and no Instructions box, no Cancel, nothing to save until a
field holds something, a draft saved with its intent alone, the trimmed
values sent, Save busy then disabled, a second save as an update at the
revision, a saved spell opened and an emptied field cleared, both error
surfaces, and the discard question. The page is
`tests/app/(shell)/coven/[slug]/grimoire/new/page.test.tsx`: the builder for an
owner and a member, and the 404 for a viewer. Story 47 in
`tests/e2e/stories/06-grimoire.spec.ts` walks it in a browser.
