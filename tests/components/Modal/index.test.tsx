import { act, fireEvent, render, screen } from '@testing-library/react';
import { type ReactElement, StrictMode, useState } from 'react';
import { createPortal } from 'react-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Modal, { DiscardQuestion, useDiscardGuard, useModalHeaderSlot } from '@/components/Modal';

// A dialog over the page on the native element's modal mode, which brings the focus trap, Escape and the inert page (claude-docs/components/modal.md).
// happy-dom's `showModal` and `close` only set and clear `open`, with no focus trap, so both are replaced by spies that do the same and can be asserted on.

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

// The focus goes in a microtask after the dialog opens.
const settle = () => act(async () => {});

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
  // In development React mounts, unmounts and mounts again. A real dialog blurs what it holds when it closes, so a field focused by the first mount was left,
  // and a form read that as touched: its required error showed on a direct load of a route modal. The focus goes in once, after both.
  it('leaves the first field focused and never blurred through a Strict Mode remount', async () => {
    close.mockImplementationOnce(function (this: HTMLDialogElement) {
      this.removeAttribute('open');
      (document.activeElement as HTMLElement | null)?.blur();
    });
    const blurred = vi.fn();
    render(
      <StrictMode>
        <Modal title="Edit Category" onClose={vi.fn()}>
          <label>
            Name <input onBlur={blurred} />
          </label>
        </Modal>
      </StrictMode>,
    );

    await settle();
    expect(blurred).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
  });

  it('opens modally on mount, named by its title', () => {
    renderModal();

    const dialog = screen.getByRole('dialog', { name: 'Edit Category' });
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(dialog).toHaveAttribute('open');
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
  });

  // An edit dialog: the eyebrow says what it does to what kind, the
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

  // An add dialog: where it lands over what it does, and a screen
  // reader hears the action first, then the destination.
  it('is named by its title, then "to" its destination', () => {
    render(
      <Modal destination="Fixture Coven" title="Add Ingredient" onClose={vi.fn()}>
        <p>Body</p>
      </Modal>,
    );

    expect(
      screen.getByRole('dialog', { name: 'Add Ingredient to Fixture Coven' }),
    ).toBeInTheDocument();
  });

  // showModal() alone would put the focus on Close, the first thing it can
  // take in the dialog; the person opened the dialog to fill it in.
  it('puts the focus on its first field as it opens, past a hidden and a disabled one', async () => {
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

    await settle();
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
  });

  it('takes the focus itself as it opens when it holds no field', async () => {
    render(
      <Modal title="Revoke Admin" onClose={vi.fn()}>
        <button type="button">Revoke</button>
      </Modal>,
    );

    await settle();
    expect(screen.getByRole('dialog', { name: 'Revoke Admin' })).toHaveFocus();
  });

  // axe's scrollable-region-focusable: a body with no field must be reachable
  // by Tab, or a keyboard cannot scroll it. A form's body is reached by its fields.
  it("gives a body only to read a Tab stop of its own, and a form's body none", async () => {
    const { unmount } = render(
      <Modal title="Testwort" onClose={vi.fn()} readingBody>
        <p>Fixture reading.</p>
      </Modal>,
    );
    await settle();
    const reading = screen.getByText('Fixture reading.').parentElement!;
    expect(reading.tabIndex).toBe(0);
    // The dialog still takes the focus as it opens, not the body.
    expect(screen.getByRole('dialog', { name: 'Testwort' })).toHaveFocus();
    unmount();

    renderModal();
    expect(
      screen.getByRole('textbox', { name: 'Name' }).closest('[tabindex]:not(dialog)'),
    ).toBeNull();
  });

  it('closes from the Close button on its top line, with the top line empty or full', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Modal title="Edit Category" topEnd={<></>} onClose={onClose}>
        <input aria-label="Name" />
      </Modal>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <Modal title="Edit Category" topEnd={<output>Marked</output>} onClose={onClose}>
        <input aria-label="Name" />
      </Modal>,
    );
    const mark = screen.getByText('Marked');
    const close = screen.getByRole('button', { name: 'Close' });
    // The marks first, as on screen, and neither is in the dialog's name.
    expect(mark.compareDocumentPosition(close) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('dialog', { name: 'Edit Category' })).toBeInTheDocument();
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

  // A click outside closes it, as Escape does. The backdrop is the dialog's own box to an event, so outside is told by the point;
  // happy-dom lays nothing out, so every point is outside the box and what is tested is where the press began and ended. The dialog's own padding is inside the box, which only a real layout shows (tests/e2e/admin-compendium.spec.ts).
  // A confirmation opened from inside a dialog (the Annotate dialog) is a second Modal in the first's contents. React carries the inner dialog's cancel up its tree to the outer dialog's handler, so Escape closed both.
  it("closes only the innermost of two nested dialogs on Escape, leaving the outer's owner unasked", () => {
    const outer = vi.fn();
    const inner = vi.fn();
    render(
      <Modal title="Annotate This Entry" onClose={outer}>
        <Modal title="Remove from Cupboard" onClose={inner}>
          <p>Remove it?</p>
        </Modal>
      </Modal>,
    );
    const asked = screen.getByRole('dialog', { name: 'Remove from Cupboard' });
    expect(asked).toHaveAttribute('open');

    fireEvent(asked, new Event('cancel', { cancelable: true }));

    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();
  });

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

  // The focus goes back to what opened the dialog, however it closes, unless
  // that is gone: then to the place the caller names (claude-docs/components/modal.md,
  // "Giving the focus back").
  describe('giving the focus back', () => {
    /** A page with an opener button and the modal its state opens. */
    function Page({ returnTo }: { returnTo?: () => HTMLElement | null }): ReactElement {
      const [open, setOpen] = useState(false);
      const [opener, setOpener] = useState(true);
      return (
        <>
          {opener && (
            <button type="button" onClick={() => setOpen(true)}>
              Open
            </button>
          )}
          <button type="button">Elsewhere</button>
          {open && (
            <Modal title="Edit Category" onClose={() => setOpen(false)} returnTo={returnTo}>
              {(done) => (
                <>
                  <label>
                    Name <input />
                  </label>
                  <button type="button" onClick={() => setOpener(false)}>
                    Drop Opener
                  </button>
                  <button type="button" onClick={done}>
                    Cancel
                  </button>
                </>
              )}
            </Modal>
          )}
        </>
      );
    }
    const button = (name: string) => screen.getByRole('button', { name });
    const openFrom = async (name = 'Open') => {
      button(name).focus();
      fireEvent.click(button(name));
      await settle();
      expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
    };

    it('gives the focus back to its opener on Escape', async () => {
      render(<Page />);
      await openFrom();

      fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));

      expect(screen.queryByRole('dialog')).toBeNull();
      expect(button('Open')).toHaveFocus();
    });

    it('gives the focus back to its opener on Cancel', async () => {
      render(<Page />);
      await openFrom();

      fireEvent.click(button('Cancel'));

      expect(screen.queryByRole('dialog')).toBeNull();
      expect(button('Open')).toHaveFocus();
    });

    // A modal opened by its address is shut by the address changing, the
    // owner unmounting it with no close of its own.
    it('gives the focus back to its opener when its owner unmounts it', async () => {
      function Owned({ open }: { open: boolean }): ReactElement {
        return (
          <>
            <button type="button">Open</button>
            {open && (
              <Modal title="Edit Category" onClose={vi.fn()}>
                <label>
                  Name <input />
                </label>
              </Modal>
            )}
          </>
        );
      }
      const view = render(<Owned open={false} />);
      button('Open').focus();
      view.rerender(<Owned open />);
      await settle();
      expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();

      view.rerender(<Owned open={false} />);

      expect(button('Open')).toHaveFocus();
    });

    it('gives the focus to where its owner says once its opener is gone', async () => {
      render(<Page returnTo={() => button('Elsewhere')} />);
      await openFrom();

      fireEvent.click(button('Drop Opener'));
      fireEvent.click(button('Cancel'));

      expect(screen.queryByRole('button', { name: 'Open' })).toBeNull();
      expect(button('Elsewhere')).toHaveFocus();
    });

    // A click on a button in WebKit leaves the focus on the page, so nothing opened it.
    it('gives the focus to where its owner says when nothing held the focus as it opened', async () => {
      render(<Page returnTo={() => button('Elsewhere')} />);
      fireEvent.click(button('Open'));
      await settle();

      fireEvent.click(button('Cancel'));

      expect(button('Elsewhere')).toHaveFocus();
    });

    // A row's own control removes the row: the opener goes with the modal, and
    // the place to return to with them, so the page's heading takes the focus
    // rather than the page losing it.
    it("gives the focus to the page's heading when its opener goes with it and its owner names nowhere", async () => {
      function Row(): ReactElement {
        const [open, setOpen] = useState(false);
        return (
          <li>
            <button type="button" onClick={() => setOpen(true)}>
              Remove Testwort
            </button>
            {open && (
              <Modal title="Remove Testwort" onClose={vi.fn()} returnTo={() => null}>
                <button type="button">Remove</button>
              </Modal>
            )}
          </li>
        );
      }
      function List({ present }: { present: boolean }): ReactElement {
        return (
          <main>
            <h1>Members</h1>
            <ul>{present && <Row />}</ul>
          </main>
        );
      }
      const view = render(<List present />);
      button('Remove Testwort').focus();
      fireEvent.click(button('Remove Testwort'));
      await settle();
      expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement);

      view.rerender(<List present={false} />);

      const heading = screen.getByRole('heading', { level: 1, name: 'Members' });
      expect(heading).toHaveFocus();
      // Focusable by script alone, so Tab never stops on it.
      expect(heading).toHaveAttribute('tabindex', '-1');
    });

    it('gives the focus back to its opener through a Strict Mode remount', async () => {
      render(
        <StrictMode>
          <Page returnTo={() => button('Elsewhere')} />
        </StrictMode>,
      );
      await openFrom();

      fireEvent.click(button('Cancel'));

      expect(button('Open')).toHaveFocus();
    });
  });

  // It fades in and out: in is CSS alone, out is the modal's, which fades and then asks its owner to close, since the owner's unmount would take it away at once.
  // The dom project draws no transition, so its end is fired here, and `matchMedia` is stood in for because the setup reports reduced motion.
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

  // A link in one modal's foot opening another (Quick Look's Edit Spell) takes
  // the one away and puts the other in its place: the other is marked, and its
  // backdrop starts dimmed (index.scss), so the page does not show between them.
  describe('one in place of another', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    function Swap({ second }: { second: boolean }): ReactElement {
      return second ? (
        <Modal key="edit" title="Edit Spell" onClose={vi.fn()}>
          <p>Builder</p>
        </Modal>
      ) : (
        <Modal key="look" title="Quick Look" onClose={vi.fn()}>
          <p>Recipe</p>
        </Modal>
      );
    }

    it('marks a modal opened as an open one goes', () => {
      // Long past any unmount an earlier test left behind, and still while the swap runs.
      vi.spyOn(performance, 'now').mockReturnValue(1e12);
      const { rerender } = render(<Swap second={false} />);
      expect(screen.getByRole('dialog', { name: 'Quick Look' })).not.toHaveAttribute(
        'data-handover',
      );

      rerender(<Swap second />);

      expect(screen.getByRole('dialog', { name: 'Edit Spell' })).toHaveAttribute('data-handover');
    });

    it('does not mark one opened after the last closed itself', () => {
      vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches: true })),
      );
      function Closer(): ReactElement {
        const [second, setSecond] = useState(false);
        return second ? (
          <Modal key="edit" title="Edit Spell" onClose={vi.fn()}>
            <p>Builder</p>
          </Modal>
        ) : (
          <Modal key="look" title="Quick Look" onClose={() => setSecond(true)}>
            <p>Recipe</p>
          </Modal>
        );
      }
      // Long past any unmount an earlier test left behind.
      vi.spyOn(performance, 'now').mockReturnValue(1e12);
      render(<Closer />);

      fireEvent.click(screen.getByRole('button', { name: 'Close' }));

      expect(screen.getByRole('dialog', { name: 'Edit Spell' })).not.toHaveAttribute(
        'data-handover',
      );
      vi.unstubAllGlobals();
    });
  });

  // The guard over a form's unsaved changes: every way out asks first while the form has changes.
  // Its shape is asserted here on a form of the test's own; each admin form's test asserts only its wiring.
  describe('guarding unsaved changes', () => {
    /** A form as the admin forms are: a field, a save that closes, and Cancel, with the question drawn over it while asking and its buttons still beneath. */
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

    // The question is drawn over the form,
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

    it('keeps a foot outside the body that scrolls, and makes it inert while asking', () => {
      render(
        <Modal
          title="Edit Category"
          onClose={vi.fn()}
          foot={
            <button type="button" onClick={() => undefined}>
              Open Page
            </button>
          }
        >
          {(done) => <GuardedForm close={done} />}
        </Modal>,
      );
      // Why it could be inside: it is passed beside the children, which the body wraps.
      const foot = button('Open Page');
      expect(foot.closest('.modal-dialog__body')).toBeNull();
      expect(field('Name').closest('.modal-dialog__body')).not.toBeNull();
      change('Name', 'Testwort');
      expect(foot.closest('[inert]')).toBeNull();

      fireEvent.click(button('Cancel'));

      expect(foot.closest('[inert]')).not.toBeNull();
      fireEvent.click(button('Keep Editing'));
      expect(foot.closest('[inert]')).toBeNull();
    });

    // The least destructive answer takes the focus however the question was
    // reached, each from where a real press leaves it (APG, alertdialog).
    it.each([
      [
        'the Close button',
        () => {
          button('Close').focus();
          fireEvent.click(button('Close'));
        },
      ],
      [
        'Escape in a field',
        () => {
          field('Name').focus();
          escape();
        },
      ],
      [
        'Cancel',
        () => {
          button('Cancel').focus();
          fireEvent.click(button('Cancel'));
        },
      ],
      [
        'a click outside',
        () => {
          const at = { clientX: 20, clientY: 150 };
          screen.getByRole('dialog').focus();
          fireEvent.mouseDown(screen.getByRole('dialog'), at);
          fireEvent.click(screen.getByRole('dialog'), at);
        },
      ],
    ])('puts the focus on Keep Editing when asked by %s, and keeps it there', async (_, leave) => {
      const onClose = renderGuarded();
      change('Name', 'Testwort');

      leave();
      expect(button('Keep Editing')).toHaveFocus();
      // Still there once the browser has had its turn: no later step takes it.
      await act(async () => {
        await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      });
      expect(button('Keep Editing')).toHaveFocus();
      expect(onClose).not.toHaveBeenCalled();
    });

    // A way out tried again flashes the
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

    it('closes on Discard Changes after Cancel', () => {
      const onClose = renderGuarded();
      change('Name', 'Testwort');
      fireEvent.click(button('Cancel'));

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

// While a modal is open the root's scroll is hidden and the scrollbar's room is given back as padding (Modal/page-hold.ts).
// The width is published as `--scrollbar-width` only where the page had a scrollbar and only until the last modal closes; the padding itself is presentation, measured by hand.
describe('Modal holding the page', () => {
  const root = document.documentElement;
  const widthOf = () => root.style.getPropertyValue('--scrollbar-width');

  // happy-dom lays nothing out, so the root's width is set to say whether
  // the page has a scrollbar: narrower than the window means it has one.
  function pageWithScrollbar(scrollbar: number) {
    Object.defineProperty(root, 'clientWidth', {
      configurable: true,
      get: () => window.innerWidth - scrollbar,
    });
  }

  afterEach(() => {
    Reflect.deleteProperty(root, 'clientWidth');
  });

  it('gives the room back while open where the page has a scrollbar, and takes it back on close', () => {
    pageWithScrollbar(15);
    expect(widthOf()).toBe('');

    const { unmount } = render(
      <Modal title="Edit Category" onClose={vi.fn()}>
        <p>Body</p>
      </Modal>,
    );
    expect(widthOf()).toBe('15px');

    unmount();
    expect(widthOf()).toBe('');
  });

  it('sets nothing where the page has no scrollbar', () => {
    pageWithScrollbar(0);

    const { unmount } = render(
      <Modal title="Edit Category" onClose={vi.fn()}>
        <p>Body</p>
      </Modal>,
    );
    expect(screen.getByRole('dialog', { name: 'Edit Category' })).toHaveAttribute('open');
    expect(widthOf()).toBe('');
    unmount();
  });

  // A second modal opens once the scrollbar is already gone, so it must not
  // measure again, and the first closing must not give the room back early.
  it('keeps the room until the last of two open modals closes', () => {
    pageWithScrollbar(15);
    const first = render(
      <Modal title="Edit Category" onClose={vi.fn()}>
        <p>Body</p>
      </Modal>,
    );
    pageWithScrollbar(0);
    const second = render(
      <Modal title="Delete Category" onClose={vi.fn()}>
        <p>Body</p>
      </Modal>,
    );
    expect(widthOf()).toBe('15px');

    first.unmount();
    expect(widthOf()).toBe('15px');

    second.unmount();
    expect(widthOf()).toBe('');
  });
});
