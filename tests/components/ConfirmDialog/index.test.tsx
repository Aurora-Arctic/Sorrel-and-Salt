import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ConfirmDialog from '@/components/ConfirmDialog';

// A yes-or-no question in a modal of its own, for a confirm with no form to ask over (claude-docs/components/confirm-dialog.md).
// happy-dom's `showModal` and `close` only set and clear `open`, so both are replaced by spies that do the same.

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  });
});

// The focus goes in a microtask after the dialog opens.
const settle = () => act(async () => {});

function renderDialog({ busy = false } = {}) {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  render(
    <ConfirmDialog
      title="Delete Spell"
      question={
        <>
          Delete <strong>Testwort Charm</strong>?
        </>
      }
      confirmLabel="Delete"
      busyLabel="Deleting"
      busy={busy}
      onConfirm={onConfirm}
      onClose={onClose}
    />,
  );
  return { onConfirm, onClose };
}

describe('ConfirmDialog', () => {
  it('is an alert dialog named by its title', () => {
    renderDialog();

    expect(screen.getByRole('alertdialog', { name: 'Delete Spell' })).toBeInTheDocument();
  });

  it('puts the focus on the safe answer, never on the confirm', async () => {
    renderDialog();
    await settle();

    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Delete' })).not.toHaveFocus();
  });

  it('turns Escape into the safe answer, confirming nothing', () => {
    const { onConfirm, onClose } = renderDialog();

    const cancel = new Event('cancel', { cancelable: true });
    fireEvent(screen.getByRole('alertdialog', { name: 'Delete Spell' }), cancel);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('names its confirm by the verb it is given and confirms once on a press', () => {
    const { onConfirm } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /^(OK|Yes)$/i })).toBeNull();
  });

  it('keeps the confirm from a second press while it is busy, with the safe answer held too', () => {
    const { onConfirm } = renderDialog({ busy: true });

    const confirm = screen.getByRole('button', { name: 'Deleting' });
    fireEvent.click(confirm);

    expect(confirm).toHaveAttribute('aria-busy', 'true');
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });
});
