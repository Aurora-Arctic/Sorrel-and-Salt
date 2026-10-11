import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

  // The owner's call during M5.5: a click outside closes it, as Escape does.
  // The backdrop is the dialog's own box to an event, so outside is told by
  // the point; jsdom lays nothing out, so every point is outside the box and
  // what is tested is where the press began and ended. Its own padding is
  // inside the box, which only a real layout shows (tests/e2e/admin-compendium.spec.ts).
  it('asks its owner to close it for a press and release on the backdrop, and for nothing else', () => {
    const onClose = renderModal();
    const dialog = screen.getByRole('dialog', { name: 'Edit Category' });
    const field = screen.getByRole('textbox', { name: 'Name' });
    const at = { clientX: 20, clientY: 150 };

    // A press inside released outside: a selection dragged out of a field.
    fireEvent.mouseDown(field, at);
    fireEvent.click(dialog, at);
    // A click on its contents.
    fireEvent.mouseDown(field, at);
    fireEvent.click(field, at);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.mouseDown(dialog, at);
    fireEvent.click(dialog, at);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // The owner's call during M5.5: it fades in and out. In is CSS alone. Out
  // is the modal's: it fades, then asks its owner to close, since the owner's
  // unmount would take it away at once. jsdom draws no transition, so its end
  // is fired here, and `matchMedia` is stood in for: jsdom has none.
  describe('fading out', () => {
    const motion = (reduced: boolean) =>
      vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({ matches: reduced && query.includes('reduce') })),
      );
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    });

    it('fades before asking its owner to close it, and asks once however many ways it was asked', () => {
      motion(false);
      const onClose = renderModal();
      const dialog = screen.getByRole('dialog', { name: 'Edit Category' });

      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      fireEvent(dialog, new Event('cancel', { cancelable: true }));

      expect(onClose).not.toHaveBeenCalled();
      fireEvent.transitionEnd(dialog);
      fireEvent.transitionEnd(dialog);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closes all the same if the fade never reports its end', () => {
      vi.useFakeTimers();
      motion(false);
      const onClose = renderModal();

      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      act(() => vi.advanceTimersByTime(1000));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closes at once under reduced motion', () => {
      motion(true);
      const onClose = renderModal();

      fireEvent.click(screen.getByRole('button', { name: 'Close' }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    // A save or a delete closes it from inside: the content is handed the
    // modal's own close, so that fades too.
    it('hands its contents a close that fades as well', () => {
      motion(false);
      const onClose = vi.fn();
      render(
        <Modal title="Edit Category" onClose={onClose}>
          {(close) => (
            <button type="button" onClick={close}>
              Save Category
            </button>
          )}
        </Modal>,
      );
      const dialog = screen.getByRole('dialog', { name: 'Edit Category' });

      fireEvent.click(screen.getByRole('button', { name: 'Save Category' }));

      expect(onClose).not.toHaveBeenCalled();
      fireEvent.transitionEnd(dialog);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
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
