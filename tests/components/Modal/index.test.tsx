import { act, fireEvent, render, screen } from '@testing-library/react';
import { type ReactElement, useState } from 'react';
import { createPortal } from 'react-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Modal, { DiscardQuestion, useDiscardGuard, useModalHeaderSlot } from '@/components/Modal';

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

  // An edit dialog (MB.115): the eyebrow says what it does to what kind, the
  // title which entry, and a screen reader hears both, the qualifier too.
  it('is named by its eyebrow, then its title and qualifier', () => {
    render(
      <Modal
        eyebrow="Edit Ingredient"
        title="Testwort"
        qualifier="Fixtura testalis"
        onClose={vi.fn()}
      >
        <p>Body</p>
      </Modal>,
    );

    expect(
      screen.getByRole('dialog', { name: 'Edit Ingredient, Testwort, Fixtura testalis' }),
    ).toBeInTheDocument();
  });

  // showModal() alone would put the focus on Close, the first thing it can
  // take in the dialog; the person opened the dialog to fill it in.
  it('puts the focus on its first field as it opens, past a hidden and a disabled one', () => {
    render(
      <Modal title="Add Category" onClose={vi.fn()}>
        <input type="hidden" name="id" />
        <select aria-label="Kind" disabled />
        <div hidden>
          <label>
            Folded <input />
          </label>
        </div>
        <label>
          Name <input />
        </label>
        <label>
          Description <textarea />
        </label>
      </Modal>,
    );

    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
  });

  it('takes the focus itself as it opens when it holds no field', () => {
    render(
      <Modal title="Revoke Admin" onClose={vi.fn()}>
        <button type="button">Revoke</button>
      </Modal>,
    );

    expect(screen.getByRole('dialog', { name: 'Revoke Admin' })).toHaveFocus();
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
  // unmount would take it away at once. The dom project draws no transition, so its end
  // is fired here, and `matchMedia` is stood in for: the setup reports reduced motion.
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

  // The guard over a form's unsaved changes (MB.115, the owner's call): every
  // way out asks first while the form has changes. Its shape is asserted
  // here, on a form of the test's own; each admin form's test asserts only
  // its wiring.
  describe('guarding unsaved changes', () => {
    /**
     * A form as the admin forms are: a field, a save that closes, and Cancel,
     * and the question drawn over it while asking (MB.115), its buttons
     * still beneath.
     */
    function GuardedForm({ close }: { close: () => void }): ReactElement {
      const [name, setName] = useState('');
      const [note, setNote] = useState('');
      const discard = useDiscardGuard(name !== '' || note !== '');
      return (
        <form className="form">
          <label>
            Name <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            Note <input value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          <div className="modal__actions">
            <button type="button" onClick={close}>
              Save
            </button>
            <button type="button" onClick={() => discard.request(close)}>
              Cancel
            </button>
          </div>
          {discard.asking && <DiscardQuestion guard={discard} />}
        </form>
      );
    }

    function renderGuarded() {
      const onClose = vi.fn();
      render(
        <Modal title="Edit Category" onClose={onClose}>
          {(done) => <GuardedForm close={done} />}
        </Modal>,
      );
      return onClose;
    }

    const field = (name: string) => screen.getByRole('textbox', { name });
    const button = (name: string) => screen.getByRole('button', { name });
    const asking = () => screen.queryByRole('button', { name: 'Discard Changes' });
    const escape = () =>
      fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    const change = (name: string, value: string) => {
      field(name).focus();
      fireEvent.change(field(name), { target: { value } });
    };

    it('closes at once on Cancel, the Close button and Escape when nothing has changed', () => {
      const onClose = renderGuarded();

      fireEvent.click(button('Cancel'));
      fireEvent.click(button('Close'));
      escape();

      expect(asking()).not.toBeInTheDocument();
      // Once, however many ways: the modal is already closing.
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('asks on Cancel with a change, the dialog open and the focus on Keep Editing', () => {
      const onClose = renderGuarded();
      change('Name', 'Testwort');

      fireEvent.click(button('Cancel'));

      expect(asking()).toBeInTheDocument();
      expect(button('Keep Editing')).toHaveFocus();
      expect(screen.getByRole('dialog')).toHaveAttribute('open');
      expect(onClose).not.toHaveBeenCalled();
    });

    // The owner's call during MB.115: the question is drawn over the form,
    // which can be neither pressed nor typed into until it is answered. The
    // modal's own Close stays live, so a try there flashes the question.
    it('makes the form behind the question inert while asking, and live again once answered', () => {
      renderGuarded();
      change('Name', 'Testwort');
      // Live before it asks, so the inert below is the question's doing.
      expect(field('Name').closest('[inert]')).toBeNull();

      fireEvent.click(button('Cancel'));

      expect(field('Name').closest('[inert]')).not.toBeNull();
      expect(button('Cancel').closest('[inert]')).not.toBeNull();
      // The question, a group of its own, and the modal's Close are not.
      const question = screen.getByRole('group');
      expect(question).toContainElement(button('Keep Editing'));
      expect(question.closest('[inert]')).toBeNull();
      expect(button('Close').closest('[inert]')).toBeNull();

      fireEvent.click(button('Keep Editing'));

      expect(screen.queryByRole('group')).not.toBeInTheDocument();
      expect(field('Name').closest('[inert]')).toBeNull();
      expect(button('Cancel').closest('[inert]')).toBeNull();
    });

    // A control the form put beside the title is the form's too: held while asking.
    it('makes a control beside the title inert while asking', () => {
      function WithHeaderControl({ close }: { close: () => void }): ReactElement {
        const slot = useModalHeaderSlot();
        return (
          <>
            {slot && createPortal(<button type="button">Open All</button>, slot)}
            <GuardedForm close={close} />
          </>
        );
      }
      render(
        <Modal title="Edit Category" onClose={vi.fn()}>
          {(done) => <WithHeaderControl close={done} />}
        </Modal>,
      );
      change('Name', 'Testwort');
      expect(button('Open All').closest('[inert]')).toBeNull();

      fireEvent.click(button('Cancel'));

      expect(button('Open All').closest('[inert]')).not.toBeNull();
      fireEvent.click(button('Keep Editing'));
      expect(button('Open All').closest('[inert]')).toBeNull();
    });

    it.each([
      ['the Close button', () => fireEvent.click(button('Close'))],
      ['Escape', escape],
      [
        'a click outside',
        () => {
          const at = { clientX: 20, clientY: 150 };
          fireEvent.mouseDown(screen.getByRole('dialog'), at);
          fireEvent.click(screen.getByRole('dialog'), at);
        },
      ],
    ])('asks on %s with a change, as Cancel does', (_, leave) => {
      const onClose = renderGuarded();
      change('Name', 'Testwort');

      leave();

      expect(asking()).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
    });

    // The owner's call during MB.115: a way out tried again flashes the
    // question, so the person sees why nothing closed, and each try does.
    it('flashes the question for a way out tried again while asking, the focus back on Keep Editing', () => {
      const onClose = renderGuarded();
      change('Name', 'Testwort');
      fireEvent.click(button('Cancel'));
      // The question's count of tries, 0 until one.
      const flashes = () =>
        button('Keep Editing').closest('[data-flash]')?.getAttribute('data-flash');
      expect(flashes()).toBe('0');
      expect(screen.getByRole('status')).toBeEmptyDOMElement();

      field('Name').focus();
      fireEvent.click(button('Close'));
      const first = flashes();
      expect(first).not.toBe('0');
      expect(button('Keep Editing')).toHaveFocus();
      expect(screen.getByRole('status')).not.toBeEmptyDOMElement();

      field('Name').focus();
      escape();
      expect(flashes()).not.toBe(first);
      expect(button('Keep Editing')).toHaveFocus();
      expect(asking()).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('goes back to the form on Keep Editing, the change kept and the focus where it was', () => {
      const onClose = renderGuarded();
      change('Note', 'Kept');

      escape();
      fireEvent.click(button('Keep Editing'));

      expect(asking()).not.toBeInTheDocument();
      expect(field('Note')).toHaveValue('Kept');
      expect(field('Note')).toHaveFocus();
      expect(onClose).not.toHaveBeenCalled();
    });

    // Cancel, the button pressed, stays beneath the question: back to it.
    it('focuses Cancel again on Keep Editing after Cancel', () => {
      renderGuarded();
      change('Note', 'Kept');
      button('Cancel').focus();

      fireEvent.click(button('Cancel'));
      expect(button('Keep Editing')).toHaveFocus();
      fireEvent.click(button('Keep Editing'));

      expect(button('Cancel')).toHaveFocus();
    });

    it.each([
      ['Cancel', () => fireEvent.click(button('Cancel'))],
      ['Escape', escape],
    ])('closes on Discard Changes after %s', (_, leave) => {
      const onClose = renderGuarded();
      change('Name', 'Testwort');
      leave();

      fireEvent.click(button('Discard Changes'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closes without asking for a save, changes and all', () => {
      const onClose = renderGuarded();
      change('Name', 'Testwort');

      fireEvent.click(button('Save'));

      expect(asking()).not.toBeInTheDocument();
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
