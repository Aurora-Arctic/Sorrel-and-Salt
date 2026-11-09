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
- **The button is as wide as the widest date it can show.** A hidden sizer in the same grid cell holds every month name, every day number and every year from 1900 to 2999, each part stacked so it takes the widest in the font in use.

## Used by

The Record a Working form (its Save stays disabled for a date after today) and the Mint Cards form (`min` is tomorrow in UTC, because the service refuses an expiry at or before now).

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
- **Open, the panel is `role="dialog"`** named "Choose" with the label and "Days" ("Choose Minted Days"), as the day field's is. Below 48rem it shows one month and two side by side otherwise, read from `matchMedia` when it opens. With no `matchMedia` it shows two.
- **The quick picks stand on the left in a column**, and wrap into a row above the month on a narrow window. A quick pick sets the range in one press and closes the calendar. The pick the range matches is pressed (`aria-pressed`).
- **Picking**: the first day pressed starts a new range, held at once as from that day with no end, and the calendar stays open. The second day ends it and closes the calendar. One day pressed twice is a single day, and a second day earlier than the first swaps the ends. A line under the months, the dialog's description and a polite live region, says which press comes next. Closing after the first day keeps that day as an open-ended range.
- **Keys and closing are the day field's**, from `useCalendarPopover`: focus moves into the calendar on open and the arrow keys move between days. Escape or a press outside closes it and returns focus to the button, and the calendar claims the Escape, so a modal dialog round the field stays open. Days before `min` and after `max` are disabled, and the month steps stop at their months.
- **The months are named in words** (`captionLayout="label"`), not picked from lists, because a range of days is picked a month or two at a time and the quick picks cover the common ranges.

### Styling

`index.scss`, on the `date-range-field` block. The calendar is `DateField/calendar.scss`.

- **The button** cuts the range's words with an ellipsis when they do not fit, and its end padding keeps room for the clear.
- **A pressed quick pick** takes `$fill-quiet` and weight 600, so it is not told by colour alone.

### Not here

Stories: `src/components/DateRangeField/index.stories.tsx`. Picking, the quick picks and the keys are asserted in `tests/components/DateRangeField/`.
