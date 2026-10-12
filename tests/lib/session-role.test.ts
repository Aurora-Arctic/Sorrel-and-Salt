import { describe, expect, it } from 'vitest';
import { toUserRole } from '@/lib/session-role';

// The check that replaced `user.role as UserRole` in src/lib/auth.ts: Better
// Auth types the additional field as any string.
describe('toUserRole', () => {
  it('passes through each role the column holds', () => {
    expect(toUserRole('user')).toBe('user');
    expect(toUserRole('admin')).toBe('admin');
  });

  it('throws on anything else, rather than reading it as a user', () => {
    expect(() => toUserRole('owner')).toThrow('Unrecognised user role: owner');
    expect(() => toUserRole(undefined)).toThrow('Unrecognised user role: undefined');
  });
});
