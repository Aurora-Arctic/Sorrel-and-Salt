import { describe, expect, it } from 'vitest';
import { batchStatus } from '@/components/AdminCards/batches';

const NOW = new Date('2026-10-30T12:00:00Z');
const LATER = new Date('2026-12-01T00:00:00Z');
const EARLIER = new Date('2026-10-01T00:00:00Z');

// The head card of a batch can have been accepted, so the status reads the counts, not one card.
describe('batchStatus', () => {
  it('is live while any card is pending', () => {
    expect(batchStatus({ cards: 9, accepted: 2, pending: 7 }, LATER, NOW)).toBe('live');
  });

  it('is used up when every card was accepted, even past the expiry', () => {
    expect(batchStatus({ cards: 9, accepted: 9, pending: 0 }, EARLIER, NOW)).toBe('used-up');
  });

  it('is expired when none is pending and the expiry has passed', () => {
    expect(batchStatus({ cards: 9, accepted: 3, pending: 0 }, EARLIER, NOW)).toBe('expired');
  });

  it('is revoked when none is pending, not all were accepted, and the expiry is ahead', () => {
    expect(batchStatus({ cards: 9, accepted: 3, pending: 0 }, LATER, NOW)).toBe('revoked');
  });
});
