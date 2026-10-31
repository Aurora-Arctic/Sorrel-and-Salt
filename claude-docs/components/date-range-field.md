# DateRangeField

A day-range field: a button showing a range of days in short words ("1 Oct 2026 – 30 Oct 2026") with a calendar
mark at its end, opening a calendar of two months with quick picks beside them. It is the [day field](date-field.md)'s
calendar, in the same popover and with the same look, picking two days instead of one. The Invitation Cards filter
uses it for Minted and Expires ([admin-cards.md](admin-cards.md)).

- Props: `id`, `labelledBy` (the id of the label), `label` (the field's name, for the calendar's and the clear's
  names), `from` and `to` (each a `YYYY-MM-DD` string, or empty for an open end), `onChange` (given `{ from, to }`),
  `quickPicks` (each a `label` and a `range()` worked out when pressed), `min` and `max` (the first and last pickable
  days), `placeholder` (shown with no day held; "Any day" by default), `past` (the range looks back, so the calendar
  opens with the range's month last rather than first), and `aria-invalid` and `aria-describedby` from the field
  shell.
- **Closed**, the button reads the label, then the range: "1 Oct 2026 – 30 Oct 2026" (the dash is drawn and "to" is
  read), one day alone for a single day, "From 1 Oct 2026" or "To 30 Oct 2026" for an open end, or the placeholder.
  The button is named by the label and a span holding those words (`aria-labelledby`), not by itself, because a
  button named through its own id is read by its `<label>` and the range would be lost.
- **A clear** sits inside the box, before the calendar mark, while the field holds a day. It is a sibling of the
  button, as a button holds no other button, is named "Clear" and the label, empties both ends, and returns focus to
  the field.
- **Open**, the panel is `role="dialog"` named "Choose" with the label and "Days" ("Choose Minted Days"), as the day
  field's is. Below 48rem it shows one month, two side by side otherwise, read from `matchMedia` when it opens; with
  no `matchMedia` it shows two. The quick picks stand on the left in a column, and wrap into a row above the month on
  a narrow window. A quick pick sets the range in one press and closes the calendar; the pick the range matches is
  pressed (`aria-pressed`).
- **Picking**: the first day pressed starts a new range, held at once as from that day with no end, and the calendar
  stays open; the second day ends it and closes the calendar. One day pressed twice is a single day, and a second day
  earlier than the first swaps the ends. A line under the months, the dialog's description and a polite live
  region, says which press comes next. Closing after the first day keeps that day as an open-ended range.
- **Keys and closing** are the day field's, from `useCalendarPopover` in `DateField/calendar.tsx`: focus moves into
  the calendar on open and the arrow keys move between days; Escape or a press outside closes it and returns focus to
  the button. The calendar claims the Escape, so a modal dialog round the field, such as the phone Filters sheet,
  stays open. Days before `min` and after `max` are disabled, and the month steps stop at their months.
- The months are named in words (`captionLayout="label"`), not picked from lists: a range of days is picked a month
  or two at a time, and the quick picks cover the common ranges.

## Styling

`index.scss`, on the `date-range-field` block; the calendar is `DateField/calendar.scss`:

- **The button** is a `.input` box (`.input.date-range-field__button`) as wide as its column, the range's words
  cut with an ellipsis when they do not fit, and the calendar mark placed at its end. Its end padding keeps room for
  the clear.
- **The clear** is placed over the box's end, before the mark: `$text-muted`, `$text-primary` on hover, the
  `focus-ring` on keyboard focus.
- **A quick pick** is caption-size text on no fill, `$surface-card-hover` on hover, the `focus-ring` on keyboard
  focus. A pressed pick takes `$fill-quiet` and weight 600, so it is not told by colour alone.
- **The hint** under the months is muted caption text.

## Stories

`src/components/DateRangeField/index.stories.tsx`, titled "Forms / Date Range Field": `States`, a grid of Empty,
From Only, Single Day and Open (September and October, the range banded between its ends and Last 30 Days pressed),
each under a Minted label as the Invitation Cards drawer draws it. Picking, the quick picks and the keys are asserted
in `tests/components/DateRangeField/`.
