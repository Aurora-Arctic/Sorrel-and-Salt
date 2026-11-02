import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pauseNotifier } from '@/lib/pause-mail';

// Each pause notice becomes one mail through `send()`, to the address the service gives, linking to the support page on the
// request's own origin.

const sent = vi.hoisted(() => [] as { to: string; subject: string; text: string; html: string }[]);

vi.mock('@/lib/mail', () => ({
  send: async (message: (typeof sent)[number]) => {
    sent.push(message);
  },
}));

beforeEach(() => {
  sent.length = 0;
});

const UNTIL = new Date('2099-03-14T12:00:00Z');
const notifier = () => pauseNotifier(new Request('http://localhost:8000/api/graphql'));

describe('pauseNotifier', () => {
  it('mails a support time-out to the user, with its note', async () => {
    await notifier().timedOut('sender@timed-out.test', { until: UNTIL, note: 'Spam' });

    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toBe('sender@timed-out.test');
    expect(sent[0]!.subject).toMatch(/timed out|time-out/i);
    expect(sent[0]!.text).toContain('Spam');
  });

  it('mails a site access pause to the user, linking to the support page', async () => {
    await notifier().accessPaused('member@paused.test', { until: null, note: 'Testnote' });

    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toBe('member@paused.test');
    expect(sent[0]!.subject).toMatch(/paused/i);
    expect(sent[0]!.text).toContain('http://localhost:8000/support');
    expect(sent[0]!.text).toContain('Testnote');
  });

  it('mails a coven access pause to the member, naming the coven', async () => {
    await notifier().memberPaused('member@paused.test', {
      covenName: 'Testwort Circle',
      until: UNTIL,
      note: null,
    });

    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toBe('member@paused.test');
    expect(sent[0]!.subject).toContain('Testwort Circle');
  });
});
