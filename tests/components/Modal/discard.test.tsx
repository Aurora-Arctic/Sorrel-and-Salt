import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { type ReactElement, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The App Router as a component test sees it: each call a mock. Vitest hoists
// the mock above the imports.
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/here' }));

const { default: Modal, DiscardQuestion, useDiscardGuard } = await import('@/components/Modal');
const { NavigationProvider, usePendingNavigation } = await import('@/lib/navigation');

// useDiscardGuard's hold on leaving the page, through useLeaveGuard: a tab close or reload asks the browser's question wherever the form is, and an in-app navigation asks Discard or Keep Editing from a form on a page.
// In a modal the page behind is inert and the navigations that start there are the form's own, after a save or discard, so they go unheld (claude-docs/components/modal.md, "Unsaved changes"). On a page the question opens as its own dialog; in a modal it is drawn over the form.

/** A form with one field, guarded, drawing the question over itself while asking. */
function GuardedForm({ close = () => {} }: { close?: () => void }): ReactElement {
  const [name, setName] = useState('');
  const discard = useDiscardGuard(name !== '');
  return (
    <form className="form">
      <label>
        Name <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <button type="button" onClick={() => discard.request(close)}>
        Cancel
      </button>
      {discard.asking && <DiscardQuestion guard={discard} />}
    </form>
  );
}

/** A link elsewhere on the page. */
function Go(): ReactElement {
  const navigation = usePendingNavigation();
  return (
    <button type="button" onClick={() => navigation.navigate('/elsewhere')}>
      Go
    </button>
  );
}

const button = (name: string) => screen.getByRole('button', { name });
const asking = () => screen.queryByRole('button', { name: 'Discard Changes' });
const type = (value: string) =>
  fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value } });

/** A tab close or reload as the browser raises it: true when something cancelled it. */
function unload(): boolean {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('useDiscardGuard on a page', () => {
  function renderPage() {
    render(
      <NavigationProvider>
        <GuardedForm />
        <Go />
      </NavigationProvider>,
    );
  }

  it('lets a navigation go at once, and the tab close unasked, with nothing typed', () => {
    renderPage();
    expect(unload()).toBe(false);

    fireEvent.click(button('Go'));
    expect(asking()).toBeNull();
    expect(router.push).toHaveBeenCalledWith('/elsewhere');
  });

  const question = () => screen.queryByRole('dialog', { name: 'Discard Changes?' });

  it('asks in a dialog before a navigation leaves what was typed, and goes on Discard Changes', async () => {
    renderPage();
    type('Testwort');
    expect(unload()).toBe(true);

    fireEvent.click(button('Go'));
    const dialog = question();
    expect(dialog).toBeInTheDocument();
    // A dialog of its own, not a card in the form.
    expect(dialog!.closest('form')).toBeNull();
    await waitFor(() =>
      expect(within(dialog!).getByRole('button', { name: 'Keep Editing' })).toHaveFocus(),
    );
    expect(router.push).not.toHaveBeenCalled();

    fireEvent.click(within(dialog!).getByRole('button', { name: 'Keep Editing' }));
    expect(question()).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Testwort');
    expect(router.push).not.toHaveBeenCalled();

    // Escape is Keep Editing too.
    fireEvent.click(button('Go'));
    fireEvent(question()!, new Event('cancel', { cancelable: true }));
    expect(question()).toBeNull();
    expect(router.push).not.toHaveBeenCalled();

    fireEvent.click(button('Go'));
    act(() =>
      fireEvent.click(within(question()!).getByRole('button', { name: 'Discard Changes' })),
    );
    expect(router.push).toHaveBeenCalledWith('/elsewhere');
    expect(question()).toBeNull();
  });
});

describe('useDiscardGuard in a modal', () => {
  it('asks the browser to ask on a tab close, and leaves the form’s own navigations unheld', () => {
    let navigate: (href: string) => void = () => {};
    function Navigator() {
      const navigation = usePendingNavigation();
      navigate = navigation.navigate;
      return null;
    }
    render(
      <NavigationProvider>
        <Navigator />
        <Modal title="Edit" onClose={() => {}}>
          {(done) => <GuardedForm close={done} />}
        </Modal>
      </NavigationProvider>,
    );
    type('Testwort');
    expect(unload()).toBe(true);

    // As a form's page navigates on its save: nothing asks.
    act(() => navigate('/saved'));
    expect(asking()).toBeNull();
    expect(router.push).toHaveBeenCalledWith('/saved');
  });
});
