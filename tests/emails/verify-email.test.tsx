import { describe, expect, it } from 'vitest';
import { verifyEmailMessage } from '@/emails/verify-email';

// What the mail carries — its recipient, its link and which providers it
// names — and the two rules a mail client holds it to. Its wording and its
// design are the story's (src/emails/verify-email.stories.tsx).

const URL_WITH_QUERY =
  'http://localhost:8000/api/auth/verify-email?token=a.b.c&callbackURL=%2Fcoven';

describe('verifyEmailMessage', () => {
  // The HTML has a button and the link written out beneath it for a client
  // that hides buttons; the text has the link once.
  it('addresses the mail and carries the link, once in the text and twice in the HTML', async () => {
    const message = await verifyEmailMessage({
      to: 'someone@verify-email.test',
      url: URL_WITH_QUERY,
      providers: ['microsoft'],
    });

    expect(message.to).toBe('someone@verify-email.test');
    // The inbox preview line is the subject.
    expect(message.html).toContain(`>${message.subject.replace(/&/g, '&amp;')}<`);
    expect(message.text.split(URL_WITH_QUERY)).toHaveLength(2);
    expect(message.html.split(`href="${URL_WITH_QUERY.replace('&', '&amp;')}"`)).toHaveLength(3);
    expect(message.text).not.toMatch(/<[a-z]/i);
  });

  it('names the providers the account signs in with, and none it has not', async () => {
    const named = await verifyEmailMessage({
      to: 'someone@verify-email.test',
      url: URL_WITH_QUERY,
      providers: ['facebook', 'microsoft'],
    });
    const none = await verifyEmailMessage({
      to: 'someone@verify-email.test',
      url: URL_WITH_QUERY,
      providers: [],
    });

    expect(named.text).toContain('Facebook');
    expect(named.text).toContain('Microsoft');
    expect(none.text).toContain(URL_WITH_QUERY);
    expect(none.text).not.toMatch(/Facebook|Microsoft|Google|Discord/);
  });

  // An existing account asking for this address (MB.54): the address is new to
  // the account, so which provider it signs in with tells the reader nothing
  // about whether the request was theirs.
  it('names no provider when the purpose is a change of address', async () => {
    const { text } = await verifyEmailMessage({
      to: 'someone@verify-email.test',
      url: URL_WITH_QUERY,
      purpose: 'change',
      providers: ['discord'],
    });

    expect(text).toContain(URL_WITH_QUERY);
    expect(text).not.toContain('Discord');
  });
});

/** `value` as a literal inside a RegExp. */
function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

describe('verifyEmailMessage in a mail client', () => {
  async function html() {
    return (
      await verifyEmailMessage({
        to: 'someone@verify-email.test',
        url: 'https://staging.sorrelandsalt.com/api/auth/verify-email?token=a.b.c',
        providers: ['google'],
      })
    ).html;
  }

  // iOS Mail, iCloud, Yahoo, AOL, Zoho, o2.pl, Seznam and Outlook.com each
  // applied the light text rules and not the light page rule, leaving dark
  // text on the dark page. So every light rule hangs off the one cell that
  // carries the page colour: a client that loses that rule loses them all.
  it('scopes every light rule beneath the one cell that carries the page colour', async () => {
    const page = await html();
    const light = page.match(/@media \(prefers-color-scheme: light\)\{(.*?)\}\}/s)?.[1] ?? '';
    const selectors = light.match(/[^{}]+(?=\{)/g) ?? [];

    expect(selectors.length).toBeGreaterThan(5);
    for (const selector of selectors) {
      expect(selector).toMatch(/^(\.ss-page( \.ss-[a-z]+)?|\.ss-body)$/);
    }
    // No ss- rule lives outside the light block.
    expect(page.replace(light, '')).not.toMatch(/\.ss-[a-z]+[^{]*\{/);
    // The class is on exactly one element, the cell with the inline dark page.
    expect(page.match(/class="[^"]*ss-page[^"]*"/g)).toEqual(['class="ss-page"']);
    expect(page).toMatch(/<td class="ss-page" style="background-color:#14120e;color:#ebe4d4;/);
  });

  // Backgrounds rather than <img>, so the text can run over their edges: Gmail
  // strips the negative margins an overlap would otherwise take.
  it('sets the photographs behind the text, from the origin the link points at', async () => {
    const page = await html();
    const image = (name: string) =>
      `url(https://staging.sorrelandsalt.com/email/images/${name}.png)`;

    for (const corner of ['sorrel', 'salt']) {
      expect(page).toMatch(
        new RegExp(`class="ss-${corner}"[^>]*background-image:${escape(image(`${corner}-dark`))}`),
      );
      expect(page).toContain(
        `.ss-page .ss-${corner}{background-image:${image(`${corner}-light`)}!important;}`,
      );
    }
    expect(page).not.toContain('<img');
  });
});
