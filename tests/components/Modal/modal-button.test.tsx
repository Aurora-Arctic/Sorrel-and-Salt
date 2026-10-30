import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ModalButton } from '@/components/Modal';

// A button that opens a modal and takes the focus back when it closes, which
// Modal does not do itself, since its owner unmounts it rather than closing
// it in place (claude-docs/components/modal.md, "Focus").

const trigger = () => screen.getByRole('button', { name: 'Open Ledger' });
const dialog = () => screen.getByRole('dialog');

function open() {
  render(
    <ModalButton label="Open Ledger" className="btn btn--solid" title="The Ledger">
      {(close) => (
        <button type="button" onClick={close}>
          Done
        </button>
      )}
    </ModalButton>,
  );
  fireEvent.click(trigger());
}

describe('ModalButton', () => {
  it('opens its modal from the button, named by its title', () => {
    open();

    expect(dialog()).toHaveAccessibleName('The Ledger');
    expect(trigger()).not.toHaveFocus();
  });

  it('gives the focus back to the button when closed', async () => {
    open();
    expect(trigger()).not.toHaveFocus();

    fireEvent.click(within(dialog()).getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(trigger()).toHaveFocus();
  });

  it("keeps the button's tip off the dialog it opens", async () => {
    render(
      <ModalButton label="+" ariaLabel="Open Ledger" tip="Open" className="btn" title="The Ledger">
        {() => <button type="button">Done</button>}
      </ModalButton>,
    );

    await act(async () => {
      fireEvent.click(trigger());
    });

    // The dialog took the focus; a tip around it would have opened on that.
    expect(dialog()).toBeInTheDocument();
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it("hands its button to the owner's ref, runs onOpen on the press, and still takes the focus back", async () => {
    const ref = createRef<HTMLButtonElement>();
    const onOpen = vi.fn();
    render(
      <ModalButton ref={ref} onOpen={onOpen} label="Open Ledger" className="btn" title="The Ledger">
        {() => <button type="button">Done</button>}
      </ModalButton>,
    );
    expect(ref.current).toBe(trigger());
    expect(onOpen).not.toHaveBeenCalled();

    fireEvent.click(trigger());
    expect(onOpen).toHaveBeenCalledOnce();
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(trigger()).toHaveFocus();
  });
});
