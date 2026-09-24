import { describe, expect, it } from 'vitest';
import { safeReturnPath, signInErrorMessage } from '@/lib/sign-in';

// safeReturnPath is the open-redirect guard for ?next=: without it, a crafted
// link could make /sign-in redirect anywhere after a real sign-in.
describe('safeReturnPath', () => {
  it('keeps a same-site absolute path', () => {
    expect(safeReturnPath('/coven/hearth')).toBe('/coven/hearth');
  });

  it('keeps a same-site path carrying a query string', () => {
    expect(safeReturnPath('/coven/hearth?tab=stock')).toBe('/coven/hearth?tab=stock');
  });

  it('falls back to / for undefined', () => {
    expect(safeReturnPath(undefined)).toBe('/');
  });

  it('falls back to / for an empty string', () => {
    expect(safeReturnPath('')).toBe('/');
  });

  it('falls back to / for a protocol-relative URL', () => {
    expect(safeReturnPath('//evil.example')).toBe('/');
  });

  it('falls back to / for an absolute URL', () => {
    expect(safeReturnPath('https://evil.example')).toBe('/');
  });

  it('falls back to / for a backslash-prefixed path some browsers treat as a host', () => {
    expect(safeReturnPath('/\\evil.example')).toBe('/');
  });

  it('falls back to / for a path with no leading slash', () => {
    expect(safeReturnPath('coven/hearth')).toBe('/');
  });

  it('falls back to / for an array-valued query param', () => {
    expect(safeReturnPath(['/coven/hearth', '/coven/other'])).toBe('/');
  });
});

// The callback error page must show one of our sentences, never Better
// Auth's or the provider's own error_description text.
describe('signInErrorMessage', () => {
  it('returns undefined for no code', () => {
    expect(signInErrorMessage(undefined)).toBeUndefined();
  });

  it('maps a known Better Auth callback code to a readable sentence', () => {
    expect(signInErrorMessage('access_denied')).toMatch(/[a-z]/i);
  });

  it('gives email_not_found its own sentence mentioning email', () => {
    expect(signInErrorMessage('email_not_found')).toMatch(/email/i);
  });

  it('falls back to a generic sentence for an unrecognised code', () => {
    const message = signInErrorMessage('something_unexpected');
    expect(message).toMatch(/[a-z]/i);
  });

  it('never echoes the code itself, or any provider-supplied text, verbatim', () => {
    const code = 'unable_to_get_user_info';
    expect(signInErrorMessage(code)).not.toContain(code);
  });
});
