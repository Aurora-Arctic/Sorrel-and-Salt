import { describe, expect, it } from 'vitest';
import { isAtPath } from '@/lib/at-path';

// The one rule every nav marks its current link by: the admin nav, the coven
// nav, the page tabs, the site nav and the account menu all call it, so its
// branches are proved here once and each nav proves only that it calls it.
describe('isAtPath', () => {
  it.each([
    ['the page itself', '/admin/forms', true],
    ['an address beneath it', '/admin/forms/some-form', true],
    ['an address deeper still', '/admin/forms/some-form/edit', true],
    ['an address that only begins with its letters', '/admin/forms-archive', false],
    ['the page above it', '/admin', false],
    ['another page', '/admin/users', false],
  ])('counts %s as at /admin/forms: %s', (_why, pathname, at) => {
    expect(isAtPath(pathname, '/admin/forms')).toBe(at);
  });
});
