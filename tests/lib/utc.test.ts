import { describe, expect, it } from 'vitest';
import { inUtc } from '@/lib/utc';

// How a refusal names the instant a compendium redirect closes (MB.82): in
// UTC whatever the server's zone, since `expires_at` is midnight UTC.
describe('inUtc', () => {
  it('writes the day, the month in full, the year and a 24-hour time, in UTC', () => {
    expect(inUtc(new Date('2026-08-28T00:00:00.000Z'))).toBe('28 August 2026, 00:00 UTC');
    expect(inUtc(new Date('2026-03-01T23:59:59.999Z'))).toBe('1 March 2026, 23:59 UTC');
  });
});
