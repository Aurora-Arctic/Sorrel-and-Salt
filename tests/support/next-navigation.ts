import { vi } from 'vitest';

// The App Router's router for a component test: `useRouter` returns `router`, whose calls the setup file clears
// before each test. A factory that needs more of `next/navigation` spreads this module and adds the rest:
// `vi.mock('next/navigation', async () => ({ ...(await import('…/support/next-navigation')), usePathname: … }))`.

export const router = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
};

export const useRouter = () => router;
