import { fireEvent, render, screen, within } from '@testing-library/react';
import type { Route } from 'next';
import { describe, expect, it, vi } from 'vitest';
import MenuButton from '@/components/MenuButton';
import type { MenuButtonItem } from '@/components/MenuButton/types';

// The menu button (claude-docs/components/menu-button.md): a labelled button
// opening a menu of links and actions, with the APG menu-button keys.

const toggle = () => screen.getByRole('button', { name: 'Edit' });
const menu = () => screen.getByRole('menu', { name: 'Edit' });

function draw(items: MenuButtonItem[], busy = false) {
  return render(
    <MenuButton label="Edit" className="btn" items={items} busy={busy} busyLabel="Adding" />,
  );
}

const actions = (onSelect = vi.fn()): MenuButtonItem[] => [
  { key: 'one', label: 'First Choice', onSelect },
  { key: 'two', label: 'Second Choice', onSelect: vi.fn(), destructive: true },
];

describe('MenuButton', () => {
  it('opens on a press, the focus on its first item, and says so', () => {
    draw(actions());
    expect(toggle()).toHaveAttribute('aria-haspopup', 'menu');
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).toBeNull();

    fireEvent.click(toggle());

    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    expect(within(menu()).getAllByRole('menuitem')[0]).toHaveFocus();
  });

  it('opens on ArrowDown from the button', () => {
    draw(actions());
    fireEvent.keyDown(toggle(), { key: 'ArrowDown' });

    expect(within(menu()).getAllByRole('menuitem')[0]).toHaveFocus();
  });

  it('roves with the arrows, Home and End, wrapping at the ends', () => {
    draw(actions());
    fireEvent.click(toggle());
    const [first, second] = within(menu()).getAllByRole('menuitem');

    fireEvent.keyDown(first!, { key: 'ArrowDown' });
    expect(second).toHaveFocus();
    fireEvent.keyDown(second!, { key: 'ArrowDown' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first!, { key: 'ArrowUp' });
    expect(second).toHaveFocus();
    fireEvent.keyDown(second!, { key: 'Home' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first!, { key: 'End' });
    expect(second).toHaveFocus();
  });

  it('closes on Escape, the focus back on the button', () => {
    draw(actions());
    fireEvent.click(toggle());
    fireEvent.keyDown(within(menu()).getAllByRole('menuitem')[0]!, { key: 'Escape' });

    expect(screen.queryByRole('menu')).toBeNull();
    expect(toggle()).toHaveFocus();
  });

  it('closes on a press outside, and on Tab', () => {
    draw(actions());
    fireEvent.click(toggle());
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();

    fireEvent.click(toggle());
    fireEvent.keyDown(within(menu()).getAllByRole('menuitem')[0]!, { key: 'Tab' });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('runs a chosen action once and closes', () => {
    const onSelect = vi.fn();
    draw(actions(onSelect));
    fireEvent.click(toggle());
    fireEvent.click(within(menu()).getByRole('menuitem', { name: 'First Choice' }));

    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('draws a link item as a link to its address, its click run first', () => {
    const onClick = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    draw([
      { key: 'edit', label: 'Edit Entry', href: '/fixture?edit' as Route, onClick },
      ...actions(),
    ]);
    fireEvent.click(toggle());
    const link = within(menu()).getByRole('menuitem', { name: 'Edit Entry' });
    expect(link).toHaveAttribute('href', '/fixture?edit');

    fireEvent.click(link);

    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('is busy and shut while an item is in flight', () => {
    draw(actions(), true);

    const busy = screen.getByRole('button', { name: 'Adding' });
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(busy).toBeDisabled();
  });

  // An icon in place of the words (M8.17's card More): the label still names
  // the button and its menu, read by a screen reader though not shown.
  it("keeps its label as its name and its menu's with an icon in place of the words", () => {
    const { rerender } = render(
      <MenuButton
        label="Edit"
        className="btn"
        items={actions()}
        icon={<svg aria-hidden="true" />}
      />,
    );
    fireEvent.click(toggle());
    expect(within(menu()).getAllByRole('menuitem')).toHaveLength(2);

    rerender(
      <MenuButton
        label="Edit"
        className="btn"
        items={actions()}
        icon={<svg aria-hidden="true" />}
        busy
        busyLabel="Adding"
      />,
    );
    expect(screen.getByRole('button', { name: 'Adding' })).toBeDisabled();
  });
});
