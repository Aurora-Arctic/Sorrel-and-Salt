import { describe, expect, it } from 'vitest';
import {
  MAILING_BATCH_PAUSE_SECONDS,
  MAILING_BATCH_SIZE,
  MAILING_DAILY_CAP,
  mailingDays,
} from '@/modules/documents/mailing-pace';

// The pace a mailing to every account keeps, named once: a batch of 25 sent one after another, a minute between batches, and 60
// a UTC day, which leaves 40 of the 100 a day Resend's free plan allows for sign-in and other mail.

describe('the mailing pace', () => {
  it('sends batches of 25, a minute apart, and 60 a UTC day', () => {
    expect({ MAILING_BATCH_SIZE, MAILING_BATCH_PAUSE_SECONDS, MAILING_DAILY_CAP }).toEqual({
      MAILING_BATCH_SIZE: 25,
      MAILING_BATCH_PAUSE_SECONDS: 60,
      MAILING_DAILY_CAP: 60,
    });
  });

  it.each([
    [0, 0],
    [1, 1],
    [60, 1],
    [61, 2],
    [1000, 17],
  ])('takes %i accounts %i days at the daily cap', (accounts, days) => {
    expect(mailingDays(accounts)).toBe(days);
  });
});
