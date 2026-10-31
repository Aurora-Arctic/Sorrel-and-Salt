import { describe, expect, it } from 'vitest';
import { supportReceivedMessage } from '@/emails/support-received';

// What the receipt carries: whom it goes to, the answer time, and the support page; nothing the visitor wrote.

const SUPPORT_PAGE = 'http://localhost:8000/support';

describe('supportReceivedMessage', () => {
  it('goes to the visitor, promises an answer within 5 working days and links to the support page', async () => {
    const message = await supportReceivedMessage({ to: 'visitor@receipt.test', url: SUPPORT_PAGE });

    expect(message.to).toBe('visitor@receipt.test');
    expect(message.text).toContain('5 working days');
    expect(message.text).toContain(SUPPORT_PAGE);
    const hrefs = [...message.html.matchAll(/href="([^"]*)"/g)].map((match) => match[1]);
    expect(hrefs).toContain(SUPPORT_PAGE);
  });
});
