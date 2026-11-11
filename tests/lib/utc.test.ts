import { describe, expect, it } from 'vitest';
import {
  expiryOfDay,
  inUtc,
  isCalendarDay,
  isoDayInUtc,
  longMinuteInZone,
  untilPhrase,
  minuteInZone,
  printedDayOf,
  shortMinuteInZone,
} from '@/lib/utc';

describe('inUtc', () => {
  it('writes the day, the month in full, the year and a 24-hour time, in UTC', () => {
    expect(inUtc(new Date('2026-08-28T00:00:00.000Z'))).toBe('28 August 2026, 00:00 UTC');
    expect(inUtc(new Date('2026-03-01T23:59:59.999Z'))).toBe('1 March 2026, 23:59 UTC');
  });
});

describe('isoDayInUtc', () => {
  it('writes the UTC day as YYYY-MM-DD', () => {
    expect(isoDayInUtc(new Date('2026-10-30T23:59:00.000Z'))).toBe('2026-10-30');
  });
});

describe('longMinuteInZone', () => {
  const at = new Date('2026-10-30T23:05:00.000Z');
  it('writes the day, the month in full, the year and a 12-hour time in the zone given, with no zone suffix', () => {
    expect(longMinuteInZone(at, 'UTC')).toBe('30 October 2026, 11:05\u00a0pm');
    expect(longMinuteInZone(at, 'Asia/Tokyo')).toBe('31 October 2026, 8:05\u00a0am');
    expect(longMinuteInZone(at, 'America/Los_Angeles')).toBe('30 October 2026, 4:05\u00a0pm');
  });
  it('writes midnight as 12:00 am and noon as 12:00 pm', () => {
    expect(longMinuteInZone(new Date('2026-08-28T00:00:00.000Z'), 'UTC')).toBe(
      '28 August 2026, 12:00\u00a0am',
    );
    expect(longMinuteInZone(new Date('2026-08-28T12:00:00.000Z'), 'UTC')).toBe(
      '28 August 2026, 12:00\u00a0pm',
    );
  });
});

describe('shortMinuteInZone', () => {
  it('writes day, short month, then h:mm am/pm in the zone given', () => {
    expect(shortMinuteInZone(new Date('2026-10-30T14:01:00.000Z'), 'UTC')).toBe(
      '30 Oct, 2:01\u00a0pm',
    );
  });
});

describe('minuteInZone', () => {
  const at = new Date('2026-10-30T23:05:00.000Z');
  it('writes YYYY-MM-DD h:mm am/pm in the zone given, moving the day across midnight', () => {
    expect(minuteInZone(at, 'UTC')).toBe('2026-10-30 11:05\u00a0pm');
    expect(minuteInZone(at, 'Asia/Tokyo')).toBe('2026-10-31 8:05\u00a0am');
    expect(minuteInZone(at, 'America/Los_Angeles')).toBe('2026-10-30 4:05\u00a0pm');
  });
  it('writes midnight as 12:00 am and noon as 12:00 pm', () => {
    expect(minuteInZone(new Date('2026-10-30T00:00:00.000Z'), 'UTC')).toBe(
      '2026-10-30 12:00\u00a0am',
    );
    expect(minuteInZone(new Date('2026-10-30T12:00:00.000Z'), 'UTC')).toBe(
      '2026-10-30 12:00\u00a0pm',
    );
  });
});

// A card's printed day is true everywhere only while it lasts to the end of that day in the last zone on Earth (UTC-12).
describe('expiryOfDay', () => {
  it('is 12:00 UTC on the day after the chosen day', () => {
    expect(expiryOfDay('2027-01-29').toISOString()).toBe('2027-01-30T12:00:00.000Z');
    expect(expiryOfDay('2027-12-31').toISOString()).toBe('2028-01-01T12:00:00.000Z');
  });
});

describe('printedDayOf', () => {
  it('reads back the day the expiry was chosen as, and round-trips', () => {
    expect(printedDayOf(new Date('2027-01-30T12:00:00.000Z'))).toBe('2027-01-29');
    expect(printedDayOf(expiryOfDay('2028-03-01'))).toBe('2028-03-01');
  });
});

describe('isCalendarDay', () => {
  it('accepts a day written YYYY-MM-DD', () => {
    expect(isCalendarDay('2026-11-10')).toBe(true);
  });

  it('checks the shape only, leaving the range to its caller', () => {
    expect(isCalendarDay('2026-13-45')).toBe(true);
  });

  it.each([
    '2026-1-10',
    '2026-11-1',
    '20261110',
    '2026/11/10',
    ' 2026-11-10',
    '2026-11-10 ',
    '2026-11-10T00:00',
    '',
  ])('refuses %j', (text) => expect(isCalendarDay(text)).toBe(false));
});

describe('untilPhrase', () => {
  it('words an end as until its date in the zone', () => {
    const end = new Date('2999-01-01T12:00:00Z');
    expect(untilPhrase(end, 'UTC')).toBe(`until ${longMinuteInZone(end, 'UTC')}`);
  });

  it('words no end as no end date, or as the wording given', () => {
    expect(untilPhrase(null)).toBe('with no end date');
    expect(untilPhrase(null, 'UTC', 'while timed out with no end date')).toBe(
      'while timed out with no end date',
    );
  });
});
