# DateField

A day field: a button showing the day in words ("12 March 2026"), opening a calendar that floats over the fields below it.
It replaces the browser's `<input type="date">`, whose look and highlight differ by browser.

- Props: `id`, `labelledBy` (the id of the label, so the button reads "Date, 12 March 2026"), `value`
  and `onChange` (a `YYYY-MM-DD` string), `max` (last pickable day), `disabled`.
- `day.ts` holds the day helpers the grimoire shares: `isoDay(date)` (a local date as `YYYY-MM-DD`), `today()`
  and `dayWords(day)` ("12 March 2026", read at UTC midnight so no zone shifts it). The button, the
  Workings rows and the reason Complete is off all write a day through `dayWords`.
- Built on `react-day-picker`. Its own stylesheet is not imported: `index.scss` styles it with the
  tokens, inside the browser floor. Only classes are given, no `style`.
- The calendar is a manual popover in the top layer, so it floats over the fields below and the
  dialog's scrolling body (`overflow: auto`) cannot clip it. It is fixed to the window: the component
  sets `--date-field-top` and `--date-field-left` from the button's position, below it or above when
  there is more room above, kept inside the window's width, and follows it on scroll and resize.
  Escape or a press outside closes it and returns focus to the button. Where the browser has no
  `showPopover` the panel opens in flow beneath the button instead.
- The button says it opens a dialog (`aria-haspopup="dialog"`, with `aria-expanded` and `aria-controls`), and the panel is `role="dialog"` named "Choose a Day", as the APG date-picker dialog pattern has it. It is not `aria-modal`: a press outside closes it rather than being shut out.
- The caption has a month box and a year box (`captionLayout="dropdown"`), each a `ComboboxSelect` in its compact form (`.field--compact`, 2rem high, caption-size text) and as wide as its longest option (a hidden stack of every option sizes it)
  passed to day-picker as its `Dropdown` component, so the open list is the app's own and not the
  operating system's. The list sits inside the panel's DOM, so it draws in the popover's top layer and a
  press on it is not an outside press; Escape on an open list closes the list alone. Years run from 1900
  (or the selected year, if earlier) to `max`'s year. The form allows no later day, and no lower bound.
- With no `max`, no day is disabled and the years and months run to the end of next year (`YEARS_AHEAD`).
- A Today button sits in a footer row under the grid, at its end (the caption row has no room for it at
  390 px). It picks today, closes the calendar and returns focus as a day does, and is left out only when `max`
  is before today.
- The button is as wide as the widest date it can show: a hidden sizer in the same grid cell holds every
  month name, every day number and every year from 1900 to 2999, each part stacked so it takes the widest
  in the font in use. Days after `max` are disabled and the next-month step stops at `max`'s month.
- Days are parsed and written in the browser's local calendar, never through `Date.parse`, so no
  timezone shifts the day.
- Used by the Record a Working form only. The form's Save stays disabled for a date after today.
