# DateField

`src/components/DateField/` is a day field: a button showing the day in words ("12 March 2026") with a calendar mark at its end, opening a calendar that floats over the fields below it. It replaces the browser's `<input type="date">`, whose look and highlight differ by browser. Props are in `types.ts`. `labelledBy` is the id of the label, so the button reads "Date, 12 March 2026". `value` and `onChange` carry a `YYYY-MM-DD` string. `min` and `max` are the first and last pickable days.

The [date range field](#date-range-field) below picks two days in the same calendar.

## Contracts

- **Built on `react-day-picker`.** Its own stylesheet is not imported: `calendar.scss` styles it with the tokens, inside the browser floor. Only classes are given, no `style`.
- **The calendar loads apart.** `day-picker.ts` re-exports `DayPicker` and its locale; `lazy-day-picker.ts` holds the one shared import (`dayPickerModule`). Both fields start it once the page is idle and when their button is pointed at, focused or pressed, so the calendar opens with no loading state, and draw nothing in the popover until it arrives ([`../design-decisions/graphql.md`](../design-decisions/graphql.md), "The date field, the sortable list and the coven choice load apart").
- **`day.ts` holds the day helpers the grimoire shares**: `isoDay(date)` (a local date as `YYYY-MM-DD`), `today()` and `dayWords(day)` ("12 March 2026", read at UTC midnight so no zone shifts it). The button, the Workings rows and the reason Complete is off all write a day through `dayWords`.
- **Days are parsed and written in the browser's local calendar**, never through `Date.parse`, so no timezone shifts the day.
- **`calendar.tsx` holds what the day field shares with the range field**: `parseDay`, the popover hook `useCalendarPopover` (placing, the press outside, Escape), the caption's month and year boxes (`CaptionDropdown`), the steps' chevron (`CalendarChevron`), the class names handed to the library (`CALENDAR_CLASS_NAMES`) and the end mark (`CalendarIcon`). `calendar.scss` is the look both open.
- **The calendar is a manual popover in the top layer**, so it floats over the fields below and the dialog's scrolling body (`overflow: auto`) cannot clip it. It is fixed to the window: the component sets `--calendar-top` and `--calendar-left` from the button's position, below it or above when there is more room above, kept inside the window's width, and follows it on scroll and resize. Where the browser has no `showPopover` the panel opens in flow beneath the button instead.
- **Escape or a press outside closes it and returns focus to the button.** The calendar claims the Escape (`preventDefault` as well as `stopPropagation`, in the capture phase), because a modal dialog round the field, such as the Mint Cards dialog or the phone Filters sheet, closes on any Escape left unclaimed. Escape shuts the calendar alone.
- **The button says it opens a dialog** (`aria-haspopup="dialog"`, with `aria-expanded` and `aria-controls`), and the panel is `role="dialog"` named "Choose a Day", as the APG date-picker dialog pattern has it. It is not `aria-modal`, because a press outside closes it rather than being shut out.
- **The caption has a month box and a year box** (`captionLayout="dropdown"`), each a `ComboboxSelect` in its compact form (`.field--compact`, 2rem high, caption-size text) and as wide as its longest option (a hidden stack of every option sizes it). They are passed to day-picker as its `Dropdown` component, so the open list is the app's own and not the operating system's. The list sits inside the panel's DOM, so it draws in the popover's top layer and a press on it is not an outside press. Escape on an open list closes the list alone.
- **Years run from 1900** (or the selected year, if earlier) **to `max`'s year**, or from `min`'s year (or the selected year, if earlier) when `min` is given. With no `max`, no day is disabled and the years and months run to the end of next year (`YEARS_AHEAD`).
- **Days after `max` and days before `min` are disabled**, and the month steps stop at `max`'s and `min`'s months. A `min` after today opens the calendar on `min`'s month.
- **A Today button sits in a footer row under the grid**, at its end, because the caption row has no room for it at 390px. It picks today, closes the calendar and returns focus as a day does. It is left out only when `max` is before today or `min` is after it.
- **The button fills its column**, like the other Field controls, with the day's words at its start and the calendar mark at its end.

## Used by

The Record a Working form (its Save stays disabled for a date after today) and the Mint Cards form (`min` is tomorrow in UTC, because the service refuses an expiry at or before now), and the reference panel's Last Modified and Accessed (`max` is `latestDay()`, tomorrow in UTC, the latest the service accepts).

## Styling

`calendar.scss` draws the calendar on the `calendar-panel` block and the `day-picker` classes handed to the library. `index.scss` draws only the day field's button.

- **Not by colour alone.** Today is told by a ring, the chosen day by its fill, ink and weight.
- **A range** lays its between-days on a band, `$day-picker-band`, with no band for a one-day range.
- **The calendar's sizes and fades are the `$day-picker-*` tokens** in `_variables.scss`; a day that cannot be chosen fades to `$opacity-disabled`.

## Not here

Stories: `src/components/DateField/index.stories.tsx`; the workshop's "Grimoire / Record Working" story draws the field inside its dialog.

## Date range field

`src/components/DateRangeField/` is a day-range field: a button showing a range of days in short words ("1 Oct 2026 – 30 Oct 2026") with a calendar mark at its end, opening a calendar of two months with quick picks beside them. It is the day field's calendar, in the same popover and with the same look, picking two days instead of one. Props are in `types.ts`. `label` is the field's name, for the calendar's and the clear's names. `from` and `to` are each a `YYYY-MM-DD` string, or empty for an open end. `quickPicks` each have a `label` and a `range()` worked out when pressed. `placeholder` is shown with no day held ("Any day" by default). `past` says the range looks back, so the calendar opens with the range's month last rather than first.

Used by: the Invitation Cards filter, for Minted and Expires ([`admin-cards.md`](admin-cards.md)).

### Contracts

- **Closed, the button reads the label, then the range**: "1 Oct 2026 – 30 Oct 2026" (the dash is drawn and "to" is read), one day alone for a single day, "From 1 Oct 2026" or "To 30 Oct 2026" for an open end, or the placeholder. The button is named by the label and a span holding those words (`aria-labelledby`), not by itself, because a button named through its own id is read by its `<label>` and the range would be lost.
- **A clear sits inside the box, before the calendar mark**, while the field holds a day. It is a sibling of the button, because a button holds no other button. It is named "Clear" and the label, empties both ends, and returns focus to the field.
- **Open, the panel is `role="dialog"`** named "Choose" with the label and "Days" ("Choose Minted Days"), as the day field's is. It shows two months side by side (the picks above them until 48rem, then beside them) and one month below 36rem, or wherever two would not fit between the field's left edge and the window's 16px margin (the phone Filters sheet), read live from `matchMedia` and a measurement (`use-room-for-two-months.ts`). The panel's left edge lines up with the field's and never passes that margin. With one month it is exactly as wide as the field (`--calendar-width`, set with the position, capped inside the margin), the month at its start and the picks and the Start and End boxes using the rest; with two it is only as wide as its months. With one month and the picks in a row above (below 48rem), once the panel's inner width is at least 25.5rem (a container query on the body) the boxes stand in a column beside the month, Start above End, placed by grid so the DOM and tab order stay Start, End, calendar; narrower, they sit above the month. Above the month, the Start and End boxes sit side by side while the panel's inner width is at least 18rem (a container query on the boxes' wrapper, so the placeholder shows whole) and stack, each full width, below it; the panel is only as wide as the months, the picks and hint wrapping within. With no `matchMedia` it shows two.
- **The quick picks stand on the left in a column**, and wrap into a row above the month on a narrow window. A quick pick sets the range in one press and closes the calendar. The pick the range matches is pressed (`aria-pressed`).
- **Picking**: the first day pressed starts a new range, held at once as from that day with no end, and the calendar stays open. The second day ends it and closes the calendar. One day pressed twice is a single day, and a second day earlier than the first swaps the ends. A line under the months, the dialog's description and a polite live region, says which press comes next. Closing after the first day keeps that day as an open-ended range.
- **Start and End boxes** stand above the months, side by side, each half the months' width, built on `PlainTextField` (`range-ends.tsx`). Picking fills them, and the box the next pick will set carries `aria-current="true"` (Start for a new range, End once a start is held). A typed day is a `YYYY-MM-DD` string checked by `CalendarDay` and the `min` and `max` bounds; it counts when the box is left or Enter is pressed, and Enter is claimed so it never submits a form round the calendar. A refused day shows the Field error and changes nothing, and the ends are never swapped: "End must be on or after Start", "Start must be on or before End", or the bound it lies outside. A typed Start keeps the End held; with no End held, the next pick completes the range. A typed End completes the range and the calendar stays open. An emptied box goes back to the day it held. A second calendar pick still closes the calendar.
- **The line under the months** says which press comes next until a range is complete, then gives the days it covers, both ends counted ("1 day selected", "10 days selected"), counted in calendar days by `dayCount` in `DateField/day.ts` so a clock change shifts none.
- **Keys and closing are the day field's**, from `useCalendarPopover`: focus moves into the calendar on open and the arrow keys move between days. Escape or a press outside closes it and returns focus to the button, and the calendar claims the Escape, so a modal dialog round the field stays open. Days before `min` and after `max` are disabled, and the month steps stop at their months.
- **The months are named in words** (`captionLayout="label"`), not picked from lists, because a range of days is picked a month or two at a time and the quick picks cover the common ranges.

### Styling

`index.scss`, on the `date-range-field` block. The calendar is `DateField/calendar.scss`.

- **The button** cuts the range's words with an ellipsis when they do not fit, and its end padding keeps room for the clear.
- **A pressed quick pick** takes `$fill-quiet` and weight 600, so it is not told by colour alone.

### Not here

Stories: `src/components/DateRangeField/index.stories.tsx`. Picking, the quick picks and the keys are asserted in `tests/components/DateRangeField/`.
