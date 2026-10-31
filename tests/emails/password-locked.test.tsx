import { describe, expect, it } from 'vitest';
import type { ProviderId } from '@/lib/types';
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

describe('passwordLockedMessage, the other ways in', () => {
  const render = (extra: { providers?: ProviderId[]; hasPasskey?: boolean }) =>
    passwordLockedMessage({ to: 'someone@locked.test', url: LINK, minutes: 15, ...extra });

  it('names only the providers and passkey the account has', async () => {
    const message = await render({ providers: ['google', 'discord'], hasPasskey: true });

    expect(message.text).toContain('Discord and Google');
    expect(message.text).toContain('a passkey');
    expect(message.text).not.toContain('Microsoft');
  });

  it('names a provider alone without a passkey', async () => {
    const message = await render({ providers: ['google'] });

    expect(message.text).toContain('Google');
    expect(message.text).not.toContain('passkey');
  });

  it('names no other way in when the account has none', async () => {
    const message = await render({});

    expect(message.text).not.toMatch(/Google|Discord|Facebook|Microsoft|passkey/);
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
