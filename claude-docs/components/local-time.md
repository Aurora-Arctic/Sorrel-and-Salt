# LocalTime

`src/components/LocalTime/` — an instant to the minute, as `2026-10-30 2:05 pm`, in a `<time>` whose
`datetime` carries the full instant.

Props are in `types.ts`; `timeZone` prints in a given zone instead of the viewer's own, for tests and stories.

## How it avoids a hydration mismatch

The server cannot know the viewer's zone. The server render and the hydration render print UTC; once the
page has hydrated, the component prints the viewer's zone. It reads the zone through
`useSyncExternalStore` with a server snapshot, so React does the swap itself and there is no mismatch
and no `suppressHydrationWarning`. The text carries no zone label. The read is `useLocalTime`
(`use-local-time.ts`), shared with text that cannot be a `<time>`: the Support and Access crosses' tips and
hidden words (`UntilMark`, [`user-list.md`](user-list.md)) print the same way.

The formatters (`minuteInZone`, `minuteInUtc`, `longMinuteInZone`, `longMinuteInUtc`, `isoDayInUtc`) are in
`src/lib/utc.ts`, beside `inUtc` and `dayInUtc`. `inUtc` (24-hour, with a UTC suffix) is left to the
compendium redirect refusal, a server-built sentence that cannot know the viewer's zone. `minuteInZone`
builds the text from `Intl.DateTimeFormat` parts, so no locale's separators leak in; midnight is `12:00 am`.
The minutes and the am or pm are joined by a no-break space (`TIME_PERIOD_SPACE`, U+00A0), so a narrow line
never leaves the am or pm alone; every 12-hour formatter there uses it, `shortMinuteInZone` included.
`LocalTime` takes `long` to print `28 August 2026, 12:00 am` through `longMinuteInZone`.

## Where it is used

The three invitation tables (admin, pending and received, with `long`) and the invitation cards tables (Minted On, Refused Opens First and Latest, Card Sign-Ups Accepted On;
see [admin-cards](admin-cards.md)) and the Privilege Changes When column. A UTC day with no time, such as
the cards' Expires, is a plain `<time>` with `isoDayInUtc` instead.

## Tests

`tests/components/LocalTime/index.test.tsx` passes an explicit `timeZone`, never the machine's, and
renders to a string to prove the server prints UTC.
