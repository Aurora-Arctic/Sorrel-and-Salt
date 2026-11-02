import { describe, expect, it } from 'vitest';
import { supportReplyMessage, supportStatusMessage } from '@/lib/support-job-mail';

// The mails a job's step builds. A reply: a signed-in sender is told one is waiting, without its text, and a signed-out sender is
// sent it whole. The received and resolved mails: linked to the request, or for a signed-out sender to the support page alone.

const ORIGIN = 'http://localhost:8000';
const REPLY = {
  requestId: 'req-1',
  requestSubject: 'The jar will not open',
  body: 'Use the code on the card.',
};

describe('supportReplyMessage', () => {
  it('tells a signed-in sender a reply is waiting, links to the request and carries none of its text', async () => {
    const message = await supportReplyMessage(ORIGIN, 'sender@example.test', {
      ...REPLY,
      signedOut: false,
    });

    expect(message.to).toBe('sender@example.test');
    expect(message.subject).toContain('The jar will not open');
    expect(message.text).toContain(`${ORIGIN}/account/support?request=req-1`);
    expect(message.html).toContain(`${ORIGIN}/account/support?request=req-1`);
    expect(message.text).not.toContain(REPLY.body);
    expect(message.html).not.toContain(REPLY.body);
  });

  it('sends a signed-out sender the reply itself, linked to the support page alone', async () => {
    const message = await supportReplyMessage(ORIGIN, 'visitor@example.test', {
      ...REPLY,
      signedOut: true,
    });

    expect(message.to).toBe('visitor@example.test');
    expect(message.text).toContain(REPLY.body);
    expect(message.text).toContain(`${ORIGIN}/support`);
    expect(message.text).not.toContain('/account');
    expect(message.html).not.toContain('/account');
  });
});

describe('supportStatusMessage', () => {
  it.each(['received', 'resolved'] as const)(
    'mails a signed-in sender the %s mail, naming the request and linking to it',
    async (kind) => {
      const message = await supportStatusMessage(
        kind,
        ORIGIN,
        'sender@example.test',
        'The jar will not open',
        'req-1',
      );

      expect(message.to).toBe('sender@example.test');
      expect(message.subject).toContain('The jar will not open');
      expect(message.text).toContain('/account/support?request=req-1');
      expect(message.html).toContain('/account/support?request=req-1');
    },
  );

  it.each(['received', 'resolved'] as const)(
    'mails a signed-out sender the %s mail, linking to the support page alone',
    async (kind) => {
      const message = await supportStatusMessage(
        kind,
        ORIGIN,
        'visitor@example.test',
        'I cannot sign in',
        null,
      );

      expect(message.subject).toContain('I cannot sign in');
      expect(message.text).toContain(`${ORIGIN}/support`);
      expect(message.text).not.toContain('/account');
      expect(message.html).not.toContain('/account');
    },
  );

  it('mails a receipt that names the answer time', async () => {
    const message = await supportStatusMessage(
      'received',
      ORIGIN,
      'visitor@example.test',
      'I cannot sign in',
      null,
    );

    expect(message.text).toContain('5 working days');
  });
});
