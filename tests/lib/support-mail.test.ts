import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supportNotifier } from '@/lib/support-mail';

// The notice is mailed through `send()` with the link to the support page and nothing of the reply.

const sent = vi.hoisted(() => [] as { to: string; subject: string; text: string; html: string }[]);

vi.mock('@/lib/mail', () => ({
  send: async (message: (typeof sent)[number]) => {
    sent.push(message);
  },
}));

beforeEach(() => {
  sent.length = 0;
});

describe('supportNotifier', () => {
  it('mails the sender a link that opens that request', async () => {
    await supportNotifier(new Request('http://localhost:8000/api/graphql')).replyWaiting(
      'sender@example.test',
      'The jar will not open',
      'req-1',
    );

    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toBe('sender@example.test');
    expect(sent[0]!.subject).toContain('The jar will not open');
    expect(sent[0]!.text).toContain('/account/support?request=req-1');
    expect(sent[0]!.html).toContain('/account/support?request=req-1');
  });

  const notifier = () => supportNotifier(new Request('http://localhost:8000/api/graphql'));

  it.each(['received', 'resolved', 'closingSoon'] as const)(
    'mails a signed-in sender the %s mail, naming the request and linking to it',
    async (method) => {
      await notifier()[method]('sender@example.test', 'The jar will not open', 'req-1');

      expect(sent).toHaveLength(1);
      expect(sent[0]!.to).toBe('sender@example.test');
      expect(sent[0]!.subject).toContain('The jar will not open');
      expect(sent[0]!.text).toContain('/account/support?request=req-1');
      expect(sent[0]!.html).toContain('/account/support?request=req-1');
    },
  );

  it.each(['received', 'resolved', 'closingSoon'] as const)(
    'mails a signed-out sender the %s mail, linking to the support page alone',
    async (method) => {
      await notifier()[method]('visitor@example.test', 'I cannot sign in', null);

      expect(sent).toHaveLength(1);
      expect(sent[0]!.subject).toContain('I cannot sign in');
      expect(sent[0]!.text).toContain('http://localhost:8000/support');
      expect(sent[0]!.text).not.toContain('/account');
      expect(sent[0]!.html).not.toContain('/account');
    },
  );

  it('mails a receipt that names the answer time', async () => {
    await notifier().received('visitor@example.test', 'I cannot sign in', null);

    expect(sent[0]!.text).toContain('5 working days');
  });

  it('mails a signed-out visitor the reply itself', async () => {
    await supportNotifier(new Request('http://localhost:8000/api/graphql')).signedOutReply(
      'visitor@example.test',
      'Use the code on the card.',
    );

    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toBe('visitor@example.test');
    expect(sent[0]!.text).toContain('Use the code on the card.');
  });
});
