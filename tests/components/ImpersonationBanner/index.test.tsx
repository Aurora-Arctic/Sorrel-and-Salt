import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ImpersonationBanner from '@/components/ImpersonationBanner';

// MB.53's way out: every page, `/admin` included, says whose session this is
// and carries Stop (claude-docs/components/impersonation-banner.md).

// Mocked wholesale: a real call would reach /api/auth, and its success
// navigates, which jsdom cannot follow.
const stopImpersonatingMock = vi.fn();
vi.mock('@/lib/auth-client', () => ({
  stopImpersonating: (...args: unknown[]) => stopImpersonatingMock(...args),
}));
const assignMock = vi.fn();

const BO = { name: 'Bo Fixturewort', email: 'bo@users.test' };

describe('ImpersonationBanner', () => {
  afterEach(() => {
    stopImpersonatingMock.mockReset();
    assignMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('names the user impersonated, by name and address', () => {
    render(<ImpersonationBanner {...BO} />);

    const banner = screen.getByRole('complementary', { name: 'Impersonation' });
    expect(banner).toHaveTextContent('You are impersonating Bo Fixturewort (bo@users.test).');
    expect(screen.getByRole('button', { name: 'Stop Impersonating' })).toBeEnabled();
  });

  it('stops, and returns the admin to the user list', async () => {
    stopImpersonatingMock.mockResolvedValue({ data: {}, error: null });
    vi.stubGlobal('location', { ...window.location, assign: assignMock });
    render(<ImpersonationBanner {...BO} />);

    fireEvent.click(screen.getByRole('button', { name: 'Stop Impersonating' }));

    await waitFor(() => expect(assignMock).toHaveBeenCalledWith('/admin/users'));
    expect(stopImpersonatingMock).toHaveBeenCalledTimes(1);
  });

  it('says so when stopping fails, and stays', async () => {
    stopImpersonatingMock.mockResolvedValue({ data: null, error: { status: 500 } });
    vi.stubGlobal('location', { ...window.location, assign: assignMock });
    render(<ImpersonationBanner {...BO} />);

    fireEvent.click(screen.getByRole('button', { name: 'Stop Impersonating' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Impersonation could not be stopped. Signing out ends it too.',
    );
    expect(screen.getByRole('button', { name: 'Stop Impersonating' })).toBeEnabled();
    expect(assignMock).not.toHaveBeenCalled();
  });
});

// On a touch screen the banner is in the page's flow at the top, and its height
// is the top inset everything else offsets by (claude-docs/styling.md, "The top
// inset"). The CSS decides where it counts; the component only publishes it.
describe('ImpersonationBanner height', () => {
  const PROPERTY = '--impersonation-banner-height';

  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.style.removeProperty(PROPERTY);
  });

  it('publishes its height on the root while mounted, and withdraws it after', () => {
    let resized: (() => void) | undefined;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resized = callback;
        }
        observe() {
          resized?.();
        }
        disconnect() {}
      },
    );
    const height = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(101);

    const { unmount } = render(<ImpersonationBanner {...BO} />);
    expect(document.documentElement.style.getPropertyValue(PROPERTY)).toBe('101px');

    height.mockReturnValue(77);
    resized?.();
    expect(document.documentElement.style.getPropertyValue(PROPERTY)).toBe('77px');

    unmount();
    expect(document.documentElement.style.getPropertyValue(PROPERTY)).toBe('');
    height.mockRestore();
  });
});
