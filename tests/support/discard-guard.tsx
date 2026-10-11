import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { expect, type Mock, vi } from 'vitest';
import Modal from '@/components/Modal';
import { makeQueryClient } from '@/lib/graphql-client';

// The guard over an admin form's unsaved changes (MB.115): its shape is
// tests/components/Modal's, on a form of that test's own; each admin form's
// test asserts its wiring through this, the form in a modal as its page puts
// it, its close the modal's own (claude-docs/components/modal.md, "Unsaved
// changes").

/**
 * Renders the form in a modal, handed the modal's own close as its page's
 * dialog hands it; answers the modal's `onClose`, which every way out ends at.
 */
export function renderInModal(form: (done: () => void) => ReactNode): Mock {
  // jsdom implements no modal dialog; stood in for as a browser behaves.
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <Modal title="Edit" onClose={onClose}>
        {form}
      </Modal>
    </QueryClientProvider>,
  );
  return onClose;
}

const button = (name: string) => screen.getByRole('button', { name });
const asking = () => screen.queryByRole('button', { name: 'Discard Changes' });

/**
 * After `change`, the form's Cancel and the modal's Escape each ask rather
 * than close, and Discard Changes closes.
 */
export function expectGuardedWaysOut(onClose: Mock, change: () => void): void {
  change();

  fireEvent.click(button('Cancel'));
  expect(asking()).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();

  fireEvent.click(button('Keep Editing'));
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
  expect(asking()).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();

  fireEvent.click(button('Discard Changes'));
  expect(onClose).toHaveBeenCalledTimes(1);
}
