import { describe, expect, it } from 'vitest';
import { accessPausedMessage } from '@/emails/access-paused';
import { covenAccessPausedMessage } from '@/emails/coven-access-paused';
import { supportTimedOutMessage } from '@/emails/support-timed-out';
import { longMinuteInZone } from '@/lib/utc';

// What each pause notice carries: its recipient, a subject naming what was set, the end date to the minute in UTC or that there
// is none, and the message written to the user when there is one. The note is for staff or the coven's owners, and no template
// shows it. Their wording and design are the stories' (src/emails/support-timed-out.stories.tsx and its two siblings).

const ORIGIN = 'http://localhost:8000';
const SUPPORT = `${ORIGIN}/support`;
const UNTIL = new Date('2099-03-14T12:00:00Z');
// "14 March 2099, 12:00 pm UTC": the end as the mails write it.
const UNTIL_WORDS = `${longMinuteInZone(UNTIL, 'UTC')} UTC`;
const MESSAGE = 'Please keep each request to one problem.';
const NOTE = 'Staff only: a repeat caller.';

type Rendered = { to: string; subject: string; text: string; html: string };

/** The text's lines, blank ones dropped. */
const linesOf = (message: Rendered) =>
  message.text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

/** A mail with no message is the mail with one, less the lines the message adds. */
function expectMessageOnlyWhenWritten(withMessage: Rendered, without: Rendered) {
  expect(withMessage.text).toContain(MESSAGE);
  expect(without.text).not.toContain(MESSAGE);
  expect(without.text).not.toMatch(/null|undefined/);
  expect(linesOf(without).length).toBeLessThan(linesOf(withMessage).length);
  for (const line of linesOf(without)) expect(linesOf(withMessage)).toContain(line);
}

/** A note handed to a template anyway, as a caller holding the row might, is never shown. */
const withNote = <P extends object>(props: P) => ({ ...props, note: NOTE }) as P;

describe('supportTimedOutMessage', () => {
  const props = (until: Date | null, message: string | null) => ({
    to: 'sender@timed-out.test',
    url: SUPPORT,
    until,
    message,
  });

  it('goes to the user, says it is a support time-out, and carries the end date to the minute in UTC and the message', async () => {
    const message = await supportTimedOutMessage(props(UNTIL, MESSAGE));

    expect(message.to).toBe('sender@timed-out.test');
    expect(message.subject).toMatch(/support/i);
    expect(message.subject).toMatch(/timed out|time-out/i);
    expect(message.text).toContain(UNTIL_WORDS);
    expect(message.text).toMatch(/support request/i);
    expect(message.text).not.toMatch(/<[a-z]/i);
    expectMessageOnlyWhenWritten(message, await supportTimedOutMessage(props(UNTIL, null)));
  });

  it('says a time-out with no end date has none', async () => {
    const message = await supportTimedOutMessage(props(null, MESSAGE));

    expect(message.text).toMatch(/no end date/i);
    expect(message.text).not.toContain('2099');
  });

  it('never shows a note', async () => {
    const message = await supportTimedOutMessage(withNote(props(UNTIL, MESSAGE)));

    expect(`${message.text}${message.html}`).not.toContain(NOTE);
  });
});

describe('accessPausedMessage', () => {
  const props = (until: Date | null, message: string | null) => ({
    to: 'member@paused.test',
    url: SUPPORT,
    until,
    message,
  });

  it('goes to the user, says their access is paused, carries the end date and the message, and links to the support page', async () => {
    const message = await accessPausedMessage(props(UNTIL, MESSAGE));

    expect(message.to).toBe('member@paused.test');
    expect(message.subject).toMatch(/paused/i);
    expect(message.text).toContain(UNTIL_WORDS);
    expect(message.text).toMatch(/sign in/i);
    expect(message.text).toContain(SUPPORT);
    expect(message.html).toContain(`href="${SUPPORT}"`);
    expectMessageOnlyWhenWritten(message, await accessPausedMessage(props(UNTIL, null)));
  });

  it('says a pause with no end date has none', async () => {
    const message = await accessPausedMessage(props(null, null));

    expect(message.text).toMatch(/no end date/i);
    expect(message.text).not.toContain('2099');
  });

  it('never shows a note', async () => {
    const message = await accessPausedMessage(withNote(props(UNTIL, MESSAGE)));

    expect(`${message.text}${message.html}`).not.toContain(NOTE);
  });

  it('is told apart from the coven pause by its subject', async () => {
    const site = await accessPausedMessage(props(UNTIL, null));
    const coven = await covenAccessPausedMessage({
      ...props(UNTIL, null),
      covenName: 'Testwort Circle',
    });

    expect(site.subject).not.toBe(coven.subject);
  });
});

describe('covenAccessPausedMessage', () => {
  const props = (until: Date | null, message: string | null) => ({
    to: 'member@paused.test',
    url: SUPPORT,
    covenName: 'Testwort Circle',
    until,
    message,
  });

  it('goes to the member, names the coven in its subject and body, and carries the end date and the message', async () => {
    const message = await covenAccessPausedMessage(props(UNTIL, MESSAGE));

    expect(message.to).toBe('member@paused.test');
    expect(message.subject).toContain('Testwort Circle');
    expect(message.subject).toMatch(/paused/i);
    expect(message.text).toContain('Testwort Circle');
    expect(message.text).toContain(UNTIL_WORDS);
    expectMessageOnlyWhenWritten(message, await covenAccessPausedMessage(props(UNTIL, null)));
  });

  it('says a pause with no end date has none', async () => {
    const message = await covenAccessPausedMessage(props(null, null));

    expect(message.text).toContain('Testwort Circle');
    expect(message.text).toMatch(/no end date/i);
    expect(message.text).not.toContain('2099');
  });

  it('never shows a note', async () => {
    const message = await covenAccessPausedMessage(withNote(props(UNTIL, MESSAGE)));

    expect(`${message.text}${message.html}`).not.toContain(NOTE);
  });
});
