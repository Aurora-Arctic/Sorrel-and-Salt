import { vi } from 'vitest';

// `@/lib/mail` for a test: `vi.mock('@/lib/mail', () => import('…/support/mail'))`. A test asserts on `send`
// through `vi.mocked(send)`.

export const send = vi.fn();
