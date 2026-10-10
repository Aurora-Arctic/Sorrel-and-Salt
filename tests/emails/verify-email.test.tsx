import { describe, expect, it } from 'vitest';
import { verifyEmailMessage } from '@/emails/verify-email';

const URL_WITH_QUERY =
  'http://localhost:8000/api/auth/verify-email?token=a.b.c&callbackURL=%2Fcoven';

describe('verifyEmailMessage', () => {
  it('addresses the mail and carries the link in both the html and the text', async () => {
    const message = await verifyEmailMessage({
      to: 'someone@verify-email.test',
      url: URL_WITH_QUERY,
      providers: ['microsoft'],
    });

    expect(message.to).toBe('someone@verify-email.test');
    expect(message.subject).toBe('Confirm Your Email for Sorrel & Salt.');
    expect(message.html).toMatch(/<h1[^>]*>Confirm Your Email<\/h1>/);
    // The inbox preview line matches the subject.
    expect(message.html).toContain('>Confirm Your Email for Sorrel &amp; Salt.<');
    // As written, not capitalised by the text conversion.
    expect(message.text).toContain('Confirm Your Email');
    expect(message.text).toContain(URL_WITH_QUERY);
    expect(message.html).toContain(`href="${URL_WITH_QUERY.replace('&', '&amp;')}"`);
    expect(message.text).not.toMatch(/<[a-z]/i);
  });

  it('names the provider the account signed in with, and says an unrequested mail can be ignored', async () => {
    const { text } = await verifyEmailMessage({
      to: 'someone@verify-email.test',
      url: URL_WITH_QUERY,
      providers: ['facebook', 'microsoft'],
    });

    expect(text).toContain('using Facebook and Microsoft.');
    expect(text).toMatch(/wasn.t you.*ignore this email/is);
    // The link only works from a browser signed in to this account.
    expect(text).toMatch(/signed in/i);
  });

  // Each part says it its own way: the HTML has a button and the link written
  // out beneath it for a client that hides buttons; the text has the link once.
  it('gives the text part the link once, and the HTML a button with the link as a fallback', async () => {
    const { html, text } = await verifyEmailMessage({
      to: 'someone@verify-email.test',
      url: URL_WITH_QUERY,
      providers: ['microsoft'],
    });

    expect(text.split(URL_WITH_QUERY)).toHaveLength(2);
    expect(text).toContain('open the link below within one hour');
    expect(text).not.toMatch(/button|copy this link/i);

    expect(html).toContain('click the button below within one hour');
    expect(html).toMatch(/class="ss-button"[^>]*>[^<]*<span[^>]*>.*Confirm My Email/s);
    expect(html).toContain('Or copy this link into your browser:');
    expect(html).not.toContain('open the link below');
  });

  it('omits the provider line when the account has none on record', async () => {
    const { text } = await verifyEmailMessage({
      to: 'someone@verify-email.test',
      url: URL_WITH_QUERY,
      providers: [],
    });

    expect(text).not.toMatch(/ using /i);
    expect(text).toContain(URL_WITH_QUERY);
  });

  // An existing account asking for this address (MB.54): the reader did not
  // sign up, so the mail says what was asked instead, and names no provider —
  // the address is new to the account, so which provider it signs in with
  // tells the reader nothing about whether the request was theirs.
  it('says an account asked for this address when the purpose is a change', async () => {
    const { text, subject } = await verifyEmailMessage({
      to: 'someone@verify-email.test',
      url: URL_WITH_QUERY,
      purpose: 'change',
      providers: ['discord'],
    });

    expect(subject).toBe('Confirm Your Email for Sorrel & Salt.');
    expect(text).toContain('asked to use this email address for their Sorrel & Salt account');
    expect(text).toContain('for their Sorrel & Salt account.');
    expect(text).not.toContain('Discord');
    expect(text).not.toContain('made a Sorrel & Salt account');
    expect(text).toMatch(/wasn.t you.*ignore this email/is);
  });
});

/** `value` as a literal inside a RegExp. */
function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

describe('verifyEmailMessage design', () => {
  async function html() {
    return (
      await verifyEmailMessage({
        to: 'someone@verify-email.test',
        url: 'https://staging.sorrelandsalt.com/api/auth/verify-email?token=a.b.c',
        providers: ['google'],
      })
    ).html;
  }

  it('is dark by default and light only under the media query', async () => {
    const page = await html();

    expect(page).toMatch(/<body[^>]*class="ss-body"[^>]*background-color:#14120e/);
    // The page colour is on a cell the layout renders, not only on Body's cell.
    expect(page).toMatch(/<td[^>]*class="ss-page"[^>]*background-color:#14120e/);
    expect(page).toContain(
      '@media (prefers-color-scheme: light){.ss-page{background-color:#efe9da!important;color:#23201a!important;}',
    );
    expect(page).toContain('<meta name="color-scheme" content="dark light"');
  });

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

  it('names the site at the top right, small, in the heading face, linked to the site', async () => {
    const page = await html();

    const wordmark = page.match(/<a[^>]*class="ss-wordmark"[^>]*>([^<]*)<\/a>/);
    expect(wordmark?.[1]).toBe('Sorrel &amp; Salt');
    expect(wordmark?.[0]).toContain('href="https://staging.sorrelandsalt.com"');
    expect(wordmark?.[0]).toMatch(/font-family:('|&#x27;)Cormorant Unicase/);
    expect(wordmark?.[0]).toMatch(/font-size:21px/);
    expect(page).toMatch(/text-align:right[^>]*>\s*<a[^>]*class="ss-wordmark"/);
    // Once: the wordmark replaced the eyebrow above the heading.
    expect(page.match(/Sorrel &amp; Salt<\/(a|p)>/g)).toHaveLength(1);
  });

  it('puts the text on the page itself, with no card behind it', async () => {
    const page = await html();

    // The button is the one rounded thing in the mail.
    expect(page.match(/border-radius/g)).toHaveLength(1);
    expect(page).toMatch(/class="ss-button"[^>]*border-radius/);
    expect(page).not.toContain('#1f1c16');
  });

  it('loads each font from the site first and Google only as the fallback', async () => {
    const page = await html();

    expect(page).toMatch(
      /src:url\('https:\/\/staging\.sorrelandsalt\.com\/email\/fonts\/lexend-latin\.woff2'\) format\('woff2'\),url\('https:\/\/fonts\.gstatic\.com\//,
    );
    expect(page).toMatch(
      /src:url\('https:\/\/staging\.sorrelandsalt\.com\/email\/fonts\/cormorant-unicase-700-latin\.woff2'\) format\('woff2'\),url\('https:\/\/fonts\.gstatic\.com\//,
    );
  });
});
