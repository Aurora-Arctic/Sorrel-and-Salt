import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The root layout's slot for MB.53's banner: mounted only where impersonation
// is registered, and showing the banner only while the session is one.

const useSessionMock = vi.fn();
vi.mock('@/lib/auth-client', () => ({
  useSession: () => useSessionMock(),
  stopImpersonating: vi.fn(),
}));

// next/font is a build-time transform Vitest does not run.
vi.mock('@/app/fonts', () => ({ body: { variable: '' }, display: { variable: '' } }));

const { default: ImpersonationBannerSlot } = await import('@/app/impersonation-banner');

const session = (impersonatedBy: string | null) => ({
  data: {
    user: { id: 'u-bo', name: 'Bo Fixturewort', email: 'bo@users.test' },
    session: { id: 's-1', userId: 'u-bo', impersonatedBy },
  },
  isPending: false,
});

describe('the impersonation banner slot', () => {
  beforeEach(() => {
    useSessionMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('shows the banner while the session is an impersonation', () => {
    useSessionMock.mockReturnValue(session('u-admin'));
    render(<ImpersonationBannerSlot />);

    expect(screen.getByRole('complementary', { name: 'Impersonation' })).toHaveTextContent(
      'Bo Fixturewort',
    );
  });

  it('shows nothing on an ordinary session, signed out, or before the session is read', () => {
    for (const state of [
      session(null),
      { data: null, isPending: false },
      { data: null, isPending: true },
    ]) {
      useSessionMock.mockReturnValue(state);
      const { unmount } = render(<ImpersonationBannerSlot />);

      expect(
        screen.queryByRole('complementary', { name: 'Impersonation' }),
      ).not.toBeInTheDocument();
      unmount();
    }
  });
});

describe('the root layout', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  /** Whether `type` appears anywhere in the element tree under `node`. */
  function contains(node: unknown, type: unknown): boolean {
    if (!node || typeof node !== 'object') return false;
    if (Array.isArray(node)) return node.some((child) => contains(child, type));
    const element = node as { type?: unknown; props?: { children?: unknown } };
    return element.type === type || contains(element.props?.children, type);
  }

  // The layout renders <html>, which a test container cannot hold, so its
  // tree is searched for the slot rather than rendered.
  it.each([
    { flag: 'true', target: 'preview', mounted: true },
    { flag: 'true', target: '', mounted: true },
    { flag: 'true', target: 'production', mounted: false },
    { flag: '', target: 'preview', mounted: false },
  ])(
    'mounts the slot with the flag "$flag" at VERCEL_ENV="$target": $mounted',
    async ({ flag, target, mounted }) => {
      vi.stubEnv('ENABLE_IMPERSONATION', flag);
      vi.stubEnv('VERCEL_ENV', target);
      const { default: RootLayout } = await import('@/app/layout');

      expect(contains(RootLayout({ children: null }), ImpersonationBannerSlot)).toBe(mounted);
    },
  );
});
