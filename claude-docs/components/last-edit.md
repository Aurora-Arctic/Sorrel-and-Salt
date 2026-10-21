# LastEdit

`src/components/LastEdit/` — who last changed a row and when (M6.18, story 13). One
line of small, quiet text: "Last edited by Fixture A on 1 September 2026 (3 days ago)".

## Props

| Prop | What it is                                                                                                                  |
| ---- | --------------------------------------------------------------------------------------------------------------------------- |
| `by` | The editor's display name, from `displayNamesOf`. Null when the viewer cannot name them: the line then leaves out "by" only |
| `at` | The moment of the edit, an ISO 8601 string                                                                                  |

## How the time works

Both the date and the relative phrase sit in one `<time>` element whose `datetime`
holds the moment. The server renders the date in UTC (so the server's zone cannot move
it). The relative phrase ("3 days ago", `relative.ts`, `Intl.RelativeTimeFormat`)
depends on the reader's clock, so `relative-time.tsx`, a small client component, draws it
only once the page has hydrated (`useHydrated`): the server's HTML and the browser's first
render are the same. It is shown beside the date, never in a tooltip. Under a minute, or
a moment ahead of the reader's clock, it reads "just now".

An unparseable `at` draws nothing.

## Where it is used

`IngredientCard`'s `lastEdit` prop ([`ingredient-card.md`](ingredient-card.md)) draws it in
the card's foot, under the jar lines and above the actions. The caller works out which
edit is the latest; this component only shows it.
