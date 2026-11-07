# One rule for what counts as a repeat list entry

**Status:** decided. Live home: `claude-docs/components/ingredient-form.md`; the helper is `repeatOf` in `src/components/IngredientForm/values.ts`.

## Decision

`repeatOf(values, list, text, link?)` returns the message that refuses `text` (and `link`) as a list's next entry, or `undefined`. It mirrors the schema's keys exactly: trim each entry and fold it with `toLowerCase()`.

| List                           | A repeat when                                                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Planets, Zodiac Signs, Colours | Folded text equals a listed entry's                                                                                                                    |
| Folk Names                     | As above, or folded text equals the ingredient's Name                                                                                                  |
| Deities                        | Linked: the same deity id is listed. Typed (no link): folded text equals a typed entry's. A typed name equal to a linked deity's name is not a repeat. |
| Substitutes                    | Linked: the same ingredient id is listed. Typed: folded text equals a typed entry's.                                                                   |

Messages read on the list's one error element: `"Mars" is already listed`; for folk names only, `"Testwort" is already the name`. The text is quoted as typed, trimmed.

## Why

The form and the schema must refuse the same repeats, so the helper mirrors the schema rather than inventing a second rule.

## Rules out

- A form-only notion of repeat that the schema would accept.
