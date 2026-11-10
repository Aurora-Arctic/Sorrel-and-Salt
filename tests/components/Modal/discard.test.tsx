import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { type ReactElement, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { router } from '../../support/next-navigation';

vi.mock('next/navigation', async () => ({
  ...(await import('../../support/next-navigation')),
  usePathname: () => '/here',
}));

const { default: Modal, DiscardQuestion, useDiscardGuard } = await import('@/components/Modal');
const { NavigationProvider, usePendingNavigation } = await import('@/lib/navigation');

// In a modal the page behind is inert and the navigations that start there are the form's own, after a save or discard, so they go unheld (claude-docs/components/modal.md, "Unsaved changes"). On a page the question opens as its own dialog; in a modal it is drawn over the form.

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
const typeName = (value: string) =>
  fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value } });

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
    typeName('Testwort');
    expect(unload()).toBe(true);

    fireEvent.click(button('Go'));
    const dialog = question();
    expect(dialog).toBeInTheDocument();
    expect(dialog!.closest('form')).toBeNull();
    await waitFor(() =>
      expect(within(dialog!).getByRole('button', { name: 'Keep Editing' })).toHaveFocus(),
    );
    expect(router.push).not.toHaveBeenCalled();

    fireEvent.click(within(dialog!).getByRole('button', { name: 'Keep Editing' }));
    expect(question()).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Testwort');
    expect(router.push).not.toHaveBeenCalled();

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
    typeName('Testwort');
    expect(unload()).toBe(true);

    // As a form's page navigates on its save: nothing asks.
    act(() => navigate('/saved'));
    expect(asking()).toBeNull();
    expect(router.push).toHaveBeenCalledWith('/saved');
  });
});
