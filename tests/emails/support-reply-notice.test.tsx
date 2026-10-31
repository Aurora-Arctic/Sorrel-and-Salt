import { describe, expect, it } from 'vitest';
import { supportReplyNoticeMessage } from '@/emails/support-reply-notice';

// What the mail carries: whom it goes to and the one link to the support page, and nothing of the reply.

const SUPPORT_PAGE = 'http://localhost:8000/account/support';

describe('supportReplyNoticeMessage', () => {
  it('goes to the sender and links to the support page alone', async () => {
    const message = await supportReplyNoticeMessage({
      to: 'sender@notice.test',
      url: SUPPORT_PAGE,
      requestSubject: 'The jar will not open',
    });

    expect(message.to).toBe('sender@notice.test');
    expect(message.text).toContain(SUPPORT_PAGE);
    const hrefs = [...message.html.matchAll(/href="([^"]*)"/g)].map((match) => match[1]);
    expect(hrefs).toContain(SUPPORT_PAGE);
    expect(hrefs.every((href) => href === SUPPORT_PAGE || href === 'http://localhost:8000')).toBe(
      true,
    );
  });

  it('names the request in the subject line, the heading and the plain text', async () => {
    const message = await supportReplyNoticeMessage({
      to: 'sender@notice.test',
      url: SUPPORT_PAGE,
      requestSubject: 'The jar will not open',
    });

    const named = 'Reply to your support request: The jar will not open';
    expect(message.subject).toBe(named);
    // The paragraph continues past the title, so a text node that ends at it is the heading.
    expect(message.html).toContain(`>${named}<`);
    expect(message.text).toContain(named);
  });

  it('cuts a very long subject in the subject line, the heading and the plain text', async () => {
    const message = await supportReplyNoticeMessage({
      to: 'sender@notice.test',
      url: SUPPORT_PAGE,
      requestSubject: 'x'.repeat(300),
    });

    expect(message.subject.length).toBeLessThanOrEqual(120);
    expect(message.subject).toMatch(/^Reply to your support request: x+…$/);
    expect(message.html).not.toContain('x'.repeat(200));
    expect(message.text).not.toContain('x'.repeat(200));
  });
});
