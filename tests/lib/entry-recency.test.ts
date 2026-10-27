import { describe, expect, it } from 'vitest';
import { RECENT_DAYS, entryRecency } from '@/lib/entry-recency';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-06-30T12:00:00Z');
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const OLD = ago(400 * DAY);

describe('entryRecency', () => {
  it('reads an entry created just inside the window as new', () => {
    expect(entryRecency(ago(RECENT_DAYS * DAY - 1), ago(RECENT_DAYS * DAY - 1), NOW)).toBe('new');
  });

  it('reads an entry created exactly at the window edge as neither', () => {
    expect(entryRecency(ago(RECENT_DAYS * DAY), ago(RECENT_DAYS * DAY), NOW)).toBeNull();
  });

  it('reads an old entry changed just inside the window as updated', () => {
    expect(entryRecency(OLD, ago(RECENT_DAYS * DAY - 1), NOW)).toBe('updated');
  });

  it('reads an old entry changed at or after the window edge as neither', () => {
    expect(entryRecency(OLD, ago(RECENT_DAYS * DAY), NOW)).toBeNull();
    expect(entryRecency(OLD, ago(RECENT_DAYS * DAY + 1), NOW)).toBeNull();
  });

  it('lets new win over updated when both are recent', () => {
    expect(entryRecency(ago(2 * DAY), ago(1 * DAY), NOW)).toBe('new');
  });

  it('takes an ISO string as a date, as GraphQL sends one', () => {
    expect(entryRecency(OLD.toISOString(), ago(DAY).toISOString(), NOW)).toBe('updated');
  });
});
