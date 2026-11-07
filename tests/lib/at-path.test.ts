import { describe, expect, it } from 'vitest';
import { isAtPath } from '@/lib/at-path';

// The one rule every nav marks its current link by; each nav proves only that it calls it.
describe('isAtPath', () => {
  it.each([
    ['the page itself', '/curator/forms', true],
    ['an address beneath it', '/curator/forms/some-form', true],
    ['an address deeper still', '/curator/forms/some-form/edit', true],
    ['an address that only begins with its letters', '/curator/forms-archive', false],
    ['the page above it', '/keepers', false],
    ['another page', '/keepers/users', false],
  ])('counts %s as at /curator/forms: %s', (_why, pathname, at) => {
    expect(isAtPath(pathname, '/curator/forms')).toBe(at);
  });
});
