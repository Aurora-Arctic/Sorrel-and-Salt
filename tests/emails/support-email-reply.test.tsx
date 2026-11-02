import { describe, expect, it } from 'vitest';
import { supportEmailReplyMessage } from '@/emails/support-email-reply';

// What the mail carries: the reply itself, since its reader has no page to read it on, and the support page to answer from.

const SUPPORT_PAGE = 'http://localhost:8000/support';

describe('supportEmailReplyMessage', () => {
  it('goes to the visitor with the whole reply, in both the html and the text', async () => {
    const message = await supportEmailReplyMessage({
      to: 'visitor@reply.test',
      url: SUPPORT_PAGE,
      body: 'First paragraph & more.\n\nSecond paragraph.',
    });

    expect(message.to).toBe('visitor@reply.test');
    expect(message.text).toContain('First paragraph & more.');
    expect(message.text).toContain('Second paragraph.');
    expect(message.html).toContain('Second paragraph.');
    expect(message.text).toContain(SUPPORT_PAGE);
  });

  it('shows markup in the reply as text, never as html', async () => {
    const message = await supportEmailReplyMessage({
      to: 'visitor@reply.test',
      url: SUPPORT_PAGE,
      body: '<script>alert(1)</script>',
    });

    expect(message.html).not.toContain('<script>');
  });
});
