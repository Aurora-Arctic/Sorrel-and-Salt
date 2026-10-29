import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ImpersonationBanner from '@/components/ImpersonationBanner';
import { stubLocationAssign } from '../../support/location';

// The way out of an impersonation: every page, `/admin` included, says whose session this is
// and carries Stop (claude-docs/components/impersonation-banner.md).

// Mocked wholesale: a real call would reach /api/auth, and its success
// navigates, which happy-dom cannot follow.
const stopImpersonatingMock = vi.fn();
vi.mock('@/lib/auth-client', () => ({
  stopImpersonating: (...args: unknown[]) => stopImpersonatingMock(...args),
}));
const assignMock = vi.fn();

const STOP_FAILED = "Impersonation didn't stop. Please try again, or sign out to end it.";

// Each press awaited inside act: the refusal lands in a promise, and the
// callout is placed in another (claude-docs/components/click-feedback.md).
const press = (element: Element) =>
  act(async () => {
    fireEvent.click(element);
  });

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
    stubLocationAssign(assignMock);
    render(<ImpersonationBanner {...BO} />);

    fireEvent.click(screen.getByRole('button', { name: 'Stop Impersonating' }));

    await waitFor(() => expect(assignMock).toHaveBeenCalledWith('/admin/users'));
    expect(stopImpersonatingMock).toHaveBeenCalledTimes(1);
  });

  it('is busy while pending, keeping its place in the tab order, and sends once', async () => {
    // Never answers, so the request stays in flight.
    stopImpersonatingMock.mockReturnValue(new Promise(() => {}));
    render(<ImpersonationBanner {...BO} />);
    const stop = screen.getByRole('button', { name: 'Stop Impersonating' });

    fireEvent.click(stop);

    await waitFor(() => expect(stop).toHaveAttribute('aria-busy', 'true'));
    // `aria-disabled`, not `disabled`, which would drop the focus it holds.
    expect(stop).toHaveAttribute('aria-disabled', 'true');
    expect(stop).toBeEnabled();
    fireEvent.click(stop);
    expect(stopImpersonatingMock).toHaveBeenCalledTimes(1);
  });

  it('says so in an alert under Stop when stopping fails, keeps the focus and the banner', async () => {
    stopImpersonatingMock.mockResolvedValue({ data: null, error: { status: 500 } });
    stubLocationAssign(assignMock);
    render(<ImpersonationBanner {...BO} />);
    const stop = screen.getByRole('button', { name: 'Stop Impersonating' });

    stop.focus();
    await press(stop);

    expect(await screen.findByRole('alert')).toHaveTextContent(STOP_FAILED);
    expect(stop).toHaveFocus();
    expect(stop).not.toHaveAttribute('aria-disabled');
    expect(stop).toHaveAccessibleDescription(new RegExp(STOP_FAILED));
    expect(assignMock).not.toHaveBeenCalled();
  });

  it('says the same when the endpoint cannot be reached', async () => {
    stopImpersonatingMock.mockRejectedValue(new Error('offline'));
    render(<ImpersonationBanner {...BO} />);
    const stop = screen.getByRole('button', { name: 'Stop Impersonating' });
    stop.focus();

    await press(stop);

    expect(await screen.findByRole('alert')).toHaveTextContent(STOP_FAILED);
    expect(stop).toHaveFocus();
    expect(stop).not.toHaveAttribute('aria-disabled');
  });

  it('clears a failure at the next press', async () => {
    stopImpersonatingMock.mockResolvedValueOnce({ data: null, error: { status: 500 } });
    stopImpersonatingMock.mockReturnValueOnce(new Promise(() => {}));
    render(<ImpersonationBanner {...BO} />);
    const stop = screen.getByRole('button', { name: 'Stop Impersonating' });
    stop.focus();
    await press(stop);
    expect(await screen.findByRole('alert')).toBeVisible();

    await press(stop);

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Show the error/ })).toBeNull();
    expect(stopImpersonatingMock).toHaveBeenCalledTimes(2);
  });
});
