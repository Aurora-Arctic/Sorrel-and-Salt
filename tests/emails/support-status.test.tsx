import { describe, expect, it } from 'vitest';
import { supportClosingSoonMessage, timeLeft } from '@/emails/support-closing-soon';
import { supportReceivedMessage } from '@/emails/support-received';
import { supportResolvedMessage } from '@/emails/support-resolved';

const ORIGIN = 'http://localhost:8000';
const REQUEST_PAGE = `${ORIGIN}/account/support?request=req-1`;
const SUPPORT_PAGE = `${ORIGIN}/support`;
const SUBJECT = 'The jar will not open';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const closingSoon = (props: Omit<Parameters<typeof supportClosingSoonMessage>[0], 'timeLeftMs'>) =>
  supportClosingSoonMessage({ ...props, timeLeftMs: 2 * DAY });

const MAILS = [
  ['received', supportReceivedMessage],
  ['resolved', supportResolvedMessage],
  ['closing soon', closingSoon],
] as const;

const hrefsOf = (html: string) => [...html.matchAll(/href="([^"]*)"/g)].map((match) => match[1]);

describe.each(MAILS)('the %s mail', (_name, build) => {
  it('names the request in the subject line, and links to it in both parts', async () => {
    const message = await build({
      to: 'sender@status.test',
      url: REQUEST_PAGE,
      requestSubject: SUBJECT,
    });

    expect(message.to).toBe('sender@status.test');
    expect(message.subject).toContain(SUBJECT);
    expect(message.text.length).toBeGreaterThan(0);
    expect(message.text).toContain(SUBJECT);
    expect(message.text).toContain(REQUEST_PAGE);
    expect(hrefsOf(message.html)).toContain(REQUEST_PAGE);
  });

  it('cuts a very long subject in the subject line and both parts', async () => {
    const message = await build({
      to: 'sender@status.test',
      url: REQUEST_PAGE,
      requestSubject: 'x'.repeat(300),
    });

    expect(message.subject.length).toBeLessThanOrEqual(120);
    expect(message.html).not.toContain('x'.repeat(200));
    expect(message.text).not.toContain('x'.repeat(200));
  });

  it('links a signed-out sender to the support page and to nothing behind a sign-in', async () => {
    const message = await build({
      to: 'visitor@status.test',
      url: SUPPORT_PAGE,
      requestSubject: SUBJECT,
      signedOut: true,
    });

    expect(message.subject).toContain(SUBJECT);
    expect(message.text).toContain(SUPPORT_PAGE);
    expect(message.text).not.toContain('/account');
    expect(message.html).not.toContain('/account');
    expect(hrefsOf(message.html)).toContain(SUPPORT_PAGE);
  });
});

describe('the received mail', () => {
  it('carries the 5-working-day promise, signed in or out', async () => {
    const base = { to: 'sender@status.test', requestSubject: SUBJECT };
    const signedIn = await supportReceivedMessage({ ...base, url: REQUEST_PAGE });
    const signedOut = await supportReceivedMessage({ ...base, url: SUPPORT_PAGE, signedOut: true });

    expect(signedIn.text).toContain('5 working days');
    expect(signedOut.text).toContain('5 working days');
  });
});

describe('the resolved mail', () => {
  it('says a reply from the sender reopens the request', async () => {
    const message = await supportResolvedMessage({
      to: 'sender@status.test',
      url: REQUEST_PAGE,
      requestSubject: SUBJECT,
    });

    expect(message.text).toMatch(/reply from you reopens it/);
    expect(message.html).toMatch(/reply from you reopens it/);
  });
});

describe('the closing-soon mail', () => {
  it('says how long is left as of the send, in both parts', async () => {
    const message = await supportClosingSoonMessage({
      to: 'sender@status.test',
      url: REQUEST_PAGE,
      requestSubject: SUBJECT,
      timeLeftMs: 12 * HOUR,
    });

    expect(message.text).toContain('closes in 12 hours');
    expect(message.html).toContain('closes in 12 hours');
  });

  it.each([
    [2 * DAY, '2 days'],
    [DAY + 2 * HOUR, '1 day'],
    [23 * HOUR, '23 hours'],
    [HOUR, '1 hour'],
    [10 * 60 * 1000, 'less than an hour'],
  ])('puts %d ms as %s', (ms, words) => {
    expect(timeLeft(ms)).toBe(words);
  });
});
