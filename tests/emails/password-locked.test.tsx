import { describe, expect, it } from 'vitest';
import { lockLength, passwordLockedMessage } from '@/emails/password-locked';

// What the mail carries: its recipient, its reset link and how long the lock lasts. Its wording and design are the
// story's (src/emails/password-locked.stories.tsx).

const LINK = 'http://localhost:8000/api/auth/reset-password/token123?callbackURL=%2Freset-password';

describe('passwordLockedMessage', () => {
  it('addresses the account and carries the reset link and the length of the lock', async () => {
    const message = await passwordLockedMessage({
      to: 'someone@locked.test',
      url: LINK,
      minutes: 15,
    });

    expect(message.to).toBe('someone@locked.test');
    expect(message.text.split(LINK)).toHaveLength(2);
    expect(message.html.split(`href="${LINK}"`)).toHaveLength(3);
    expect(message.text).toContain('15 minutes');
    expect(message.text).not.toMatch(/<[a-z]/i);
  });
});

describe('lockLength', () => {
  it.each([
    [1, '1 minute'],
    [5, '5 minutes'],
    [60, '1 hour'],
    [120, '2 hours'],
  ])('says %i minutes as "%s"', (minutes, words) => {
    expect(lockLength(minutes)).toBe(words);
  });
});
