# DateField

A day field: a button showing the day in words ("12 March 2026"), opening a calendar that floats over the fields below it.
It replaces the browser's `<input type="date">`, whose look and highlight differ by browser.

- Props: `id`, `labelledBy` (the id of the label, so the button reads "Date, 12 March 2026"), `value`
  and `onChange` (a `YYYY-MM-DD` string), `max` (last pickable day), `disabled`.
- Built on `react-day-picker`. Its own stylesheet is not imported: `index.scss` styles it with the
  tokens, inside the browser floor. Only classes are given, no `style`.
- The calendar is a manual popover in the top layer, so it floats over the fields below and the
  dialog's scrolling body (`overflow: auto`) cannot clip it. It is fixed to the window: the component
  sets `--date-field-top` and `--date-field-left` from the button's position, below it or above when
  there is more room above, kept inside the window's width, and follows it on scroll and resize.
  Escape or a press outside closes it and returns focus to the button. Where the browser has no
  `showPopover` the panel opens in flow beneath the button instead.
- The caption has a month select and a year select (`captionLayout="dropdown"`). Years run from 1900
  (or the selected year, if earlier) to `max`'s year. The form allows no later day, and no lower bound.
- The button is as wide as the widest date it can show: a hidden sizer in the same grid cell holds every
  month name, every day number and every year from 1900 to 2999, each part stacked so it takes the widest
  in the font in use. Days after `max` are disabled and the next-month step stops at `max`'s month.
- Days are parsed and written in the browser's local calendar, never through `Date.parse`, so no
  timezone shifts the day.
- Used by the Record a Working form only. The form's Save stays disabled for a date after today.
