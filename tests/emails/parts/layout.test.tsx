import { readdirSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { accountExistsMessage } from '@/emails/account-exists';
import { adminInvitationMessage } from '@/emails/admin-invitation';
import { covenInvitationMessage } from '@/emails/coven-invitation';
import { emailChangeNoticeMessage } from '@/emails/email-change-notice';
import { passwordChangedMessage } from '@/emails/password-changed';
import { passwordLockedMessage } from '@/emails/password-locked';
import { resetPasswordMessage } from '@/emails/reset-password';
import { supportReplyNoticeMessage } from '@/emails/support-reply-notice';
import { verifyEmailMessage } from '@/emails/verify-email';
import type { Message } from '@/lib/types';
import { fromRoot } from '../../support/paths';

// The two rules every mail holds, asserted once for every template: a plain-text part that says
// everything the HTML does, and a link that is the obvious action, with the address readable as
// text rather than only behind a button. Each template's wording and look are its story's.

const ORIGIN = 'https://staging.sorrelandsalt.com';

const MAILS: {
  template: string;
  name: string;
  /** The mail's action address; absent for a mail that deliberately carries none. */
  link?: string;
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
        siteRole: 'admin',
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
  {
    template: 'email-change-notice',
    name: 'emailChangeNoticeMessage',
    message: () =>
      emailChangeNoticeMessage({
        to: 'someone@layout.test',
        url: ORIGIN,
        stage: 'requested',
        newDomain: 'new-layout.test',
        at: new Date('2026-10-30T12:00:00Z'),
      }),
  },
  {
    template: 'account-exists',
    name: 'accountExistsMessage',
    link: `${ORIGIN}/sign-in`,
    message: () =>
      accountExistsMessage({
        to: 'someone@layout.test',
        url: `${ORIGIN}/sign-in`,
        providers: ['google'],
        hasPassword: true,
      }),
  },
  {
    template: 'reset-password',
    name: 'resetPasswordMessage',
    link: `${ORIGIN}/api/auth/reset-password/fixture-token?callbackURL=%2Freset-password`,
    message: () =>
      resetPasswordMessage({
        to: 'someone@layout.test',
        url: `${ORIGIN}/api/auth/reset-password/fixture-token?callbackURL=%2Freset-password`,
      }),
  },
  {
    template: 'password-changed',
    name: 'passwordChangedMessage',
    link: `${ORIGIN}/forgot-password`,
    message: () =>
      passwordChangedMessage({
        to: 'someone@layout.test',
        url: `${ORIGIN}/forgot-password`,
        how: 'change',
      }),
  },
  {
    template: 'password-locked',
    name: 'passwordLockedMessage',
    link: `${ORIGIN}/api/auth/reset-password/fixture-lock-token?callbackURL=%2Freset-password`,
    message: () =>
      passwordLockedMessage({
        to: 'someone@layout.test',
        url: `${ORIGIN}/api/auth/reset-password/fixture-lock-token?callbackURL=%2Freset-password`,
        minutes: 15,
      }),
  },
  {
    template: 'support-reply-notice',
    name: 'supportReplyNoticeMessage',
    link: `${ORIGIN}/account/support`,
    message: () =>
      supportReplyNoticeMessage({
        to: 'someone@layout.test',
        url: `${ORIGIN}/account/support`,
        origin: ORIGIN,
      }),
  },
];

// Each mail is rendered once, here, and every test below reads that result:
// rendering a React Email template is the slow part, and the tests only read it.
const rendered = new Map<string, Message>();

beforeAll(async () => {
  for (const mail of MAILS) rendered.set(mail.name, await mail.message());
});

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

describe.each(MAILS)('$name', ({ name }) => {
  it('has a text part that says everything the HTML does', () => {
    const { html, text } = rendered.get(name)!;
    const said = collapse(text);
    const expected = sentences(html)
      // HTML only by design: the text part has the link once, as its own line.
      .filter((sentence) => !sentence.startsWith('Or copy this link into your browser'))
      // The button is the HTML's; the text part says "link".
      .map((sentence) => sentence.replace('click the button below', 'open the link below'));

    expect(expected.length).toBeGreaterThan(2);
    for (const sentence of expected) expect(said).toContain(sentence);
  });
});

const LINKED = MAILS.filter(
  (mail): mail is typeof mail & { link: string } => mail.link !== undefined,
);

describe.each(LINKED)('$name, link', ({ name, link }) => {
  it('writes the address out as text, not only behind a button', () => {
    const { html } = rendered.get(name)!;

    expect(html).toContain(`>${link.replace(/&/g, '&amp;')}<`);
  });

  it('puts the action first among the addresses in the text part', () => {
    const { text } = rendered.get(name)!;

    expect(text.match(/https?:\/\/\S+/)?.[0]).toBe(link);
  });
});

// The notice goes to the address an account is leaving, so it carries no link but the wordmark (claude-docs/email.md).
describe('a mail with no action', () => {
  it('links only the wordmark and prints no address in the text part', () => {
    const { html, text } = rendered.get('emailChangeNoticeMessage')!;
    const hrefs = [...html.matchAll(/<a\b[^>]*\shref="([^"]*)"/g)].map(([, href]) => href);

    expect(hrefs).toEqual([ORIGIN]);
    expect(text).not.toMatch(/https?:\/\//);
  });
});

// Zoho Mail drops the stylesheet and, in its Night mode, rewrites every inline `color` and `background-color` to an inverted `!important` value, except on an <a> whose background is an image (measured; claude-docs/email.md, "Design").
// So the page is painted by a gradient as well as a colour, and every run of text sits directly inside an anchor that carries a gradient of its own.
describe.each(MAILS)('$name, in Zoho Mail', ({ name }) => {
  it('gives every anchor a gradient background and no background colour', () => {
    const { html } = rendered.get(name)!;
    const anchors = html.match(/<a\b[^>]*>/g) ?? [];

    expect(anchors.length).toBeGreaterThan(3);
    for (const anchor of anchors) {
      expect(anchor).toMatch(/style="[^"]*linear-gradient\(/);
      expect(anchor).not.toMatch(/background-color:/);
    }
  });

  it('sets every heading and paragraph directly inside an anchor, with no text outside one', () => {
    const { html } = rendered.get(name)!;
    const blocks = [...html.matchAll(/<(h1|p)\b[^>]*>(.*?)<\/\1>/gs)].map(([, , inner]) => inner);

    expect(blocks.length).toBeGreaterThan(2);
    for (const inner of blocks) {
      const outside = inner.replace(/<a\b[^>]*>.*?<\/a>/gs, '').replace(/<[^>]*>/g, '');
      expect(outside).not.toMatch(/\S/);
    }
  });
});

/** `value` as a literal inside a RegExp. */
function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// The rules for the shared layout, which every template wears: asserted on one
// mail, not on each (rule 5). The first row stands in for them all.
describe('the shared layout', () => {
  // The layout marks where Outlook's conditional comments go with placeholder
  // elements and renderParts swaps them in: none may survive into either part.
  it('leaves no placeholder in the HTML or the text part', () => {
    const { html, text } = rendered.get(MAILS[0].name)!;

    expect(html).toContain('<!--[if mso]><table');
    expect(html).not.toContain('data-mso');
    expect(text).not.toMatch(/mso|<!--/);
  });

  // Zoho Mail drops the stylesheet and, in its Night mode, rewrites every inline `color` and
  // `background-color` to an inverted `!important` value, except on an <a> whose background is an
  // image (measured; claude-docs/email.md, "Design"). So the page is painted by a gradient as well as a colour.
  const PAGE_PAINT = 'background:#14120e linear-gradient(#14120e,#14120e)';

  it('paints the page and the surround by a gradient Zoho keeps, not a colour alone', () => {
    const { html } = rendered.get(MAILS[0].name)!;

    expect(html).toMatch(
      new RegExp(`<body class="ss-body" [^>]*style="[^"]*${escape(PAGE_PAINT)}`),
    );
    expect(html).toMatch(new RegExp(`<td class="ss-page" style="[^"]*${escape(PAGE_PAINT)}`));
  });

  it('resets the gradients in the light theme, so a client that honours it still goes light', () => {
    const { html } = rendered.get(MAILS[0].name)!;

    expect(html).toContain('.ss-page{background:#efe9da!important;color:#23201a!important;}');
    expect(html).toContain(
      '.ss-page .ss-button{background:#397511!important;color:#efe9da!important;}',
    );
    expect(html).toContain('.ss-body{background:#efe9da!important;}');
  });

  const page = () => rendered.get(MAILS[0].name)!.html;

  // iOS Mail, iCloud, Yahoo, AOL, o2.pl, Seznam and Outlook.com each applied the light text rules and not the light page rule, leaving dark text on the dark page,
  // so every light rule hangs off the one cell that carries the page colour. (Zoho reads no stylesheet at all, as measured.)
  it('scopes every light rule beneath the one cell that carries the page colour', () => {
    const html = page();
    const light = html.match(/@media \(prefers-color-scheme: light\)\{(.*?)\}\}/s)?.[1] ?? '';
    const selectors = light.match(/[^{}]+(?=\{)/g) ?? [];

    expect(selectors.length).toBeGreaterThan(5);
    for (const selector of selectors) {
      expect(selector).toMatch(/^(\.ss-page( \.ss-[a-z]+)?|\.ss-body)$/);
    }
    // No ss- rule lives outside the light block.
    expect(html.replace(light, '')).not.toMatch(/\.ss-[a-z]+[^{]*\{/);
    // The class is on exactly one element, the cell with the inline dark page.
    expect(html.match(/class="[^"]*ss-page[^"]*"/g)).toEqual(['class="ss-page"']);
  });

  // Backgrounds rather than <img>, so the text can run over their edges: Gmail
  // strips the negative margins an overlap would otherwise take.
  it('sets the photographs behind the text, from the origin the link points at', () => {
    const html = page();
    const image = (name: string) => `url(${ORIGIN}/email/images/${name}.png)`;

    for (const corner of ['sorrel', 'salt']) {
      expect(html).toMatch(
        new RegExp(`class="ss-${corner}"[^>]*background-image:${escape(image(`${corner}-dark`))}`),
      );
      expect(html).toContain(
        `.ss-page .ss-${corner}{background-image:${image(`${corner}-light`)}!important;}`,
      );
    }
    expect(html).not.toContain('<img');
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
