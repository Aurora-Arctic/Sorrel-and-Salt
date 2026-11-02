import { describe, expect, it } from 'vitest';
import { accessPausedMessage } from '@/emails/access-paused';
import { covenAccessPausedMessage } from '@/emails/coven-access-paused';
import { supportTimedOutMessage } from '@/emails/support-timed-out';

// What each pause notice carries: its recipient, a subject naming what was set, the end date or that there is none, and the
// note. Their wording and design are the stories' (src/emails/support-timed-out.stories.tsx and its two siblings).

const ORIGIN = 'http://localhost:8000';
const SUPPORT = `${ORIGIN}/support`;
const UNTIL = new Date('2099-03-14T12:00:00Z');
// The end date as the mails write a date: en-GB, long style, as the email change notice does.
const UNTIL_WORDS = '14 March 2099';
const NOTE = 'Repeated off-topic requests.';

describe('supportTimedOutMessage', () => {
  const render = (until: Date | null) =>
    supportTimedOutMessage({ to: 'sender@timed-out.test', url: SUPPORT, until, note: NOTE });

  it('goes to the user, says it is a support time-out, and carries the end date and the note', async () => {
    const message = await render(UNTIL);

    expect(message.to).toBe('sender@timed-out.test');
    expect(message.subject).toMatch(/support/i);
    expect(message.subject).toMatch(/timed out|time-out/i);
    expect(message.text).toContain(UNTIL_WORDS);
    expect(message.text).toContain(NOTE);
    expect(message.text).toMatch(/support request/i);
    expect(message.text).not.toMatch(/<[a-z]/i);
  });

  it('says a time-out with no end date has none', async () => {
    const message = await render(null);

    expect(message.text).toMatch(/no end date/i);
    expect(message.text).not.toContain('2099');
    expect(message.text).toContain(NOTE);
  });
});

describe('accessPausedMessage', () => {
  const render = (until: Date | null) =>
    accessPausedMessage({ to: 'member@paused.test', url: SUPPORT, until, note: NOTE });

  it('goes to the user, says their access is paused, carries the end date and the note, and links to the support page', async () => {
    const message = await render(UNTIL);

    expect(message.to).toBe('member@paused.test');
    expect(message.subject).toMatch(/paused/i);
    expect(message.text).toContain(UNTIL_WORDS);
    expect(message.text).toContain(NOTE);
    expect(message.text).toMatch(/sign in/i);
    expect(message.text).toContain(SUPPORT);
    expect(message.html).toContain(`href="${SUPPORT}"`);
  });

  it('says a pause with no end date has none', async () => {
    const message = await render(null);

    expect(message.text).toMatch(/no end date/i);
    expect(message.text).not.toContain('2099');
  });

  it('is told apart from the coven pause by its subject', async () => {
    const site = await render(UNTIL);
    const coven = await covenAccessPausedMessage({
      to: 'member@paused.test',
      url: SUPPORT,
      covenName: 'Testwort Circle',
      until: UNTIL,
      note: NOTE,
    });

    expect(site.subject).not.toBe(coven.subject);
  });
});

describe('covenAccessPausedMessage', () => {
  const render = (until: Date | null, note: string | null) =>
    covenAccessPausedMessage({
      to: 'member@paused.test',
      url: SUPPORT,
      covenName: 'Testwort Circle',
      until,
      note,
    });

  it('goes to the member, names the coven in its subject and body, and carries the end date and the note', async () => {
    const message = await render(UNTIL, NOTE);

    expect(message.to).toBe('member@paused.test');
    expect(message.subject).toContain('Testwort Circle');
    expect(message.subject).toMatch(/paused/i);
    expect(message.text).toContain('Testwort Circle');
    expect(message.text).toContain(UNTIL_WORDS);
    expect(message.text).toContain(NOTE);
  });

  it('says a pause with no end date has none, and needs no note', async () => {
    const message = await render(null, null);

    expect(message.text).toContain('Testwort Circle');
    expect(message.text).toMatch(/no end date/i);
    expect(message.text).not.toContain('2099');
    expect(message.text).not.toMatch(/null|undefined/);
  });
});
