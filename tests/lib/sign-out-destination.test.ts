import { describe, expect, it } from 'vitest';
import { signOutDestination } from '@/lib/public-routes';

describe('signOutDestination', () => {
  it.each([
    '/compendium',
    '/compendium/some-entry',
    '/privacy',
    '/terms/versions/3',
    '/disclaimer',
    '/code-of-ethics',
  ])('keeps a visitor on the public page %s', (path) => {
    expect(signOutDestination(path)).toBe(path);
  });

  it.each(['/', '/coven/alpha', '/account', '/curator/zodiac-signs', '/keepers', '/sign-in-help'])(
    'sends a visitor on %s to /',
    (path) => {
      expect(signOutDestination(path)).toBe('/');
    },
  );
});
