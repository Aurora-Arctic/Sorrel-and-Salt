import { describe, expect, it } from 'vitest';
import {
  supportClosingNoticeMessage,
  supportReplyMessage,
  supportStatusMessage,
} from '@/lib/support-job-mail';

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

  it('tells a signed-out sender a reply is waiting, without its text, and never links to the account pages', async () => {
    const message = await supportReplyMessage(ORIGIN, 'visitor@example.test', {
      ...REPLY,
      signedOut: true,
    });

    expect(message.to).toBe('visitor@example.test');
    expect(message.text).not.toContain(REPLY.body);
    expect(message.html).not.toContain(REPLY.body);
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

// The mailed link carries its token in the fragment, which a browser never sends to the server or in a Referer header.
describe('the signed-out view link', () => {
  const TOKEN = 'Tok3n_from-the-mail';
  const LINK = `${ORIGIN}/support/request#${TOKEN}`;

  const mails = [
    [
      'reply',
      () =>
        supportReplyMessage(ORIGIN, 'visitor@example.test', {
          ...REPLY,
          signedOut: true,
          viewToken: TOKEN,
        }),
    ],
    [
      'received',
      () => supportStatusMessage('received', ORIGIN, 'visitor@example.test', 'S', null, TOKEN),
    ],
    [
      'resolved',
      () => supportStatusMessage('resolved', ORIGIN, 'visitor@example.test', 'S', null, TOKEN),
    ],
    [
      'closing-soon',
      () =>
        supportClosingNoticeMessage(ORIGIN, 'visitor@example.test', 'S', null, 86_400_000, TOKEN),
    ],
  ] as const;

  it.each(mails)(
    'links the %s mail to the token in the fragment, never in the path',
    async (_, build) => {
      const message = await build();

      expect(message.text).toContain(LINK);
      expect(message.html).toContain(LINK);
      expect(message.text).not.toContain(`/support/request/${TOKEN}`);
      expect(message.html).not.toContain(`/support/request/${TOKEN}`);
    },
  );
});
