# MB.174 — Stop the list fields offering or adding a repeat

**Status:** decided and built. Only the decisions, the reasons and what they rule out are kept here.

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
