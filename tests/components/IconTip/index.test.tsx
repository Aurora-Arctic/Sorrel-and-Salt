import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import IconTip, { CheckIcon, EditLink } from '@/components/IconTip';
import MenuButton from '@/components/MenuButton';
import Modal from '@/components/Modal';

// A word above an icon control, "Edit" over a pencil: shown once the pointer
// rests on the control or at its focus, gone the moment the pointer leaves,
// and dismissed by Escape; decoration only, since the control's own name says
// more (claude-docs/components/icon-tip.md).

// Open, the tip is in the page but kept out of the accessibility tree, so
// it is found with `hidden`; shut, it is not in the page at all.
const tip = () => screen.queryByRole('tooltip', { hidden: true });

function renderTip() {
  render(
    <IconTip tip="Edit">
      <button type="button" aria-label="Edit Fixture Salt">
        ✎
      </button>
    </IconTip>,
  );
  return screen.getByRole('button', { name: 'Edit Fixture Salt' });
}

describe('IconTip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens once the pointer has rested on the control 300ms, and closes the moment it leaves, gone after a 120ms fade', () => {
    const button = renderTip();
    expect(tip()).toBeNull();

    fireEvent.mouseEnter(button);
    act(() => vi.advanceTimersByTime(299));
    expect(tip()).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(tip()).toHaveClass('icon-tip__bubble');
    expect(tip()).not.toHaveClass('icon-tip__bubble--closing');

    // Closed at once, with no wait to cross onto it: it stays only for its fade.
    fireEvent.mouseLeave(button);
    expect(tip()).toHaveClass('icon-tip__bubble--closing');
    act(() => vi.advanceTimersByTime(120));
    expect(tip()).toBeNull();
  });

  it('opens nothing for a pointer that passes over without resting', () => {
    const button = renderTip();

    fireEvent.mouseEnter(button);
    act(() => vi.advanceTimersByTime(200));
    fireEvent.mouseLeave(button);
    act(() => vi.advanceTimersByTime(500));

    expect(tip()).toBeNull();
  });

  it('opens at once on the control’s focus and closes on its blur', () => {
    const button = renderTip();

    act(() => button.focus());
    expect(tip()).not.toBeNull();
    expect(tip()).not.toHaveClass('icon-tip__bubble--closing');

    act(() => button.blur());
    act(() => vi.advanceTimersByTime(500));
    expect(tip()).toBeNull();
  });

  it('is kept from assistive technology, adding nothing to the control’s name or description', () => {
    const button = renderTip();

    act(() => button.focus());

    expect(tip()).not.toBeNull();
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(button).toHaveAccessibleName('Edit Fixture Salt');
    expect(button).not.toHaveAccessibleDescription();
  });

  it('closes on Escape without moving the focus, marking the key handled only while open', () => {
    const button = renderTip();
    act(() => button.focus());

    // `false`: the default was prevented.
    expect(fireEvent.keyDown(button, { key: 'Escape' })).toBe(false);
    act(() => vi.advanceTimersByTime(500));
    expect(tip()).toBeNull();
    expect(button).toHaveFocus();

    expect(fireEvent.keyDown(button, { key: 'Escape' })).toBe(true);
  });

  // happy-dom turns no Escape into the dialog's `cancel`; stood in for as a
  // browser behaves, the cancel fired only for a keydown left unhandled. Its
  // `showModal` and `close` are the shared stub's (tests/support/setup-dom.ts).
  describe('inside a modal', () => {
    const escape = (target: HTMLElement) => {
      if (fireEvent.keyDown(target, { key: 'Escape' })) {
        fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
      }
    };

    it('takes the first Escape to close the tip alone, and leaves the next to close the modal', () => {
      const onClose = vi.fn();
      render(
        <Modal title="Edit Ingredient" onClose={onClose}>
          <IconTip tip="Edit">
            <button type="button" aria-label="Edit Fixture Salt">
              ✎
            </button>
          </IconTip>
        </Modal>,
      );
      const button = screen.getByRole('button', { name: 'Edit Fixture Salt' });
      act(() => button.focus());
      expect(tip()).not.toBeNull();

      escape(button);
      act(() => vi.advanceTimersByTime(500));
      expect(tip()).toBeNull();
      expect(onClose).not.toHaveBeenCalled();

      escape(button);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});

// A tip over a control that opens a menu: while the menu is open the menu says
// what the control does, so the tip stays shut however the pointer or the
// focus reaches the control, and is back for
// the next hover once the menu is closed.
describe('IconTip around a menu button', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function renderMenu() {
    render(
      <IconTip tip="Add">
        <MenuButton
          label="Add Fixture Salt"
          className="btn"
          icon={<svg aria-hidden="true" />}
          items={[{ key: 'one', label: 'First Choice', onSelect: vi.fn() }]}
        />
      </IconTip>,
    );
    return screen.getByRole('button', { name: 'Add Fixture Salt' });
  }

  // A hover: the pointer enters and rests the 300ms a tip waits for.
  const rest = (button: HTMLElement) => {
    fireEvent.mouseEnter(button);
    act(() => vi.advanceTimersByTime(300));
  };

  // The tip's fade, past which a closed tip is gone from the page.
  const settle = async () => {
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
  };

  it('takes its tip away when the menu opens on a press, and keeps it away on hover and focus', async () => {
    const button = renderMenu();
    rest(button);
    expect(tip()).not.toBeNull();
    // Why it could show: closed, a hover opens it, as just seen.

    await act(async () => {
      fireEvent.click(button);
    });
    expect(button).toHaveAttribute('aria-expanded', 'true');
    await settle();
    expect(tip()).toBeNull();

    fireEvent.mouseLeave(button);
    rest(button);
    expect(tip()).toBeNull();
    act(() => button.focus());
    expect(tip()).toBeNull();
  });

  it('takes its tip away when the menu opens from the keyboard while the pointer rests on the control', async () => {
    const button = renderMenu();
    rest(button);
    expect(tip()).not.toBeNull();

    await act(async () => {
      fireEvent.keyDown(button, { key: 'ArrowDown' });
    });
    expect(button).toHaveAttribute('aria-expanded', 'true');
    await settle();
    expect(tip()).toBeNull();
  });

  it('shows the tip again on a hover once the menu has closed', async () => {
    const button = renderMenu();
    await act(async () => {
      fireEvent.click(button);
    });
    rest(button);
    expect(tip()).toBeNull();

    await act(async () => {
      fireEvent.click(button);
    });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.mouseLeave(button);
    rest(button);
    expect(tip()).not.toBeNull();
  });
});

describe('EditLink', () => {
  it('is a link named Edit and its row’s name, wearing the tip', async () => {
    render(
      <EditLink
        href="/admin/compendium?edit=fixture-salt"
        name="Fixture Salt"
        heading={{ eyebrow: 'Edit Ingredient', title: 'Fixture Salt' }}
      />,
    );

    const link = screen.getByRole('link', { name: 'Edit Fixture Salt' });
    expect(link).toHaveAttribute('href', '/admin/compendium?edit=fixture-salt');

    fireEvent.mouseEnter(link);
    await waitFor(() => expect(tip()).not.toBeNull());
  });
});

describe('CheckIcon', () => {
  it('is a glyph the control around it names, hidden from assistive technology', () => {
    const { container } = render(
      <a href="/fixture" aria-label="In My Ingredients">
        <CheckIcon />
      </a>,
    );

    expect(screen.getByRole('link', { name: 'In My Ingredients' })).toBeInTheDocument();
    const glyph = container.querySelector('svg');
    expect(glyph).toHaveAttribute('aria-hidden', 'true');
    expect(glyph).toHaveAttribute('focusable', 'false');
  });
});
