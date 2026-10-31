# DateField

A day field: a button showing the day in words ("12 March 2026") with a calendar mark at its end, opening a calendar that floats over the fields below it.
It replaces the browser's `<input type="date">`, whose look and highlight differ by browser.

- Props: `id`, `labelledBy` (the id of the label, so the button reads "Date, 12 March 2026"), `value`
  and `onChange` (a `YYYY-MM-DD` string), `max` (last pickable day), `min` (first pickable day), `disabled`.
- `day.ts` holds the day helpers the grimoire shares: `isoDay(date)` (a local date as `YYYY-MM-DD`), `today()`
  and `dayWords(day)` ("12 March 2026", read at UTC midnight so no zone shifts it). The button, the
  Workings rows and the reason Complete is off all write a day through `dayWords`.
- Built on `react-day-picker`. Its own stylesheet is not imported: `calendar.scss` styles it with the
  tokens, inside the browser floor. Only classes are given, no `style`.
- `calendar.tsx` holds what the day field shares with the [day-range field](date-range-field.md): `parseDay`,
  the popover hook `useCalendarPopover` (placing, the press outside, Escape), the caption's month and year
  boxes (`CaptionDropdown`), the steps' chevron (`CalendarChevron`), the class names handed to the library
  (`CALENDAR_CLASS_NAMES`) and the end mark (`CalendarIcon`). `calendar.scss` is the look both open.
- The calendar is a manual popover in the top layer, so it floats over the fields below and the
  dialog's scrolling body (`overflow: auto`) cannot clip it. It is fixed to the window: the component
  sets `--calendar-top` and `--calendar-left` from the button's position, below it or above when
  there is more room above, kept inside the window's width, and follows it on scroll and resize.
  Escape or a press outside closes it and returns focus to the button. The calendar claims the Escape
  (`preventDefault` as well as `stopPropagation`, in the capture phase), because a modal dialog round the
  field, such as the Mint Cards dialog or the phone Filters sheet, closes on any Escape left unclaimed:
  Escape shuts the calendar alone. Where the browser has no
  `showPopover` the panel opens in flow beneath the button instead.
- The button says it opens a dialog (`aria-haspopup="dialog"`, with `aria-expanded` and `aria-controls`), and the panel is `role="dialog"` named "Choose a Day", as the APG date-picker dialog pattern has it. It is not `aria-modal`: a press outside closes it rather than being shut out.
- The caption has a month box and a year box (`captionLayout="dropdown"`), each a `ComboboxSelect` in its compact form (`.field--compact`, 2rem high, caption-size text) and as wide as its longest option (a hidden stack of every option sizes it)
  passed to day-picker as its `Dropdown` component, so the open list is the app's own and not the
  operating system's. The list sits inside the panel's DOM, so it draws in the popover's top layer and a
  press on it is not an outside press; Escape on an open list closes the list alone. Years run from 1900
  (or the selected year, if earlier) to `max`'s year, or from `min`'s year (or the selected year, if earlier) when `min` is given. The Record a Working form allows no later day and no earlier one.
- With no `max`, no day is disabled and the years and months run to the end of next year (`YEARS_AHEAD`).
- A Today button sits in a footer row under the grid, at its end (the caption row has no room for it at
  390 px). It picks today, closes the calendar and returns focus as a day does, and is left out only when `max`
  is before today or `min` is after it.
- The button is as wide as the widest date it can show: a hidden sizer in the same grid cell holds every
  month name, every day number and every year from 1900 to 2999, each part stacked so it takes the widest
  in the font in use. Days after `max` and days before `min` are disabled and the month steps stop at `max`'s and `min`'s months. A `min` after today opens the calendar on `min`'s month.
- Days are parsed and written in the browser's local calendar, never through `Date.parse`, so no
  timezone shifts the day.
- Used by the Record a Working form (its Save stays disabled for a date after today) and the Mint Cards form (`min` is tomorrow in UTC, because the service refuses an expiry at or before now).

## Styling

`calendar.scss` draws the calendar on the `calendar-panel` block and the `day-picker` classes handed to the library; `index.scss` draws only the day field's button:

- **The button** is a `.input` box (`.input.date-field__button`), as wide as its hidden sizer, with the calendar mark (`.calendar-icon`, `$glyph-size`, `$text-muted`) at its end.
- **The panel** (`.calendar-panel`) is a card: `$surface-card`, a 1px `$hairline` border, `radius('surface')` and `space(3)` of padding. `--floating` places it from the two custom properties.
- **The caption** holds the two month and year boxes (`.day-picker__dropdowns`), with the previous and next steps placed over its end (`.day-picker__nav`).
- **A step and a day** take `$surface-card-hover` on hover and the `focus-ring` on keyboard focus. Day marks are round. Today is told by a ring, the chosen day by its `$accent` fill, `$text-on-color` ink and weight, so neither rests on colour alone; outside and disabled days are muted.
- **A range** (the day-range field's) marks its two ends as chosen days and lays the days between on a band, `$day-picker-band` (the accent mixed 22% into the card), running on from each end towards the other. A one-day range has no band.

The calendar's sizes and fades are the `$day-picker-*` tokens in `_variables.scss`: the caption's 2.5rem, the steps' 2rem (`$control-height-compact`, as high as the month and year boxes), the room the caption keeps for them (4.5rem), the pickers' chevron box (1.25rem) and their sizer's end room (1.75rem), the days' 2.25rem, the range band, and the fade of a step past the allowed months and of a day that cannot be chosen, which is `$opacity-disabled` (0.55), as for any control that cannot be used. The chevrons are `$glyph-size`.

## Stories

`src/components/DateField/index.stories.tsx`, titled "Forms / Date Field": `States`, a grid of
Default, Disabled, Invalid, Open (the calendar shown) and With Max (open, the days after the 24th
faded and refused, and the next-month step faded at October). The workshop's Grimoire / Record Working story draws the field inside its dialog.
