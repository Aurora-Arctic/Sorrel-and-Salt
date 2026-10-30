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

The button is at least 24px tall to press (WCAG 2.5.8, Target Size (Minimum); MB.272, the
owner's call). One line of the card's small text is 21.4px, and WCAG's spacing exception for a
smaller target does not apply on the card, where the button lies on the stretched link and just
above the foot's buttons. `padding-block` grows the button by half the shortfall (`$icon-size`,
24px, less one line height, `1lh`) above and below, and an equal negative `margin-block` takes it
back out of the line, so the line, the card and its foot do not move (measured in Chromium: the
card's height and the foot row's place are the same to the hundredth of a pixel before and after).
Not a `min-block-size`, which would make the line taller and push the foot down. The same rule
holds wherever the line is used. `tests/e2e/card-click.spec.ts` measures it on a coven card.

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
- `SpellCard`'s `lastEdit` prop ([`spell-card.md`](spell-card.md)): in the card's foot, under
  the categories (M10.11).

The caller works out which edit is the latest; this component only shows it. The ink is
`$last-edit-ink` (M12.56): in dark the placeholder mix (the muted ink 85% into the card), 7.37:1;
in light the muted ink itself, 5.99:1 on the page and higher on the card. The placeholder mix was
4.22:1 on the page in light, under 4.5:1, so light takes the muted ink; dark keeps its colour
unchanged. `tests/scss/tokens.test.ts` holds both on the card and the page.

## The compact line and its tip

The compact line reads "Edited 3 days ago" once the page has hydrated and "Edited 1 Sep 2026" before it, inside a `<time>`. The full sentence is the tip. The relative phrase depends on the reader's clock, so it is drawn only after hydration (`useHydrated`), which keeps the server's HTML and the first client render in agreement.

The text is a button, so a keyboard reaches the tip. It follows InfoTip's pattern rather than IconTip's: the tip holds what the line leaves out, so the button lists it in `aria-describedby` and the sentence stays in the page while the tip is closed.

## Stories

`src/components/LastEdit/index.stories.tsx`, titled "Ingredients / Last Edit": `States`, a grid of Just Now, Hours Ago, Days Ago, Months Ago, Years Ago, Unnamed (an editor the viewer cannot name, so the time stays and the name goes), Clock In The Future, and Invalid Date: Nothing Drawn.
