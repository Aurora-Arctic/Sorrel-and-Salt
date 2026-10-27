import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Route } from 'next';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MenuButton from '@/components/MenuButton';
import { choicesFor, sectionsFor } from '@/components/MenuButton/sections';
import type { MenuButtonItem, MenuSection } from '@/components/MenuButton/types';

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

  // A disabled item (the owner's call of 2026-10-20: a coven that holds the entry is shown, not
  // left out): the APG menu pattern, so it stays in the roving and is read as unavailable, and
  // choosing it runs nothing and leaves the menu open.
  describe('a disabled item', () => {
    const withHeld = (onSelect = vi.fn()): MenuButtonItem[] => [
      { key: 'one', label: 'First Choice', onSelect, disabled: true, mark: 'Already Chosen' },
      { key: 'two', label: 'Second Choice', onSelect: vi.fn() },
    ];

    it('is aria-disabled, named by its label and its mark, with no description', () => {
      draw(withHeld());
      fireEvent.click(toggle());
      const held = within(menu()).getByRole('menuitem', {
        name: 'First Choice, Already Chosen',
      });

      expect(held).toHaveAttribute('aria-disabled', 'true');
      expect(held).not.toHaveAccessibleDescription();
      // aria-disabled, not disabled, so the focus can still land on it.
      expect(held).not.toBeDisabled();
      expect(within(menu()).getByRole('menuitem', { name: 'Second Choice' })).not.toHaveAttribute(
        'aria-disabled',
      );
    });

    it('stays in the roving, the focus landing on it', () => {
      draw(withHeld());
      fireEvent.click(toggle());
      const [held, other] = within(menu()).getAllByRole('menuitem');

      expect(held).toHaveFocus();
      fireEvent.keyDown(held!, { key: 'ArrowDown' });
      expect(other).toHaveFocus();
      fireEvent.keyDown(other!, { key: 'ArrowDown' });
      expect(held).toHaveFocus();
    });

    it('runs nothing when chosen, by a press or by Enter, and the menu stays open', () => {
      const onSelect = vi.fn();
      draw(withHeld(onSelect));
      fireEvent.click(toggle());
      const held = within(menu()).getByRole('menuitem', { name: 'First Choice, Already Chosen' });

      fireEvent.click(held);
      fireEvent.keyDown(held, { key: 'Enter' });
      fireEvent.keyDown(held, { key: ' ' });

      expect(onSelect).not.toHaveBeenCalled();
      expect(menu()).toBeVisible();
      expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    });
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

  // MB.120: the busy button was `disabled`, and a browser drops the focus of a control that is
  // disabled under it to the body, so the keyboard lost its place while an add ran. It is
  // `aria-disabled` instead, as the menu's own disabled items are, and refuses a press and
  // ArrowDown itself.
  describe('while busy', () => {
    it('keeps the focus on the button as it turns busy, and gives it back as it ends', () => {
      const { rerender } = draw(actions());
      // Why the focus could have gone: the same button, focused, before it turns busy.
      toggle().focus();
      expect(toggle()).toHaveFocus();

      rerender(
        <MenuButton label="Edit" className="btn" items={actions()} busy busyLabel="Adding" />,
      );

      const busy = screen.getByRole('button', { name: 'Adding' });
      expect(busy).not.toHaveAttribute('disabled');
      expect(busy).toHaveFocus();
      expect(document.body).not.toHaveFocus();

      rerender(<MenuButton label="Edit" className="btn" items={actions()} />);
      expect(toggle()).toHaveFocus();
      expect(toggle()).not.toHaveAttribute('aria-disabled');
    });

    it('opens no menu on a press or on ArrowDown', () => {
      draw(actions(), true);
      const busy = screen.getByRole('button', { name: 'Adding' });

      fireEvent.click(busy);
      fireEvent.keyDown(busy, { key: 'ArrowDown' });

      expect(busy).toHaveAttribute('aria-busy', 'true');
      expect(busy).toHaveAttribute('aria-disabled', 'true');
      expect(busy).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('menu')).toBeNull();
    });
  });

  // An icon in place of the words (M8.17's card More): the label still names
  // the button and its menu, read by a screen reader though not shown.
  it("keeps its label as its name and its menu's with an icon in place of the words", () => {
    render(
      <MenuButton
        label="Edit"
        className="btn"
        items={actions()}
        icon={<svg aria-hidden="true" />}
      />,
    );
    fireEvent.click(toggle());
    // `menu()` finds it by the name Edit.
    expect(within(menu()).getAllByRole('menuitem')).toHaveLength(2);
  });

  // The bar's Add Ingredient chevron is "Choose Where to Add" and its menu "Add Ingredient To".
  it('names its menu by menuLabel where it is given, the button keeping its label', () => {
    render(<MenuButton label="Edit" menuLabel="Edit Entry" className="btn" items={actions()} />);
    fireEvent.click(toggle());

    expect(screen.getByRole('menu')).toHaveAccessibleName('Edit Entry');
    expect(toggle()).toHaveAccessibleName('Edit');
  });
});

// Where the menu hangs from (claude-docs/components/menu-button.md, "Where it
// opens"): the button's end edge, wherever the button sits, since every caller
// puts it at the end of its row. Floating UI turns the placement into the
// menu's `translate(x, y)`; the rects are stated, since happy-dom lays nothing
// out.
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

  const drawn = () => render(<MenuButton label="Edit" className="btn" items={actions()} />);

  it("hangs from the button's end edge, even in the start half of the window", async () => {
    layOut(100);
    drawn();

    expect(await menuLeft()).toBe(100 + BUTTON_WIDTH - MENU_WIDTH);
  });
});

// The green item goes first (the owner's call, 2026-10-20): whatever place a
// caller gives the item marked `primary`, the menu draws it
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

// Sections (the owner's call, 2026-10-20): a menu that holds both the compendium's choices and
// the coven's draws them in labelled groups, the caller putting first the group that belongs to
// the page the viewer is on. The APG menu pattern: a group named by its visible label, a
// separator between groups, and the arrows running through every item as one list.
describe('MenuButton sections', () => {
  const plain = (key: string, label: string): MenuButtonItem => ({
    key,
    label,
    onSelect: vi.fn(),
  });
  const COMPENDIUM: MenuSection = {
    key: 'compendium',
    label: 'Compendium',
    items: [plain('c1', 'Compendium One'), plain('c2', 'Compendium Two')],
  };
  const COVEN: MenuSection = {
    key: 'coven',
    label: 'Coven',
    items: [plain('v1', 'Coven One'), plain('v2', 'Coven Two')],
  };

  function drawSections(sections: MenuSection[]) {
    return render(<MenuButton label="Edit" className="btn" sections={sections} />);
  }
  const names = () =>
    within(menu())
      .getAllByRole('menuitem')
      .map((item) => item.textContent);

  it('draws each section as a group named by its visible label, items inside it', () => {
    drawSections([COMPENDIUM, COVEN]);
    fireEvent.click(toggle());

    const groups = within(menu()).getAllByRole('group');
    expect(groups).toHaveLength(2);
    expect(within(menu()).getByRole('group', { name: 'Compendium' })).toBe(groups[0]);
    expect(
      within(within(menu()).getByRole('group', { name: 'Compendium' }))
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(['Compendium One', 'Compendium Two']);
    expect(
      within(within(menu()).getByRole('group', { name: 'Coven' }))
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(['Coven One', 'Coven Two']);
  });

  it('puts a separator between the sections, and none before the first or after the last', () => {
    drawSections([COMPENDIUM, COVEN]);
    fireEvent.click(toggle());

    expect(within(menu()).getAllByRole('separator')).toHaveLength(1);
  });

  it('draws the sections in the order given, so the caller decides which comes first', () => {
    const view = drawSections([COMPENDIUM, COVEN]);
    fireEvent.click(toggle());
    expect(names()).toEqual(['Compendium One', 'Compendium Two', 'Coven One', 'Coven Two']);

    view.unmount();
    drawSections([COVEN, COMPENDIUM]);
    fireEvent.click(toggle());
    expect(names()).toEqual(['Coven One', 'Coven Two', 'Compendium One', 'Compendium Two']);
    expect(within(menu()).getAllByRole('group')[0]).toBe(
      within(menu()).getByRole('group', { name: 'Coven' }),
    );
  });

  it('roves through every section with the arrows, Home and End, the labels never taking the focus', () => {
    drawSections([COMPENDIUM, COVEN]);
    fireEvent.click(toggle());
    const items = within(menu()).getAllByRole('menuitem');
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveFocus();

    items[1]!.focus();
    fireEvent.keyDown(items[1]!, { key: 'ArrowDown' });
    expect(items[2]).toHaveFocus();
    fireEvent.keyDown(items[2]!, { key: 'ArrowUp' });
    expect(items[1]).toHaveFocus();
    fireEvent.keyDown(items[1]!, { key: 'End' });
    expect(items[3]).toHaveFocus();
    fireEvent.keyDown(items[3]!, { key: 'ArrowDown' });
    expect(items[0]).toHaveFocus();
    expect(within(menu()).getAllByRole('menuitem')).toHaveLength(4);
  });

  it('keeps the green item first within its own section, not above the others', () => {
    drawSections([
      COMPENDIUM,
      {
        key: 'coven',
        label: 'Coven',
        items: [plain('v1', 'Coven One'), { ...plain('v2', 'Coven Two'), primary: true }],
      },
    ]);
    fireEvent.click(toggle());

    expect(names()).toEqual(['Compendium One', 'Compendium Two', 'Coven Two', 'Coven One']);
  });

  it('draws a menu without sections exactly as before: no group, no separator', () => {
    draw(actions());
    fireEvent.click(toggle());

    expect(within(menu()).queryByRole('group')).toBeNull();
    expect(within(menu()).queryByRole('separator')).toBeNull();
  });

  it('draws a section that holds nothing as nothing: no empty group, no stray separator', () => {
    drawSections([COMPENDIUM, { key: 'coven', label: 'Coven', items: [] }]);
    fireEvent.click(toggle());

    expect(within(menu()).getAllByRole('group')).toHaveLength(1);
    expect(within(menu()).queryByRole('separator')).toBeNull();
  });

  describe('sectionsFor', () => {
    const groups = { compendium: [plain('c', 'Compendium One')], coven: [plain('v', 'Coven One')] };

    it('puts the compendium first on a compendium page and the coven first on a coven page', () => {
      expect(sectionsFor(groups, 'compendium').map(({ label }) => label)).toEqual([
        'Compendium',
        'Coven',
      ]);
      expect(sectionsFor(groups, 'coven').map(({ label }) => label)).toEqual([
        'Coven',
        'Compendium',
      ]);
    });

    it('leaves out a side with nothing, so a menu of one kind is not sectioned', () => {
      expect(sectionsFor({ ...groups, coven: [] }, 'coven')).toHaveLength(1);
      expect(sectionsFor({ compendium: [], coven: [] }, 'coven')).toEqual([]);
    });

    // A More menu always draws its labelled section, even for one kind of choice (the owner's
    // call, 2026-10-20), and an empty side is left out.
    it('hands a More menu the sections even where only one side has items', () => {
      expect(choicesFor(groups, 'coven').sections).toHaveLength(2);
      const lone = choicesFor({ ...groups, compendium: [] }, 'coven');
      expect(lone.sections?.map(({ label, items }) => [label, items])).toEqual([
        ['Coven', groups.coven],
      ]);
      expect(lone.items).toBeUndefined();
    });
  });
});
