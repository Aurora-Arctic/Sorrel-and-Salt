# DateField

A day field: a button showing the day in words ("12 March 2026"), opening a calendar that floats over the fields below it.
It replaces the browser's `<input type="date">`, whose look and highlight differ by browser.

- Props: `id`, `labelledBy` (the id of the label, so the button reads "Date, 12 March 2026"), `value`
  and `onChange` (a `YYYY-MM-DD` string), `max` (last pickable day), `min` (first pickable day), `disabled`.
- Built on `react-day-picker`. Its own stylesheet is not imported: `index.scss` styles it with the
  tokens, inside the browser floor. Only classes are given, no `style`.
- The calendar is a manual popover in the top layer, so it floats over the fields below and the
  dialog's scrolling body (`overflow: auto`) cannot clip it. It is fixed to the window: the component
  sets `--date-field-top` and `--date-field-left` from the button's position, below it or above when
  there is more room above, kept inside the window's width, and follows it on scroll and resize.
  Escape or a press outside closes it and returns focus to the button. Where the browser has no
  `showPopover` the panel opens in flow beneath the button instead.
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
