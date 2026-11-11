import { vi } from 'vitest';

// `@/lib/request-session` for a test: `vi.mock('@/lib/request-session', () => import('…/support/request-session'))`.
// Every export is a bare `vi.fn()`; a test sets what it returns with `vi.mocked(getSession).mockResolvedValue(…)`.

export const sessionStateFromHeaders = vi.fn();
export const sessionFromHeaders = vi.fn();
export const getSession = vi.fn();
export const getShellSession = vi.fn();
export const sessionIsVerified = vi.fn();
export const sessionIsFresh = vi.fn();
export const sessionAgreedVersion = vi.fn();
export const requireSignedIn = vi.fn();
export const requireSession = vi.fn();
export const requireAdminSession = vi.fn();
export const requireCuratorSession = vi.fn();
export const requireCovenMembership = vi.fn();
export const linkedAccounts = vi.fn();
export const hasPassword = vi.fn();
export const accountPasskeys = vi.fn();
