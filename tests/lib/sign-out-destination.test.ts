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
    '/help',
    '/help/glossary',
    '/help/x/y',
  ])('keeps a visitor on the public page %s', (path) => {
    expect(signOutDestination(path)).toBe(path);
  });

  it.each([
    '/',
    '/coven/alpha',
    '/account',
    '/curator/zodiac-signs',
    '/keepers',
    '/sign-in-help',
    '/sign-in',
    '/invite/abc',
    '/i/abc',
    '/support',
    '/support/request',
    '/access-paused',
    '/reset-password',
    '/forgot-password',
    '/helpful',
  ])('sends a visitor on %s to /', (path) => {
    expect(signOutDestination(path)).toBe('/');
  });
});
