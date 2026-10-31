import { describe, expect, it } from 'vitest';
import { validUntil } from '@/lib/invitation-cards/copy';
import { expiryOfDay } from '@/lib/utc';

describe('validUntil', () => {
  it('prints the day the expiry was chosen as, not the day the stored instant falls on', () => {
    expect(validUntil(expiryOfDay('2027-01-29'))).toBe('Valid until 29 January 2027');
  });
});
