import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Modal from '@/components/Modal';

// A dialog over the page, on the native element's modal mode, which brings
// the focus trap, Escape and the inert page (claude-docs/components/modal.md).
// jsdom implements neither `showModal` nor `close`, so both are stood in for
// here as a browser behaves: the element gains and loses `open`.

const showModal = vi.fn(function (this: HTMLDialogElement) {
  this.setAttribute('open', '');
});
const close = vi.fn(function (this: HTMLDialogElement) {
  this.removeAttribute('open');
});

beforeEach(() => {
  showModal.mockClear();
  close.mockClear();
  HTMLDialogElement.prototype.showModal = showModal;
  HTMLDialogElement.prototype.close = close;
});

function renderModal(onClose = vi.fn()) {
  render(
    <Modal title="Edit Category" onClose={onClose}>
      <label>
        Name <input />
      </label>
    </Modal>,
  );
  return onClose;
}

describe('Modal', () => {
  it('opens modally on mount, named by its title', () => {
    renderModal();

    const dialog = screen.getByRole('dialog', { name: 'Edit Category' });
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(dialog).toHaveAttribute('open');
    expect(screen.getByRole('heading', { name: 'Edit Category' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
  });

  it('asks its owner to close it from the Close button', () => {
    const onClose = renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // The owner decides: a URL-driven modal closes by navigating, and the
  // element closing itself first would leave the address saying it is open.
  it('turns Escape into a request to its owner rather than closing itself', () => {
    const onClose = renderModal();
    const dialog = screen.getByRole('dialog', { name: 'Edit Category' });

    const cancel = new Event('cancel', { cancelable: true });
    fireEvent(dialog, cancel);

    expect(cancel.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(dialog).toHaveAttribute('open');
  });

  it('closes the element when it unmounts', () => {
    const { unmount } = render(
      <Modal title="Add Category" onClose={vi.fn()}>
        <p>Body</p>
      </Modal>,
    );

    unmount();

    expect(close).toHaveBeenCalledTimes(1);
  });
});
