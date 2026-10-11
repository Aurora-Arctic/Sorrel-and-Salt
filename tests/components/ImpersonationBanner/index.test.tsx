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
    expect(banner).toHaveTextContent(BO.name);
    expect(banner).toHaveTextContent(BO.email);
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

    expect(await screen.findByRole('alert')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Stop Impersonating' })).toBeEnabled();
    expect(assignMock).not.toHaveBeenCalled();
  });
});
