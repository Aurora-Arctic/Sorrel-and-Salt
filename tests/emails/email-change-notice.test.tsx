import { describe, expect, it } from 'vitest';
import { emailChangeNoticeMessage } from '@/emails/email-change-notice';
import { ORIGIN } from '../support/constants';

const AT = new Date('2026-10-30T14:05:00Z');

describe('emailChangeNoticeMessage', () => {
  it.each(['requested', 'completed'] as const)(
    'on %s names the new address by its domain only and links its sign-in words to the account page',
    async (stage) => {
      const message = await emailChangeNoticeMessage({
        to: 'old@notice.test',
        url: ORIGIN,
        stage,
        newDomain: 'elsewhere.example',
        at: AT,
      });

      expect(message.to).toBe('old@notice.test');
      expect(message.text).toContain('elsewhere.example');
      expect(message.text).toContain('2026');
      expect(message.text).not.toMatch(/@elsewhere/);
      // The wordmark points at the site and the sign-in words at the account page; nothing else in the mail is a link.
      const hrefs = [...message.html.matchAll(/href="([^"]*)"/g)].map((match) => match[1]);
      expect(hrefs.every((href) => href === ORIGIN || href === `${ORIGIN}/account`)).toBe(true);
      expect(hrefs).toContain(`${ORIGIN}/account`);
      expect(message.text).toContain(`${ORIGIN}/account`);
      expect(message.text).not.toMatch(/verify-email|token/);
    },
  );

  it('words a request and a completion differently', async () => {
    const input = { to: 'old@notice.test', url: ORIGIN, newDomain: 'a.example', at: AT };
    const requested = await emailChangeNoticeMessage({ ...input, stage: 'requested' });
    const completed = await emailChangeNoticeMessage({ ...input, stage: 'completed' });

    expect(requested.subject).not.toBe(completed.subject);
  });
});
