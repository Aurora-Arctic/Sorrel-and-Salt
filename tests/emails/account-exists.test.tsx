import { describe, expect, it } from 'vitest';
import { accountExistsMessage } from '@/emails/account-exists';

// What the mail carries: its recipient, its sign-in link and how the account signs in. Its wording and design are
// the story's (src/emails/account-exists.stories.tsx).

const SIGN_IN = 'http://localhost:8000/sign-in';

describe('accountExistsMessage', () => {
  it('addresses the holder and carries the sign-in link, once in the text and twice in the HTML', async () => {
    const message = await accountExistsMessage({
      to: 'someone@account-exists.test',
      url: SIGN_IN,
      providers: ['google'],
      hasPassword: false,
    });

    expect(message.to).toBe('someone@account-exists.test');
    expect(message.text.split(SIGN_IN)).toHaveLength(2);
    expect(message.html.split(`href="${SIGN_IN}"`)).toHaveLength(3);
    expect(message.text).not.toMatch(/<[a-z]/i);
  });

  it('names the ways the account signs in, and none it lacks', async () => {
    const provider = await accountExistsMessage({
      to: 'someone@account-exists.test',
      url: SIGN_IN,
      providers: ['discord'],
      hasPassword: false,
    });
    const password = await accountExistsMessage({
      to: 'someone@account-exists.test',
      url: SIGN_IN,
      providers: [],
      hasPassword: true,
    });

    expect(provider.text).toContain('Discord');
    expect(provider.text).not.toMatch(/password/i);
    expect(password.text).toMatch(/password/i);
    expect(password.text).not.toMatch(/Facebook|Microsoft|Google|Discord/);
  });
});
