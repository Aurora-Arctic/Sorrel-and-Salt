# LastEdit

`src/components/LastEdit/` — who last changed a row and when (M6.18, story 13). One
compact, quiet line: "Edited 3 days ago". The full sentence, "Last edited by Fixture A
on 1 September 2026", is in a tip on it.

## Props

| Prop | What it is                                                                                                                      |
| ---- | ------------------------------------------------------------------------------------------------------------------------------- |
| `by` | The editor's display name, from `displayNamesOf`. Null when the viewer cannot name them: the sentence then leaves out "by" only |
| `at` | The moment of the edit, an ISO 8601 string                                                                                      |

## The tip

The line is a button on the shared `useTip` hook (`InfoTip/use-tip.ts`), built the way
InfoTip is: `aria-describedby` points at a `role="tooltip"` bubble that stays in the page
while closed, so a screen reader gets the full sentence. Hover opens it after the standard
300 ms wait; focus and click open it at once; blur closes it. InfoTip and IconTip
were not used as they are: IconTip is decoration that describes nothing, and InfoTip draws
an (i) button, not a text line. The tip carries what the line does not (the editor and the
full date), which is the M12.43 test for a real tip.

On the coven card the card's stretched name link covers the card, so the line sits above it
(`position: relative; z-index: 1`); without that, hover never reached the line and only
focus worked.

## How the time works

The line holds a `<time>` whose `datetime` holds the moment. Before hydration it reads a
short absolute date in UTC ("1 Sept 2026"), so the server's zone cannot move it. Once the
page has hydrated (`useHydrated`) it reads the relative phrase ("3 days ago", `relative.ts`,
`Intl.RelativeTimeFormat`), which depends on the reader's clock. Under a minute, or a moment
ahead of the reader's clock, it reads "just now". An unparseable `at` draws nothing.

## Where it is used

- `IngredientCard`'s `lastEdit` prop ([`ingredient-card.md`](ingredient-card.md)): in the
  card's foot, under the jar lines and directly above the actions, left-aligned.
- `IngredientEntry` ([`ingredient-entry.md`](ingredient-entry.md)): above the names, in the
  head. Quick Look (the details modal) draws it in the same place through the Modal's
  `aboveName` slot ([`modal.md`](modal.md)); the spacing is one shared rule in `index.scss`.

The caller works out which edit is the latest; this component only shows it. The ink is
`$text-placeholder`, the faintest existing text token that passes 4.5:1 on the card in both
themes.
