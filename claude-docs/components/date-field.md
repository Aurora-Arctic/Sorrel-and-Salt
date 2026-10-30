# DateField

A day field: a button showing the day in words ("12 March 2026"), opening an inline calendar below it.
It replaces the browser's `<input type="date">`, whose look and highlight differ by browser.

- Props: `id`, `labelledBy` (the id of the label, so the button reads "Date, 12 March 2026"), `value`
  and `onChange` (a `YYYY-MM-DD` string), `max` (last pickable day), `disabled`.
- Built on `react-day-picker`. Its own stylesheet is not imported: `index.scss` styles it with the
  tokens, inside the browser floor. Only classes are given, no `style`.
- The panel is in flow, not a popover, so it needs no anchor positioning. Escape closes it and returns
  focus to the button. Days after `max` are disabled and the next-month step stops at `max`'s month.
- Days are parsed and written in the browser's local calendar, never through `Date.parse`, so no
  timezone shifts the day.
- Used by the Record a Working form only. The form's Save stays disabled for a date after today.
