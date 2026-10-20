import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Route } from 'next';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

// Where the menu hangs from (claude-docs/components/menu-button.md, "Where it
// opens"): the button's end edge by default, and with `placement="auto"` its
// start edge when the button sits in the start half of the window, so the
// ingredient page's Edit, dropped to the left of a wrapped header, does not
// open leftwards off the screen's edge. Floating UI turns the placement into
// the menu's `translate(x, y)`; the rects are stated, since happy-dom lays
// nothing out.
describe('MenuButton placement', () => {
  const WINDOW_WIDTH = 1000;
  const BUTTON_WIDTH = 80;
  const MENU_WIDTH = 120;
  const rectOf = (left: number, width: number, top = 100, height = 32): DOMRect =>
    ({
      x: left,
      y: top,
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      toJSON: () => ({}),
    }) as DOMRect;

  // Floating UI measures the button and the menu, and nothing else here.
  function layOut(buttonLeft: number): void {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(WINDOW_WIDTH);
    // What Floating UI keeps the menu inside of.
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(WINDOW_WIDTH);
    vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(800);
    // The menu's own size, which Floating UI reads from the element, not its rect.
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.getAttribute('role') === 'menu' ? MENU_WIDTH : 0;
    });
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.getAttribute('role') === 'menu' ? 60 : 0;
    });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      if (this.getAttribute('role') === 'menu') return rectOf(0, MENU_WIDTH, 0, 60);
      if (this.getAttribute('aria-haspopup') === 'menu') return rectOf(buttonLeft, BUTTON_WIDTH);
      return rectOf(0, 0, 0, 0);
    });
  }

  afterEach(() => vi.restoreAllMocks());

  // The menu's left edge, from the translate Floating UI sets on it.
  const menuLeft = async (): Promise<number> => {
    fireEvent.click(toggle());
    await waitFor(() => expect(menu().style.transform).toMatch(/^translate\(/));
    return Number.parseFloat(/translate\((-?[\d.]+)px/.exec(menu().style.transform)![1]!);
  };

  const drawn = (placement?: 'auto' | 'end') =>
    render(<MenuButton label="Edit" className="btn" items={actions()} placement={placement} />);

  it("auto: hangs from the button's start edge when the button is in the start half", async () => {
    layOut(100);
    drawn('auto');

    expect(await menuLeft()).toBe(100);
  });

  it("auto: hangs from the button's end edge when the button is in the end half", async () => {
    layOut(700);
    drawn('auto');

    // The button's right edge less the menu's width.
    expect(await menuLeft()).toBe(700 + BUTTON_WIDTH - MENU_WIDTH);
  });

  it('auto: chooses again at every opening, from where the button is then', async () => {
    layOut(100);
    drawn('auto');
    expect(await menuLeft()).toBe(100);
    fireEvent.keyDown(within(menu()).getAllByRole('menuitem')[0]!, { key: 'Escape' });

    vi.restoreAllMocks();
    layOut(700);

    expect(await menuLeft()).toBe(700 + BUTTON_WIDTH - MENU_WIDTH);
  });

  it("the default stays the button's end edge, even in the start half", async () => {
    layOut(100);
    drawn();

    expect(await menuLeft()).toBe(100 + BUTTON_WIDTH - MENU_WIDTH);
  });
});

// The green item goes first (the owner's call, 2026-10-20): whatever place a
// caller gives the item marked `primary` or `constructive`, the menu draws it
// first and leaves the rest in the caller's order, and the keys follow what is
// drawn.
describe('MenuButton green item first', () => {
  const names = (): (string | null)[] =>
    within(menu())
      .getAllByRole('menuitem')
      .map((item) => item.textContent);
  const plain = (key: string, label: string): MenuButtonItem => ({
    key,
    label,
    onSelect: vi.fn(),
  });

  it('draws a primary item first among plain ones, the rest in the order given, and Home lands on it', () => {
    draw([
      plain('one', 'First Choice'),
      { key: 'two', label: 'Second Choice', primary: true, onSelect: vi.fn() },
      plain('three', 'Third Choice'),
    ]);
    fireEvent.click(toggle());

    expect(names()).toEqual(['Second Choice', 'First Choice', 'Third Choice']);
    // The opening focus is the first item drawn, the green one.
    const [green, , last] = within(menu()).getAllByRole('menuitem');
    expect(green).toHaveFocus();
    fireEvent.keyDown(green!, { key: 'End' });
    expect(last).toHaveFocus();
    fireEvent.keyDown(last!, { key: 'Home' });
    expect(green).toHaveFocus();
  });

  it('draws a constructive item first too, after a link and an action', () => {
    draw([
      { key: 'edit', label: 'Edit Entry', href: '/fixture?edit' as Route },
      plain('one', 'First Choice'),
      { key: 'add', label: 'Add to Cupboard', constructive: true, onSelect: vi.fn() },
    ]);
    fireEvent.click(toggle());

    expect(names()).toEqual(['Add to Cupboard', 'Edit Entry', 'First Choice']);
  });

  it('keeps the order given when no item is green', () => {
    draw([
      plain('one', 'First Choice'),
      { key: 'two', label: 'Second Choice', destructive: true, onSelect: vi.fn() },
      plain('three', 'Third Choice'),
    ]);
    fireEvent.click(toggle());

    expect(names()).toEqual(['First Choice', 'Second Choice', 'Third Choice']);
  });

  it('still runs the green item it moved, not the one that took its place', () => {
    const onSelect = vi.fn();
    draw([
      plain('one', 'First Choice'),
      { key: 'two', label: 'Second Choice', primary: true, onSelect },
    ]);
    fireEvent.click(toggle());
    fireEvent.click(within(menu()).getAllByRole('menuitem')[0]!);

    expect(onSelect).toHaveBeenCalledOnce();
  });
});
