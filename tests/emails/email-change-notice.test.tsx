import { describe, expect, it } from 'vitest';
import { emailChangeNoticeMessage } from '@/emails/email-change-notice';

// What the mail carries: whom it goes to, when, which domain, and no link that acts. Its wording and design are the story's (src/emails/email-change-notice.stories.tsx).

const ORIGIN = 'http://localhost:8000';
const AT = new Date('2026-10-30T14:05:00Z');

describe('emailChangeNoticeMessage', () => {
  it.each(['requested', 'completed'] as const)(
    'on %s names the new address by its domain only and carries no link but the site',
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
      // The wordmark points at the site; nothing else in the mail is a link.
      const hrefs = [...message.html.matchAll(/href="([^"]*)"/g)].map((match) => match[1]);
      expect(hrefs.every((href) => href === ORIGIN)).toBe(true);
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
