import { describe, expect, it } from 'vitest';
import { defaultPasskeyName } from '@/lib/passkey-name';

const CHROME_LINUX =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const EDGE_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0';
const SAFARI_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const CHROME_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1';
const FIREFOX_ANDROID = 'Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0';
const CHROME_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const HEADLESS_CHROME =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/130.0.0.0 Safari/537.36';

describe('defaultPasskeyName', () => {
  it.each([
    [CHROME_LINUX, 'Chrome on Linux'],
    [HEADLESS_CHROME, 'Chrome on Linux'],
    [EDGE_WINDOWS, 'Edge on Windows'],
    [SAFARI_MAC, 'Safari on macOS'],
    [SAFARI_IPHONE, 'Safari on iOS'],
    [CHROME_IOS, 'Chrome on iOS'],
    [FIREFOX_ANDROID, 'Firefox on Android'],
    [CHROME_ANDROID, 'Chrome on Android'],
  ])('reads the browser and platform from %s', (agent, name) => {
    expect(defaultPasskeyName(agent)).toBe(name);
  });

  it('names the browser alone when the platform is unknown, and the platform alone when the browser is', () => {
    expect(defaultPasskeyName('Firefox/131.0')).toBe('Firefox');
    expect(defaultPasskeyName('Mozilla/5.0 (X11; Linux x86_64) Gecko/1')).toBe('Linux');
  });

  it.each([[null], [undefined], [''], ['curl/8.0']])('falls back to Passkey for %s', (agent) => {
    expect(defaultPasskeyName(agent)).toBe('Passkey');
  });
});
