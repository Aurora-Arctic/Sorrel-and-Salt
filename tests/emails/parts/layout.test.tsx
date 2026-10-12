import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { adminInvitationMessage } from '@/emails/admin-invitation';
import { covenInvitationMessage } from '@/emails/coven-invitation';
import { verifyEmailMessage } from '@/emails/verify-email';
import type { Message } from '@/lib/types';
import { fromRoot } from '../../support/paths';

// The two rules every mail holds, asserted once for every template
// (MB.118's acceptance criteria): a mail has a plain-text part that says
// everything its HTML does, and its link is the obvious action, with the
// address readable as text rather than only behind a button. Each template's
// wording and look are its story's (src/emails/*.stories.tsx).

const ORIGIN = 'https://staging.sorrelandsalt.com';

const MAILS: {
  template: string;
  name: string;
  link: string;
  message: () => Promise<Message>;
}[] = [
  {
    template: 'verify-email',
    name: 'verifyEmailMessage for a sign-up',
    link: `${ORIGIN}/api/auth/verify-email?token=a.b.c&callbackURL=%2Fcoven`,
    message: () =>
      verifyEmailMessage({
        to: 'someone@layout.test',
        url: `${ORIGIN}/api/auth/verify-email?token=a.b.c&callbackURL=%2Fcoven`,
        name: 'Fixture Reader',
        providers: ['google'],
      }),
  },
  {
    template: 'verify-email',
    name: 'verifyEmailMessage for a change of address',
    link: `${ORIGIN}/api/auth/verify-email?token=d.e.f&callbackURL=%2Faccount`,
    message: () =>
      verifyEmailMessage({
        to: 'someone@layout.test',
        url: `${ORIGIN}/api/auth/verify-email?token=d.e.f&callbackURL=%2Faccount`,
        purpose: 'change',
        name: 'Fixture Reader',
        providers: [],
      }),
  },
  {
    template: 'admin-invitation',
    name: 'adminInvitationMessage',
    link: `${ORIGIN}/invite/fixture-admin-token`,
    message: () =>
      adminInvitationMessage({
        to: 'someone@layout.test',
        url: `${ORIGIN}/invite/fixture-admin-token`,
        inviterName: 'Fixture Owner',
      }),
  },
  {
    template: 'coven-invitation',
    name: 'covenInvitationMessage',
    link: `${ORIGIN}/invite/fixture-coven-token`,
    message: () =>
      covenInvitationMessage({
        to: 'someone@layout.test',
        url: `${ORIGIN}/invite/fixture-coven-token`,
        covenName: 'Fixture Coven',
        role: 'member',
        inviterName: 'Fixture Owner',
      }),
  },
];

const collapse = (value: string) => value.replace(/\s+/g, ' ').trim();

function decode(value: string): string {
  return value
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** The text of every heading and paragraph in the HTML, as a reader sees it. */
function sentences(html: string): string[] {
  return [...html.matchAll(/<(h1|p)\b[^>]*>(.*?)<\/\1>/gs)].map(([, , inner]) =>
    collapse(decode(inner.replace(/<[^>]*>/g, ''))),
  );
}

describe.each(MAILS)('$name', ({ link, message }) => {
  it('has a text part that says everything the HTML does', async () => {
    const { html, text } = await message();
    const said = collapse(text);
    const expected = sentences(html)
      // HTML only by design: the text part has the link once, as its own line.
      .filter((sentence) => !sentence.startsWith('Or copy this link into your browser'))
      // The button is the HTML's; the text part says "link".
      .map((sentence) => sentence.replace('click the button below', 'open the link below'));

    expect(expected.length).toBeGreaterThan(2);
    for (const sentence of expected) expect(said).toContain(sentence);
  });

  it('writes the address out as text, not only behind a button', async () => {
    const { html } = await message();

    expect(html).toContain(`>${link.replace(/&/g, '&amp;')}<`);
  });

  it('puts the action first among the addresses in the text part', async () => {
    const { text } = await message();

    expect(text.match(/https?:\/\/\S+/)?.[0]).toBe(link);
  });
});

// The layout marks where Outlook's conditional comments go with placeholder
// elements and renderParts swaps them in: none may survive into either part.
describe.each(MAILS)('$name, once rendered', ({ message }) => {
  it('leaves no placeholder in the HTML or the text part', async () => {
    const { html, text } = await message();

    expect(html).toContain('<!--[if mso]><table');
    expect(html).not.toContain('data-mso');
    expect(text).not.toMatch(/mso|<!--/);
  });
});

describe('the templates', () => {
  // A new template cannot ship without a row above.
  it('are all covered by a row', () => {
    const templates = readdirSync(fromRoot('src/emails'))
      .filter((file) => file.endsWith('.tsx') && !file.endsWith('.stories.tsx'))
      .map((file) => file.replace(/\.tsx$/, ''))
      .sort();

    expect(templates.length).toBeGreaterThan(0);
    expect(templates).toEqual([...new Set(MAILS.map((mail) => mail.template))].sort());
  });
});
