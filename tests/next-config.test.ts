import { describe, expect, it } from 'vitest';
import nextConfig from '../next.config';

// MB.84: Next streams a page's metadata into the body for any visitor not on
// its list of HTML-limited bots whenever the page's data is not ready when the
// shell is sent. Tools that read only `<head>` (Lighthouse's `meta-description`
// audit) then find no description. `htmlLimitedBots` matching every user agent
// keeps the metadata blocking, in the head, for all of them.

describe('next.config htmlLimitedBots', () => {
  it('matches a browser, a crawler and Lighthouse alike, so metadata is never streamed', () => {
    const bots = nextConfig.htmlLimitedBots;
    expect(bots).toBeInstanceOf(RegExp);
    for (const agent of [
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36',
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'curl/8.5.0',
    ]) {
      expect(bots instanceof RegExp && bots.test(agent)).toBe(true);
    }
  });
});
