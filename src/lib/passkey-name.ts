// Browser and platform tokens in the order they must be tested: a browser's user agent names the ones it is built on
// (Edge and Opera say Chrome, Chrome says Safari), and an iPhone says Mac OS X, so the specific token goes first.
const BROWSERS: readonly (readonly [RegExp, string])[] = [
  [/Edg(?:e|A|iOS)?\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/SamsungBrowser\//, 'Samsung Internet'],
  [/Firefox\/|FxiOS\//, 'Firefox'],
  [/Chrome\/|HeadlessChrome\/|CriOS\//, 'Chrome'],
  [/Safari\//, 'Safari'],
];
const PLATFORMS: readonly (readonly [RegExp, string])[] = [
  [/iPhone|iPad|iPod/, 'iOS'],
  [/Android/, 'Android'],
  [/Windows/, 'Windows'],
  [/Macintosh|Mac OS X/, 'macOS'],
  [/CrOS/, 'ChromeOS'],
  [/Linux|X11/, 'Linux'],
];
const FALLBACK = 'Passkey';

const firstMatch = (table: readonly (readonly [RegExp, string])[], agent: string) =>
  table.find(([pattern]) => pattern.test(agent))?.[1];

/**
 * A new passkey's name from the user agent it was made with, such as "Chrome on Linux". It names whichever of the two
 * it can read, and "Passkey" when it can read neither. A small table rather than a parser: the name is a label the
 * person renames, so a wrong guess costs nothing.
 */
export function defaultPasskeyName(userAgent: string | null | undefined): string {
  if (!userAgent) return FALLBACK;
  const browser = firstMatch(BROWSERS, userAgent);
  const platform = firstMatch(PLATFORMS, userAgent);
  if (browser && platform) return `${browser} on ${platform}`;
  return browser ?? platform ?? FALLBACK;
}
