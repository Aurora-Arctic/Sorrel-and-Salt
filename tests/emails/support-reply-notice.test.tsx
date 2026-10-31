import { describe, expect, it } from 'vitest';
import { supportReplyNoticeMessage } from '@/emails/support-reply-notice';

// What the mail carries: whom it goes to and the one link to the support page, and nothing of the reply.

const SUPPORT_PAGE = 'http://localhost:8000/account/support';

describe('supportReplyNoticeMessage', () => {
  it('goes to the sender and links to the support page alone', async () => {
    const message = await supportReplyNoticeMessage({
      to: 'sender@notice.test',
      url: SUPPORT_PAGE,
    });

    expect(message.to).toBe('sender@notice.test');
    expect(message.text).toContain(SUPPORT_PAGE);
    const hrefs = [...message.html.matchAll(/href="([^"]*)"/g)].map((match) => match[1]);
    expect(hrefs).toContain(SUPPORT_PAGE);
    expect(hrefs.every((href) => href === SUPPORT_PAGE || href === 'http://localhost:8000')).toBe(
      true,
    );
  });
});
