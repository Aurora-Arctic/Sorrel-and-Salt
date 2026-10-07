# MB.174 — Stop the list fields offering or adding a repeat

## Context

The shared schema refuses a repeated list entry only at save, beside the entry that repeats it (`crossFieldRules`, `refuseRepeats`, `deityRules` and `substituteRules` in `src/modules/ingredients/validation/ingredient.ts`). The form does nothing to stop one while a member types, picks or presses Add. The Element multi-select and MB.154's References search already leave out what is listed. MB.174 brings the other six list fields into line: Folk Names, Planets, Zodiac Signs, Colours, Deities and Substitute Ingredients. The repeat shows at the box instead of at save.

**Branch:** `feature/mb.174-stop-list-fields-offering-or-adding`, stacked on MB.154's branch (PR #692, in review), the owner's call this session. The peer's uncommitted MB.176 docs ride along untouched.

## One rule: what counts as a repeat

A new pure helper in `src/components/IngredientForm/values.ts`:

```ts
/** What refuses `text` (and `link`) as a list's next entry, or undefined. */
export function repeatOf(
  values: IngredientFormValues,
  list: ListFieldName,
  text: string,
  link?: SubstituteLink | DeityLink,
): string | undefined;
```

It mirrors the schema's keys exactly. The schema trims each entry and folds it with `toLowerCase()`; the helper does the same.

| List                           | A repeat when                                                                                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Planets, Zodiac Signs, Colours | Folded text equals a listed entry's                                                                                                                        |
| Folk Names                     | As above, **or** folded text equals the ingredient's Name                                                                                                  |
| Deities                        | Linked: the same deity id is listed. Typed (no link): folded text equals a **typed** entry's. A typed name equal to a linked deity's name is not a repeat. |
| Substitutes                    | Linked: the same ingredient id is listed. Typed: folded text equals a typed entry's.                                                                       |

**Messages** read on the list's one error element:

- `"Mars" is already listed`
- folk names only: `"Testwort" is already the name`

The text is quoted as the member typed it, trimmed.

## Changes

### 1. Combobox: the `offerTyped` prop (`src/components/Combobox/{index.tsx,types.ts}`)

- Add `offerTyped?: boolean`, default `true`. When `false`, `arrange` builds no typed row. The suggestions still show, and Enter with nothing highlighted still reaches `onCommit`, so Add's refusal can speak.
- The create row is unaffected.
- `combobox.md` gains a Behaviour paragraph and a props-contract line for it.

### 2. ListField (`src/components/IngredientForm/fields.tsx`)

**Watching what is listed.** `useWatch` reads the list's values. It also reads `name`, with `disabled` unless the list is `folkNames`, so the other five don't re-render on every keystroke in Name.

**Filtering the lookup.** `suggestions` are filtered through `repeatOf(values, name, option.value, option.link)` in a `useMemo`. The lookup never offers a listed entry:

- Greek Hecate listed still offers Roman, since their ids differ.
- An uncurated deity row (no id) is filtered by text against the typed deities.
- A substitute row always links, so it is filtered by id.

This lives in ListField, not `LookupListField`, so the one check covers Add, Enter and the lookup alike.

**Hiding the typed row.** `offerTyped={!repeatOf(values, name, field.value)}`.

**Add and Enter.** Each goes through a `refused(text)` gate before `commitDraft`:

- On a repeat, nothing is added.
- The box keeps its text, so it can be corrected.
- `setError(`drafts.${name}`, { type: 'repeat', message })` sets the error, which ListField already folds into the list's one `FieldError`. That is the same element the save-time "Press Add to keep…" reads through, and it is described on the box via `aria-describedby`.
- The "… changes" `<output>` announces the same message, as an add or removal is announced.
- The focus stays on the box.

**As built:** a pick has no gate. The options are filtered against the current list on every render, and the typed row is withheld for a repeat, so no pick can be one; a gate there would be code no test or user could reach.

**Clearing the refusal.** The box's `onChange` clears a `repeat`-typed error on `drafts.<name>` once the text changes. After a submit, revalidation recomputes the box's error as before. A successful add clears it too.

**Colours** has no lookup, but uses the same ListField, so the gate covers it with nothing extra.

### 3. Left unchanged

- `ingredient.ts` and its tests (the schema stays the backstop for an API caller).
- `references.tsx`, which already filters by source id.
- `LookupListField` and `suggestions.tsx` option shapes.

### 4. Docs

- **`claude-docs/components/ingredient-form.md`:**
  - **The fields** (list fields): the refusal at Add and Enter, the message, and where it reads.
  - **The lookups**: listed entries left out, by key per list; the typed row withheld for a repeat.
  - **One error element, two sources**: the box's `repeat` error beside the save-time `unadded` one.
  - **Testing**: the new cases.
- **`claude-docs/components/combobox.md`**: `offerTyped`.
- Copy this plan to `claude-docs/design-decisions/mb.174-plan.md`.

## Tests (TDD: written first, watched fail)

**`tests/components/Combobox/index.test.tsx`:**

- With `offerTyped={false}`, the list holds no typed row, and the suggestions still show.
- Enter with nothing highlighted still calls `onCommit`.

**`tests/components/IngredientForm/index.test.tsx`**, a new `describe('a repeat')` using the existing helpers (`renderForm`, `addEntry`, `box`, `LISTS`, `offerList`, `lookUp`, `changes`, fake timers):

- **`it.each(LISTS)`:** Add on text repeating a listed entry but for case and spacing adds nothing.
  - The box keeps its text.
  - The list's group reads the message, and the box's description carries it.
  - The changes output announces it.
  - Enter does the same.
  - Editing the text clears the message.
  - Colours is one of the six.
- **Folk Names:**
  - Add on the ingredient's Name is refused with "is already the name".
  - The lookup leaves out a listed name, and the Name.
- **Planets and Zodiac Signs:** the lookup leaves out a listed value whatever its case. The typed row isn't offered for repeat text, and is offered otherwise.
- **Deities:**
  - Greek Hecate listed: the lookup offers Roman and not Greek.
  - The uncurated "Hecate Fixturia" typed and listed is left out.
  - Typing "Hecate" with Greek Hecate linked is added, and the typed row is offered.
- **Substitutes:**
  - The linked Mockwort (coven) listed is left out by id, while the compendium Mockwort, a different id, is still offered.
  - A typed "Mockwort" beside the linked one is added.
  - A typed repeat of a typed one is refused.
- **Keyboard:** a refusal by Enter leaves the focus on the box.

The existing save-time refusal tests stay unchanged and must still pass. They build repeats through `ListField` with given values, or the resolver directly. Any test that builds a repeat by pressing Add twice must move to given values, since Add now refuses it. I'll check for these first, and say so if any must change.

## Verification

- `npm run test:coverage` and `npm run pre-commit`.
- **In the browser:** Ladle `forms--ingredient--blank`, through the playwright-server harness used for MB.154 (host IP, the `crypto.randomUUID` polyfill).
  - At 375px and in both themes, keyboard only: a refused Add shows the message under the box, and the list omits listed entries.
  - Run an axe scan of the story with the refusal showing.
- A `task-board.mjs comment MB.174` at milestones. Stop at ready; no commit or PR until asked.
