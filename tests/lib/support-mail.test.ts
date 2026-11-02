import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supportNotifier } from '@/lib/support-mail';

// The received and resolved mails go through `send()`, linked to the request or, for a signed-out sender, to the support page.

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
  const notifier = () => supportNotifier(new Request('http://localhost:8000/api/graphql'));

  it.each(['received', 'resolved'] as const)(
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

  it.each(['received', 'resolved'] as const)(
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
});
