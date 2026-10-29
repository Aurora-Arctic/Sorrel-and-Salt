import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The App Router as a component test sees it: each call a mock. Vitest hoists
// the mock above the imports.
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/here' }));

const { NavigationProvider, useLeaveGuard, usePendingNavigation } =
  await import('@/lib/navigation');

// A form's unsaved changes, kept from leaving the page: the browser's own question on closing
// the tab or reloading, and the form's on an in-app navigation.

/** A tab close or reload as the browser raises it: true when something cancelled it. */
function unload(): boolean {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

/** A form with changes or none, guarded; `ask` is what it does when asked to let go. */
function Form({
  dirty,
  ask = () => {},
  onHide,
  holdNavigation,
}: {
  dirty: boolean;
  ask?: (proceed: () => void) => void;
  onHide?: () => void;
  holdNavigation?: boolean;
}) {
  useLeaveGuard(dirty, ask, { onHide, holdNavigation });
  return null;
}

/** A link: its button navigates to `href`. */
function Go({ href }: { href: string }) {
  const navigation = usePendingNavigation();
  return (
    <button type="button" onClick={() => navigation.navigate(href)}>
      Go
    </button>
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('useLeaveGuard on closing the tab or reloading', () => {
  it('asks the browser to ask only while the form has changes', () => {
    const { rerender } = render(<Form dirty={false} />);
    expect(unload()).toBe(false);

    rerender(<Form dirty />);
    expect(unload()).toBe(true);

    rerender(<Form dirty={false} />);
    expect(unload()).toBe(false);
  });

  it('stops asking once the form is gone', () => {
    const { unmount } = render(<Form dirty />);
    expect(unload()).toBe(true);
    unmount();
    expect(unload()).toBe(false);
  });

  it('calls onHide as the page is hidden, and not as it is shown', () => {
    const onHide = vi.fn();
    render(<Form dirty onHide={onHide} />);
    const visibility = vi.spyOn(document, 'visibilityState', 'get');

    visibility.mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(onHide).not.toHaveBeenCalled();

    visibility.mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(onHide).toHaveBeenCalledTimes(1);
    visibility.mockRestore();
  });
});

describe('useLeaveGuard on an in-app navigation', () => {
  it('holds the navigation while the form has changes, until it is told to go', () => {
    let proceed: (() => void) | undefined;
    const ask = vi.fn((go: () => void) => {
      proceed = go;
    });
    render(
      <NavigationProvider>
        <Form dirty ask={ask} />
        <Go href="/elsewhere" />
      </NavigationProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(ask).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();

    act(() => proceed?.());
    expect(router.push).toHaveBeenCalledWith('/elsewhere');
  });

  it('goes at once while the form has no changes', () => {
    const ask = vi.fn();
    render(
      <NavigationProvider>
        <Form dirty={false} ask={ask} />
        <Go href="/elsewhere" />
      </NavigationProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(ask).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith('/elsewhere');
  });

  it('goes at once once the form that had changes is gone', () => {
    const ask = vi.fn();
    function Page() {
      const [open, setOpen] = useState(true);
      return (
        <>
          {open && <Form dirty ask={ask} />}
          <button type="button" onClick={() => setOpen(false)}>
            Close
          </button>
          <Go href="/elsewhere" />
        </>
      );
    }
    render(
      <NavigationProvider>
        <Page />
      </NavigationProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(ask).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith('/elsewhere');
  });

  it('leaves navigation alone when told not to hold it', () => {
    const ask = vi.fn();
    render(
      <NavigationProvider>
        <Form dirty ask={ask} holdNavigation={false} />
        <Go href="/elsewhere" />
      </NavigationProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(ask).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith('/elsewhere');
    // The tab close is still guarded.
    expect(unload()).toBe(true);
  });
});
