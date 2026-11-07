import { describe, expect, it } from 'vitest';
import { verifyEmailMessage } from '@/emails/verify-email';

const URL_WITH_QUERY =
  'http://localhost:8000/api/auth/verify-email?token=a.b.c&callbackURL=%2Fcoven';

describe('verifyEmailMessage', () => {
  it('addresses the mail and carries the link, once in the text and twice in the HTML', async () => {
    const message = await verifyEmailMessage({
      to: 'someone@verify-email.test',
      url: URL_WITH_QUERY,
      providers: ['microsoft'],
    });

    expect(message.to).toBe('someone@verify-email.test');
    expect(message.text.split(URL_WITH_QUERY)).toHaveLength(2);
    expect(message.html.split(`href="${URL_WITH_QUERY.replace('&', '&amp;')}"`)).toHaveLength(3);
    expect(message.text).not.toMatch(/<[a-z]/i);
  });

  it('names the providers the account signs in with, and none it has not', async () => {
    const named = await verifyEmailMessage({
      to: 'someone@verify-email.test',
      url: URL_WITH_QUERY,
      providers: ['facebook', 'microsoft'],
    });
    const none = await verifyEmailMessage({
      to: 'someone@verify-email.test',
      url: URL_WITH_QUERY,
      providers: [],
    });

    expect(named.text).toContain('Facebook');
    expect(named.text).toContain('Microsoft');
    expect(none.text).toContain(URL_WITH_QUERY);
    expect(none.text).not.toMatch(/Facebook|Microsoft|Google|Discord/);
  });

  // An existing account asking for this address: the address is new to the account, so which
  // provider it signs in with tells the reader nothing about whether the request was theirs.
  it('names no provider when the purpose is a change of address', async () => {
    const { text } = await verifyEmailMessage({
      to: 'someone@verify-email.test',
      url: URL_WITH_QUERY,
      purpose: 'change',
      providers: ['discord'],
    });

    expect(text).toContain(URL_WITH_QUERY);
    expect(text).not.toContain('Discord');
  });
});
