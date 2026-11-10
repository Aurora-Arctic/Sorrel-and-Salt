import { describe, expect, it } from 'vitest';
import { supportEmailReplyMessage } from '@/emails/support-email-reply';

const REQUEST_PAGE = 'http://localhost:8000/support/request/token';

describe('supportEmailReplyMessage', () => {
  it('goes to the visitor naming the request and linking its page', async () => {
    const message = await supportEmailReplyMessage({
      to: 'visitor@reply.test',
      url: REQUEST_PAGE,
      requestSubject: 'Recovery link',
    });

    expect(message.to).toBe('visitor@reply.test');
    expect(message.subject).toContain('Recovery link');
    expect(message.text).toContain(REQUEST_PAGE);
  });

  it('shows markup in the subject as text, never as html', async () => {
    const message = await supportEmailReplyMessage({
      to: 'visitor@reply.test',
      url: REQUEST_PAGE,
      requestSubject: '<script>alert(1)</script>',
    });

    expect(message.html).not.toContain('<script>');
  });
});
