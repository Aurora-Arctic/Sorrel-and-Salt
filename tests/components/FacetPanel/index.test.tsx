import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import FacetPanel, { WIDE } from '@/components/FacetPanel';
import type { FacetPanelFilter, FacetPanelProps } from '@/components/FacetPanel/types';
import type { CompendiumFacetCounts } from '@/components/CompendiumList/types';

// The Filters button and the panel it opens (M12.4): a dialog that slides down over the
// results from the tablet width up and is a modal sheet below it, rendered inline and open
// before the script runs (claude-docs/components/facet-panel.md).

const GROUP = { id: 'g', name: 'Testing', colorDark: '#336699', colorLight: '#99ccff' };

const FACETS: CompendiumFacetCounts = {
  forms: [
    { value: 'test-oil', label: 'Test Oil', count: 4, icon: null },
    { value: 'test-leaf', label: 'Test Leaf', count: 2, icon: null },
  ],
  deities: [
    { value: 'testa-fixtura', label: 'Testa', count: 3, tradition: 'Fixtura' },
    { value: 'probus-fixtura', label: 'Probus', count: 1, tradition: 'Fixtura' },
  ],
  categories: [
    { value: 'warding', label: 'Testwarding', count: 5, group: GROUP },
    { value: 'mending', label: 'Testmending', count: 6, group: GROUP },
  ],
  zodiac: [{ value: 'test-ram', label: 'Test Ram', count: 2 }],
  celestialBodies: [{ value: 'test-sun', label: 'Test Sun', count: 3 }],
  elements: [
    { value: 'water', label: 'Water', count: 7 },
    { value: 'fire', label: 'Fire', count: 0 },
  ],
  toxic: [
    { value: 'toxic', label: 'Toxic', count: 2 },
    { value: 'not_toxic', label: 'Not Toxic', count: 9 },
  ],
  withoutReferences: 3,
  withoutForms: 2,
};

const NONE: FacetPanelFilter = {
  categories: [],
  categoryMode: 'all',
  forms: [],
  deities: [],
  zodiac: [],
  celestialBodies: [],
  elements: [],
  toxic: '',
  withoutReferences: false,
  withoutForms: false,
};

const props = (
  filter: Partial<FacetPanelFilter> = {},
  more: Partial<FacetPanelProps> = {},
): FacetPanelProps => ({
  facets: FACETS,
  filter: { ...NONE, ...filter },
  onChange: () => undefined,
  clearHref: '/compendium',
  ...more,
});

const dialog = () => document.querySelector('dialog') as HTMLDialogElement;
const filtersButton = () => screen.getByRole('button', { name: /^Filters/ });

// Stands the viewport in: wide is the tablet width and up. `listeners` collects the width query's change handlers.
function stubViewport(wide: boolean, reduced = true) {
  const listeners: Array<() => void> = [];
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-reduced-motion')
      ? reduced
      : query.includes('min-width')
        ? wide
        : false,
    media: query,
    addEventListener: (_type: string, listener: () => void) => {
      if (query.includes('min-width')) listeners.push(listener);
    },
    removeEventListener: () => undefined,
  }));
  return listeners;
}

// The dialog's methods are attribute toggles in this environment; spy to learn which opened it.
function spyDialog() {
  const show = vi.spyOn(HTMLDialogElement.prototype, 'show');
  const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
  return { show, showModal };
}

describe('FacetPanel', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('counts every chosen value on the Filters button, Toxic included and Match not', () => {
    stubViewport(true);
    const { rerender } = render(<FacetPanel {...props()} />);
    expect(filtersButton()).toHaveAccessibleName('Filters');

    rerender(
      <FacetPanel
        {...props({
          forms: ['test-oil', 'test-leaf'],
          categories: ['warding', 'mending'],
          categoryMode: 'any',
          toxic: 'toxic',
        })}
      />,
    );
    // Two forms, two categories and a Toxic setting; the Match mode adds none.
    expect(filtersButton()).toHaveAccessibleName('Filters 5');
  });

  it('offers Clear All beside the button only while something is chosen', () => {
    stubViewport(true);
    const { rerender } = render(<FacetPanel {...props()} />);
    expect(screen.queryByRole('link', { name: 'Clear All' })).toBeNull();

    rerender(<FacetPanel {...props({ celestialBodies: ['test-sun'] })} />);
    expect(screen.getByRole('link', { name: 'Clear All' })).toHaveAttribute('href', '/compendium');
  });

  it('opens over the results without a modal from the tablet width up, and focuses into the dialog', () => {
    stubViewport(true);
    const spies = spyDialog();
    render(<FacetPanel {...props()} />);
    expect(dialog()).not.toHaveAttribute('open');

    fireEvent.click(filtersButton());

    expect(spies.show).toHaveBeenCalledTimes(1);
    expect(spies.showModal).not.toHaveBeenCalled();
    expect(filtersButton()).toHaveAttribute('aria-expanded', 'true');
    expect(dialog()).toHaveAttribute('open');
    expect(dialog().contains(document.activeElement)).toBe(true);
  });

  it('names the dialog by its visible Filters title', () => {
    stubViewport(true);
    render(<FacetPanel {...props()} />);
    fireEvent.click(filtersButton());

    expect(screen.getByRole('dialog', { name: 'Filters' })).toBe(dialog());
  });

  it('opens as a modal sheet below the tablet width', () => {
    stubViewport(false);
    const spies = spyDialog();
    render(<FacetPanel {...props()} />);

    fireEvent.click(filtersButton());

    expect(spies.showModal).toHaveBeenCalledTimes(1);
    expect(spies.show).not.toHaveBeenCalled();
  });

  it('closes on Escape and gives focus back to the Filters button', () => {
    stubViewport(true);
    render(<FacetPanel {...props()} />);
    fireEvent.click(filtersButton());

    fireEvent.keyDown(dialog(), { key: 'Escape' });

    expect(dialog()).not.toHaveAttribute('open');
    expect(filtersButton()).toHaveAttribute('aria-expanded', 'false');
    expect(filtersButton()).toHaveFocus();
  });

  it('leaves the panel open when a combobox popup consumed the Escape', () => {
    stubViewport(true);
    render(<FacetPanel {...props()} />);
    fireEvent.click(filtersButton());

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    event.preventDefault();
    act(() => {
      dialog().dispatchEvent(event);
    });

    expect(dialog()).toHaveAttribute('open');
    expect(filtersButton()).toHaveAttribute('aria-expanded', 'true');
  });

  it('shuts and applies once on a press outside the open panel, and not on one inside it', () => {
    stubViewport(true);
    const onApply = vi.fn();
    render(<FacetPanel {...props({}, { onApply })} />);
    fireEvent.click(filtersButton());

    fireEvent.pointerDown(screen.getByRole('heading', { name: 'Filters' }));
    expect(dialog()).toHaveAttribute('open');
    expect(onApply).not.toHaveBeenCalled();

    fireEvent.pointerDown(document.body);

    expect(dialog()).not.toHaveAttribute('open');
    expect(filtersButton()).toHaveAttribute('aria-expanded', 'false');
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('leaves a press on the Filters button to its own handler, so the panel is applied once', () => {
    stubViewport(true);
    const onApply = vi.fn();
    render(<FacetPanel {...props({}, { onApply })} />);
    fireEvent.click(filtersButton());

    fireEvent.pointerDown(filtersButton());
    fireEvent.click(filtersButton());

    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('shuts the sheet on a press on its backdrop, which is the dialog itself, and not on one inside it', () => {
    stubViewport(false);
    const onApply = vi.fn();
    render(<FacetPanel {...props({}, { onApply })} />);
    fireEvent.click(filtersButton());

    fireEvent.pointerDown(screen.getByRole('heading', { name: 'Filters' }));
    expect(onApply).not.toHaveBeenCalled();

    fireEvent.pointerDown(dialog());

    expect(filtersButton()).toHaveAttribute('aria-expanded', 'false');
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('closes at once when the viewport crosses the tablet width', () => {
    const listeners = stubViewport(true, false);
    render(<FacetPanel {...props()} />);
    fireEvent.click(filtersButton());
    expect(listeners.length).toBeGreaterThan(0);

    act(() => listeners.forEach((listener) => listener()));

    expect(dialog()).not.toHaveAttribute('open');
    expect(filtersButton()).toHaveAttribute('aria-expanded', 'false');
  });

  it('snaps shut when the browser closes the dialog itself', () => {
    stubViewport(false);
    render(<FacetPanel {...props()} />);
    fireEvent.click(filtersButton());

    fireEvent(dialog(), new Event('close'));

    expect(filtersButton()).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps the panel pinned to its top when something scrolls it', () => {
    stubViewport(true);
    render(<FacetPanel {...props()} />);
    fireEvent.click(filtersButton());
    const clip = dialog().firstElementChild as HTMLElement;
    clip.scrollTop = 40;

    fireEvent.scroll(clip);

    expect(clip.scrollTop).toBe(0);
  });

  it('submits every chosen value through hidden inputs under its parameter', () => {
    stubViewport(true);
    const { container } = render(
      <FacetPanel
        {...props({
          categories: ['warding', 'mending'],
          categoryMode: 'any',
          forms: ['test-oil', 'test-leaf'],
          deities: ['testa-fixtura'],
          zodiac: ['test-ram'],
          celestialBodies: ['test-sun'],
          elements: ['water'],
          toxic: 'not_toxic',
        })}
      />,
    );
    const sent = (name: string) =>
      Array.from(container.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`))
        .filter((input) => input.type === 'hidden' || input.checked)
        .map((input) => input.value);

    expect(sent('categories')).toEqual(['warding', 'mending']);
    expect(sent('forms')).toEqual(['test-oil', 'test-leaf']);
    expect(sent('deities')).toEqual(['testa-fixtura']);
    expect(sent('zodiac')).toEqual(['test-ram']);
    expect(sent('celestialBodies')).toEqual(['test-sun']);
    expect(sent('elements')).toEqual(['water']);
    expect(sent('toxic')).toEqual(['not_toxic']);
    expect(sent('categoryMode')).toEqual(['any']);
  });

  // M12.54: the Categories facet keeps its list open after a pick, as Forms and Deities do.
  it('keeps the Categories list open after a pick, with the focus in the box, and applies the pick', () => {
    stubViewport(true);
    const onChange = vi.fn();
    render(<FacetPanel {...props({}, { onChange })} />);
    fireEvent.click(filtersButton());
    const box = screen.getByRole('combobox', { name: 'Category' });

    box.focus();
    fireEvent.click(screen.getByRole('button', { name: 'Show Category suggestions' }));
    fireEvent.click(screen.getByRole('option', { name: /^Testwarding/ }));

    expect(onChange).toHaveBeenCalledWith({ categories: ['warding'] });
    expect(box).toHaveAttribute('aria-expanded', 'true');
    expect(box).toHaveFocus();
    fireEvent.keyDown(box, { key: 'Escape' });
    expect(box).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps Match below two categories, on All, disabled and with a hint, and enables it at two', async () => {
    stubViewport(true);
    const { rerender } = render(
      <FacetPanel {...props({ categories: ['warding'], categoryMode: 'any' })} />,
    );
    fireEvent.click(filtersButton());
    const match = () => screen.getByRole('group', { name: 'Match' });
    // The held mode is Any, so the chip resting on All is the stuck state and not the stored value.
    const chip = within(match()).getByRole('button', { name: /All/ });
    expect(chip).toBeDisabled();
    expect(chip.closest('fieldset')).toHaveAccessibleDescription();
    expect(within(match()).queryByRole('radio')).toBeNull();

    // A stuck chip is disabled and unfocusable; the fieldset carries its hint, and hovering shows it.
    const stuck = within(match()).getByRole('button', { name: /All/ });
    const bubble = document.getElementById(
      stuck.closest('fieldset')?.getAttribute('aria-describedby') ?? '',
    );
    fireEvent.mouseEnter(stuck);
    await waitFor(() => expect(bubble).toHaveAttribute('aria-hidden', 'false'));

    rerender(
      <FacetPanel {...props({ categories: ['warding', 'mending'], categoryMode: 'any' })} />,
    );
    expect(within(match()).queryByRole('button', { name: /(Any|All)/ })).toBeNull();
    expect(within(match()).getByRole('radio', { name: 'Any' })).toBeChecked();
  });

  describe('the choice chips (M9.7)', () => {
    const openPanel = (
      filter: Partial<FacetPanelFilter> = {},
      more: Partial<FacetPanelProps> = {},
    ) => {
      stubViewport(true);
      const view = render(<FacetPanel {...props(filter, more)} />);
      fireEvent.click(filtersButton());
      return view;
    };
    const match = () => screen.getByRole('group', { name: 'Match' });
    const menu = () => match().querySelector('details') as HTMLDetailsElement;
    const summary = () => menu().querySelector('summary') as HTMLElement;

    it('shows the enabled Match hint on hover and on focus of its summary, and not while the menu is open', async () => {
      openPanel({ categories: ['warding', 'mending'] });
      const bubble = () =>
        document.getElementById(
          match().closest('fieldset')?.getAttribute('aria-describedby') ?? '',
        ) as HTMLElement;
      expect(bubble()).toHaveAttribute('aria-hidden', 'true');
      fireEvent.mouseEnter(summary());
      await waitFor(() => expect(bubble()).toHaveAttribute('aria-hidden', 'false'));
      fireEvent.mouseLeave(summary());
      fireEvent.focus(summary());
      expect(bubble()).toHaveAttribute('aria-hidden', 'false');
      fireEvent.click(summary());
      expect(bubble()).toHaveAttribute('aria-hidden', 'true');
    });

    it('draws Match as a group holding a summary that opens a menu of native radios', () => {
      openPanel({ categories: ['warding', 'mending'] });
      expect(menu().open).toBe(false);
      fireEvent.click(summary());
      expect(menu().open).toBe(true);
      expect(
        within(match())
          .getAllByRole('radio')
          .map((radio) => radio.getAttribute('value')),
      ).toEqual(['all', 'any']);
    });

    it('closes on choosing, and reports the choice as a patch of only that part', () => {
      const onChange = vi.fn();
      openPanel({ categories: ['warding', 'mending'] }, { onChange });
      fireEvent.click(summary());
      fireEvent.click(within(match()).getByRole('radio', { name: 'Any' }));
      expect(onChange).toHaveBeenLastCalledWith({ categoryMode: 'any' });
      expect(menu().open).toBe(false);
    });

    it('closes on Escape and returns focus to the chip, leaving the panel open', () => {
      openPanel({ categories: ['warding', 'mending'] });
      fireEvent.click(summary());
      fireEvent.keyDown(within(match()).getAllByRole('radio')[0], { key: 'Escape' });
      expect(menu().open).toBe(false);
      expect(menu().querySelector('summary')).toHaveFocus();
      expect(dialog().open).toBe(true);
    });

    it('closes on a press outside it', () => {
      openPanel({ categories: ['warding', 'mending'] });
      fireEvent.click(summary());
      expect(menu().open).toBe(true);
      fireEvent.pointerDown(screen.getByRole('group', { name: 'Toxic' }));
      expect(menu().open).toBe(false);
    });

    it('carries each count as its own number in the radio name, Toxic included', () => {
      openPanel();
      const toxic = screen.getByRole('group', { name: 'Toxic' });
      expect(within(toxic).getByRole('radio', { name: 'Toxic 2' })).toBeInTheDocument();
      expect(within(toxic).getByRole('radio', { name: 'Not Toxic 9' })).toBeInTheDocument();
      expect(within(toxic).getByRole('radio', { name: 'Any' })).toBeChecked();
    });

    it('sends the held choices through the GET form even while the menus are shut', () => {
      stubViewport(true);
      const { container } = render(
        <form method="get">
          <FacetPanel
            {...props({ categories: ['warding', 'mending'], categoryMode: 'any', toxic: 'toxic' })}
          />
        </form>,
      );
      const data = new FormData(container.querySelector('form') as HTMLFormElement);
      expect(data.getAll('categoryMode')).toEqual(['any']);
      expect(data.getAll('toxic')).toEqual(['toxic']);
    });
  });

  it('shows No Refs to an admin only', () => {
    stubViewport(true);
    const { rerender } = render(<FacetPanel {...props()} />);
    fireEvent.click(filtersButton());
    expect(screen.queryByRole('switch', { name: /^No Refs/ })).toBeNull();

    rerender(<FacetPanel {...props({}, { admin: true })} />);
    expect(screen.getByRole('switch', { name: /^No Refs/ })).toBeInTheDocument();
  });

  describe('In My Covens (M12.55)', () => {
    const COVENS = [
      { id: 'coven-w', name: 'Testhollow' },
      { id: 'coven-v', name: 'Testwren' },
    ];
    const open = (filter: Partial<FacetPanelFilter> = {}, more: Partial<FacetPanelProps> = {}) => {
      stubViewport(true);
      const view = render(<FacetPanel {...props(filter, more)} />);
      fireEvent.click(filtersButton());
      return view;
    };

    it('is absent when the caller passes no covens, or none', () => {
      const { unmount } = open();
      expect(screen.queryByRole('combobox', { name: 'In My Covens' })).toBeNull();
      unmount();
      open({}, { covens: [] });
      expect(screen.queryByRole('combobox', { name: 'In My Covens' })).toBeNull();
    });

    it('lists the viewer’s covens by name, with no counts, after Forms and Toxic', () => {
      open({ covens: [] }, { covens: COVENS });
      const box = screen.getByRole('combobox', { name: 'In My Covens' });
      // Forms, then Toxic, then In My Covens, on their line (the owner's call, 2026-10-23).
      const forms = screen.getByRole('combobox', { name: 'Forms' });
      const toxic = screen.getByRole('group', { name: 'Toxic' });
      expect(forms.compareDocumentPosition(toxic) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(toxic.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      fireEvent.click(box);
      expect(screen.getByRole('option', { name: 'Testhollow' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Testwren' })).toBeInTheDocument();
    });

    it('holds no count placeholder on a picked coven while the live counts are pending', () => {
      // The panel is loading, and Elements (a counted facet) holds its placeholder: the state In My
      // Covens could have taken. It has no counts (decision 10(b)), so it never shows one.
      open({ covens: ['coven-w'], elements: ['water'] }, { covens: COVENS, loading: true });
      const pending = (chipName: string) =>
        screen.getByRole('button', { name: chipName }).closest('li')?.querySelector('.is-pending');
      expect(pending('Remove Element: Water')).not.toBeNull();
      expect(pending('Remove Coven: Testhollow')).toBeNull();
    });

    it('reports a picked coven as a patch of only that part, by id', () => {
      const onChange = vi.fn();
      open({ covens: [] }, { covens: COVENS, onChange });
      fireEvent.click(screen.getByRole('combobox', { name: 'In My Covens' }));
      fireEvent.click(screen.getByRole('option', { name: 'Testwren' }));
      expect(onChange).toHaveBeenCalledWith({ covens: ['coven-v'] });
    });

    it('submits each picked coven as covens=<id>, and counts it on the Filters button', () => {
      const { container } = open({ covens: ['coven-w', 'coven-v'] }, { covens: COVENS });
      const sent = Array.from(
        container.querySelectorAll<HTMLInputElement>('input[type="hidden"][name="covens"]'),
      ).map((input) => input.value);
      expect(sent).toEqual(['coven-w', 'coven-v']);
      expect(filtersButton()).toHaveAccessibleName('Filters 2');
    });

    it('offers In and Not In beside In My Covens, only with covens, on In by default', () => {
      const { unmount } = open();
      expect(screen.queryByRole('group', { name: 'Covens' })).toBeNull();
      unmount();
      open({ covens: [] }, { covens: COVENS });
      const choice = screen.getByRole('group', { name: 'Covens' });
      const box = screen.getByRole('combobox', { name: 'In My Covens' });
      expect(choice.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
      expect(
        within(choice)
          .getAllByRole('radio')
          .map((radio) => radio.getAttribute('value')),
      ).toEqual(['', '1']);
      expect(within(choice).getByRole('radio', { name: 'In' })).toBeChecked();
    });

    it('reports Not In as covensNot: true, and In as covensNot: false', () => {
      const onChange = vi.fn();
      const { unmount } = open({ covens: [] }, { covens: COVENS, onChange });
      fireEvent.click(screen.getByRole('radio', { name: 'Not In' }));
      expect(onChange).toHaveBeenLastCalledWith({ covensNot: true });
      unmount();
      open({ covens: [], covensNot: true }, { covens: COVENS, onChange });
      fireEvent.click(screen.getByRole('radio', { name: 'In' }));
      expect(onChange).toHaveBeenLastCalledWith({ covensNot: false });
    });

    it('switches back to In when the last picked coven is removed under Not In', () => {
      // The panel held as its caller holds it: each patch merged over the filter shown.
      const reported = vi.fn();
      const Held = () => {
        const [filter, setFilter] = useState<FacetPanelFilter>({
          ...NONE,
          covens: ['coven-w'],
          covensNot: true,
        });
        return (
          <FacetPanel
            {...props(filter, {
              covens: COVENS,
              onChange: (patch) => {
                reported(patch);
                setFilter((shown) => ({ ...shown, ...patch }));
              },
            })}
          />
        );
      };
      stubViewport(true);
      render(<Held />);
      fireEvent.click(filtersButton());
      const choice = screen.getByRole('group', { name: 'Covens' });
      // Before: one coven picked, under Not In.
      expect(within(choice).getByRole('radio', { name: 'Not In' })).toBeChecked();
      fireEvent.click(screen.getByRole('button', { name: 'Remove Coven: Testhollow' }));
      expect(reported).toHaveBeenLastCalledWith({ covens: [], covensNot: false });
      expect(within(choice).getByRole('radio', { name: 'In' })).toBeChecked();
      // Not In chosen on purpose with nothing picked still holds: in none of my covens.
      fireEvent.click(within(choice).getByRole('radio', { name: 'Not In' }));
      expect(reported).toHaveBeenLastCalledWith({ covensNot: true });
      expect(within(choice).getByRole('radio', { name: 'Not In' })).toBeChecked();
    });

    it('submits Not In as covensNot=1 through the GET form around it', () => {
      stubViewport(true);
      const { container } = render(
        <form method="get">
          <FacetPanel {...props({ covens: ['coven-w'], covensNot: true }, { covens: COVENS })} />
        </form>,
      );
      const data = new FormData(container.querySelector('form') as HTMLFormElement);
      expect(data.getAll('covensNot')).toEqual(['1']);
      expect(data.getAll('covens')).toEqual(['coven-w']);
    });

    it('counts Not In on the Filters button only when no coven is picked', () => {
      // With covens picked, Not In is a mode of them, as Match is of the categories.
      const { unmount } = open({ covens: ['coven-w'], covensNot: true }, { covens: COVENS });
      expect(filtersButton()).toHaveAccessibleName('Filters 1');
      unmount();
      // With none picked, Not In is a filter of its own: in none of my covens.
      open({ covens: [], covensNot: true }, { covens: COVENS });
      expect(filtersButton()).toHaveAccessibleName('Filters 1');
    });
  });

  describe("the coven's Source, In Stock and Low Stock Only controls (M9.7, M9.8)", () => {
    const COVEN = { source: '', inStock: false, lowStockOnly: false } as const;
    const open = (filter: Partial<FacetPanelFilter> = {}, more: Partial<FacetPanelProps> = {}) => {
      stubViewport(true);
      render(<FacetPanel {...props(filter, more)} />);
      fireEvent.click(filtersButton());
    };

    it('shows neither on a panel whose caller passes neither', () => {
      open();
      expect(screen.queryByRole('group', { name: 'Source' })).toBeNull();
      expect(screen.queryByRole('switch', { name: 'In Stock' })).toBeNull();
      expect(screen.queryByRole('switch', { name: 'Low Stock Only' })).toBeNull();
    });

    const counted: Partial<FacetPanelProps> = {
      facets: {
        ...FACETS,
        source: [
          { value: 'local', label: 'Local', count: 4 },
          { value: 'compendium', label: 'Compendium', count: 2 },
        ],
        inStock: 3,
        lowStockOnly: 2,
      },
    };

    it('offers Source as All, Local and Compendium, on All by default', () => {
      open(COVEN);
      const source = screen.getByRole('group', { name: 'Source' });
      expect(
        within(source)
          .getAllByRole('radio')
          .map((radio) => radio.getAttribute('value')),
      ).toEqual(['', 'local', 'compendium']);
      expect(within(source).getByRole('radio', { name: 'All' })).toBeChecked();
    });

    it('carries each count in the option and switch names, All and the Toxic strip as they were', () => {
      open(COVEN, counted);
      const source = screen.getByRole('group', { name: 'Source' });
      expect(within(source).getByRole('radio', { name: /^Local 4/ })).toBeInTheDocument();
      expect(within(source).getByRole('radio', { name: /^Compendium 2/ })).toBeInTheDocument();
      expect(within(source).getByRole('radio', { name: 'All' })).toBeInTheDocument();
      expect(screen.getByRole('switch', { name: 'In Stock 3' })).toBeInTheDocument();
      expect(screen.getByRole('switch', { name: 'Low Stock Only 2' })).toBeInTheDocument();
    });

    it('reports a chosen counted source and switch as a patch of only that part', () => {
      const onChange = vi.fn();
      open(COVEN, { ...counted, onChange });

      fireEvent.click(screen.getByRole('radio', { name: /^Local/ }));
      expect(onChange).toHaveBeenLastCalledWith({ source: 'local' });
      fireEvent.click(screen.getByRole('switch', { name: /^In Stock/ }));
      expect(onChange).toHaveBeenLastCalledWith({ inStock: true });
      fireEvent.click(screen.getByRole('switch', { name: /^Low Stock Only/ }));
      expect(onChange).toHaveBeenLastCalledWith({ lowStockOnly: true });
    });

    it('reports a chosen source and the switch as a patch of only that part', () => {
      const onChange = vi.fn();
      open(COVEN, { onChange });

      fireEvent.click(screen.getByRole('radio', { name: /^Local/ }));
      expect(onChange).toHaveBeenLastCalledWith({ source: 'local' });
      fireEvent.click(screen.getByRole('radio', { name: 'Compendium' }));
      expect(onChange).toHaveBeenLastCalledWith({ source: 'compendium' });

      fireEvent.click(screen.getByRole('switch', { name: 'In Stock' }));
      expect(onChange).toHaveBeenLastCalledWith({ inStock: true });
      fireEvent.click(screen.getByRole('switch', { name: 'Low Stock Only' }));
      expect(onChange).toHaveBeenLastCalledWith({ lowStockOnly: true });
    });

    it('shows what is held', () => {
      open({ source: 'local', inStock: true, lowStockOnly: true });
      expect(screen.getByRole('radio', { name: /^Local/ })).toBeChecked();
      expect(screen.getByRole('switch', { name: 'In Stock' })).toBeChecked();
      expect(screen.getByRole('switch', { name: 'Low Stock Only' })).toBeChecked();
    });

    it('counts a chosen source and the switch on the Filters button', () => {
      stubViewport(true);
      const { rerender } = render(<FacetPanel {...props(COVEN)} />);
      expect(filtersButton()).toHaveAccessibleName('Filters');
      rerender(<FacetPanel {...props({ source: 'compendium', inStock: true })} />);
      expect(filtersButton()).toHaveAccessibleName('Filters 2');
      rerender(<FacetPanel {...props({ ...COVEN, lowStockOnly: true })} />);
      expect(filtersButton()).toHaveAccessibleName('Filters 1');
    });

    it('submits through the GET form around it, as source=local, inStock=1 and lowStockOnly=1', () => {
      stubViewport(true);
      const { container } = render(
        <form method="get">
          <FacetPanel {...props({ source: 'local', inStock: true, lowStockOnly: true })} />
        </form>,
      );
      const data = new FormData(container.querySelector('form') as HTMLFormElement);
      expect(data.getAll('source')).toEqual(['local']);
      expect(data.getAll('inStock')).toEqual(['1']);
      expect(data.getAll('lowStockOnly')).toEqual(['1']);
    });
  });

  describe('the Toxic field when a count is zero', () => {
    const withToxic = (
      toxic: CompendiumFacetCounts['toxic'],
      filter: Partial<FacetPanelFilter> = {},
    ) => {
      stubViewport(true);
      render(<FacetPanel {...props(filter, { facets: { ...FACETS, toxic } })} />);
      fireEvent.click(filtersButton());
    };
    const group = () => screen.getByRole('group', { name: /^Toxic/ });

    it('rests the chip on Any, disables the group and carries a hint when Toxic is zero', () => {
      withToxic([
        { value: 'toxic', label: 'Toxic', count: 0 },
        { value: 'not_toxic', label: 'Not Toxic', count: 9 },
      ]);
      // The chip rests on Any and does not open, so it holds no radios while stuck.
      const chip = within(group()).getByRole('button', { name: /Any/ });
      expect(chip).toBeDisabled();
      expect(chip.closest('fieldset')).toHaveAccessibleDescription();
      expect(within(group()).queryByRole('radio')).toBeNull();
    });

    it('does the same when Not Toxic is zero, even if it was the chosen value', () => {
      withToxic(
        [
          { value: 'toxic', label: 'Toxic', count: 4 },
          { value: 'not_toxic', label: 'Not Toxic', count: 0 },
        ],
        { toxic: 'not_toxic' },
      );
      const chip = within(group()).getByRole('button', { name: /Any/ });
      expect(chip).toBeDisabled();
      expect(chip.closest('fieldset')).toHaveAccessibleDescription();
    });

    it('opens the hint when the pointer rests on the disabled chip itself', async () => {
      withToxic([
        { value: 'toxic', label: 'Toxic', count: 0 },
        { value: 'not_toxic', label: 'Not Toxic', count: 9 },
      ]);
      const chip = within(group()).getByRole('button', { name: /Any/ });
      const bubble = () =>
        document.getElementById(
          chip.closest('fieldset')?.getAttribute('aria-describedby') ?? '',
        ) as HTMLElement;
      expect(bubble()).toHaveAttribute('aria-hidden', 'true');
      fireEvent.mouseEnter(chip);
      await waitFor(() => expect(bubble()).toHaveAttribute('aria-hidden', 'false'));
    });

    it('is enabled, with no hint, when both counts are above zero', () => {
      withToxic(FACETS.toxic);
      expect(within(group()).queryByRole('button', { name: /(Any|All)/ })).toBeNull();
    });
  });

  describe('the Source field when a count is zero', () => {
    const withSource = (
      source: NonNullable<CompendiumFacetCounts['source']>,
      filter: Partial<FacetPanelFilter> = {},
    ) => {
      stubViewport(true);
      render(
        <form method="get">
          <FacetPanel
            {...props({ source: '', inStock: false, ...filter }, { facets: { ...FACETS, source } })}
          />
        </form>,
      );
      fireEvent.click(filtersButton());
    };
    const group = () => screen.getByRole('group', { name: /^Source/ });
    const submitted = () =>
      new FormData(document.querySelector('form') as HTMLFormElement).getAll('source');

    it('rests the chip on All, disables the group and carries a hint when Compendium is zero', () => {
      withSource([
        { value: 'local', label: 'Local', count: 6 },
        { value: 'compendium', label: 'Compendium', count: 0 },
      ]);
      const chip = within(group()).getByRole('button', { name: /All/ });
      expect(chip).toBeDisabled();
      expect(chip.closest('fieldset')).toHaveAccessibleDescription();
      expect(within(group()).queryByRole('radio')).toBeNull();
    });

    it('does the same when Local is zero, and submits nothing for a held source', () => {
      withSource(
        [
          { value: 'local', label: 'Local', count: 0 },
          { value: 'compendium', label: 'Compendium', count: 4 },
        ],
        { source: 'local' },
      );
      const chip = within(group()).getByRole('button', { name: /All/ });
      expect(chip).toBeDisabled();
      expect(chip.closest('fieldset')).toHaveAccessibleDescription();
      expect(submitted()).toEqual([]);
    });

    it('is enabled, with no hint, when both counts are above zero', () => {
      withSource([
        { value: 'local', label: 'Local', count: 6 },
        { value: 'compendium', label: 'Compendium', count: 3 },
      ]);
      expect(within(group()).queryByRole('button', { name: /(Any|All)/ })).toBeNull();
    });

    it('opens the hint when the pointer rests on the disabled chip itself', async () => {
      withSource([
        { value: 'local', label: 'Local', count: 6 },
        { value: 'compendium', label: 'Compendium', count: 0 },
      ]);
      const chip = within(group()).getByRole('button', { name: /All/ });
      const bubble = () =>
        document.getElementById(
          chip.closest('fieldset')?.getAttribute('aria-describedby') ?? '',
        ) as HTMLElement;
      expect(bubble()).toHaveAttribute('aria-hidden', 'true');
      fireEvent.mouseEnter(chip);
      await waitFor(() => expect(bubble()).toHaveAttribute('aria-hidden', 'false'));
    });
  });

  it('reports a changed Toxic choice and No Refs as a patch of only that part', () => {
    stubViewport(true);
    const onChange = vi.fn();
    render(<FacetPanel {...props({}, { admin: true, onChange })} />);
    fireEvent.click(filtersButton());

    fireEvent.click(screen.getByRole('radio', { name: /^Toxic 2/ }));
    expect(onChange).toHaveBeenLastCalledWith({ toxic: 'toxic' });

    fireEvent.click(screen.getByRole('switch', { name: /^No Refs/ }));
    expect(onChange).toHaveBeenLastCalledWith({ withoutReferences: true });
  });

  it('offers No Form with its count to an admin only, and reports it as a patch of its own', () => {
    stubViewport(true);
    const onChange = vi.fn();
    const { unmount } = render(<FacetPanel {...props({}, { admin: true, onChange })} />);
    fireEvent.click(filtersButton());

    fireEvent.click(screen.getByRole('switch', { name: /^No Form 2/ }));
    expect(onChange).toHaveBeenLastCalledWith({ withoutForms: true });
    unmount();

    render(<FacetPanel {...props({})} />);
    fireEvent.click(filtersButton());
    expect(screen.queryByRole('switch', { name: /^No Form/ })).toBeNull();
  });

  describe("the admin's Reviewed strip (M14.8)", () => {
    const REVIEWED: CompendiumFacetCounts['reviewed'] = [
      { value: 'reviewed', label: 'Reviewed', count: 4 },
      { value: 'needs_review', label: 'Needs Review', count: 7 },
    ];
    const openAdmin = (
      filter: Partial<FacetPanelFilter> = { reviewed: '' },
      more: Partial<FacetPanelProps> = {},
    ) => {
      stubViewport(true);
      render(
        <FacetPanel
          {...props(filter, { admin: true, facets: { ...FACETS, reviewed: REVIEWED }, ...more })}
        />,
      );
      fireEvent.click(filtersButton());
    };
    const group = () => screen.getByRole('group', { name: /^Reviewed/ });

    it('offers Any, Reviewed and Needs Review with their counts, on Any by default', () => {
      openAdmin();
      expect(within(group()).getByRole('radio', { name: 'Any' })).toBeChecked();
      expect(within(group()).getByRole('radio', { name: 'Reviewed 4' })).toBeInTheDocument();
      expect(within(group()).getByRole('radio', { name: 'Needs Review 7' })).toBeInTheDocument();
    });

    it('is shown to an admin panel alone, and only once the review counts are read', () => {
      stubViewport(true);
      const { rerender } = render(
        <FacetPanel {...props({ reviewed: '' }, { facets: { ...FACETS, reviewed: REVIEWED } })} />,
      );
      fireEvent.click(filtersButton());
      // Not an admin panel, though it was handed the setting and the counts.
      expect(screen.queryByRole('group', { name: /^Reviewed/ })).toBeNull();
      // An admin panel without the counts, which the service gives a curator alone.
      rerender(<FacetPanel {...props({ reviewed: '' }, { admin: true })} />);
      expect(screen.queryByRole('group', { name: /^Reviewed/ })).toBeNull();
      rerender(
        <FacetPanel
          {...props({ reviewed: '' }, { admin: true, facets: { ...FACETS, reviewed: REVIEWED } })}
        />,
      );
      expect(group()).toBeInTheDocument();
    });

    it('reports each choice as a patch of only that part', () => {
      const onChange = vi.fn();
      openAdmin({ reviewed: '' }, { onChange });
      fireEvent.click(within(group()).getByRole('radio', { name: 'Needs Review 7' }));
      expect(onChange).toHaveBeenLastCalledWith({ reviewed: 'needs_review' });
      fireEvent.click(within(group()).getByRole('radio', { name: 'Reviewed 4' }));
      expect(onChange).toHaveBeenLastCalledWith({ reviewed: 'reviewed' });
    });

    it('counts a chosen setting on the Filters button', () => {
      openAdmin({ reviewed: 'needs_review' });
      expect(filtersButton()).toHaveAccessibleName('Filters 1');
    });

    it('submits through the GET form around it in the address spelling, reviewed=0', () => {
      stubViewport(true);
      const { container } = render(
        <form method="get">
          <FacetPanel
            {...props(
              { reviewed: 'needs_review' },
              { admin: true, facets: { ...FACETS, reviewed: REVIEWED } },
            )}
          />
        </form>,
      );
      const data = new FormData(container.querySelector('form') as HTMLFormElement);
      expect(data.getAll('reviewed')).toEqual(['0']);
    });

    it('rests on Any, disabled with a hint, when every matching entry has the same mark', () => {
      openAdmin(
        { reviewed: 'reviewed' },
        {
          facets: {
            ...FACETS,
            reviewed: [
              { value: 'reviewed', label: 'Reviewed', count: 4 },
              { value: 'needs_review', label: 'Needs Review', count: 0 },
            ],
          },
        },
      );
      const chip = within(group()).getByRole('button', { name: /Any/ });
      expect(chip).toBeDisabled();
      expect(chip.closest('fieldset')).toHaveAccessibleDescription();
    });
  });

  it('renders inline and open before hydration, every control present, with Filters a link to the panel', () => {
    const markup = renderToString(<FacetPanel {...props({ forms: ['test-oil'] })} />);
    const host = document.createElement('div');
    host.innerHTML = markup;

    const panel = host.querySelector('dialog') as HTMLDialogElement;
    expect(panel.hasAttribute('open')).toBe(true);
    const link = host.querySelector(`a[href="#${panel.id}"]`);
    expect(link).not.toBeNull();
    expect(host.firstElementChild?.tagName).toBe('A');
    expect(panel.querySelector('button[type="submit"]')).not.toBeNull();
    expect(panel.querySelector('select[name="forms"], input[name="forms"]')).not.toBeNull();
    expect(panel.querySelector('input[name="toxic"]')).not.toBeNull();
  });
});

// The phone sheet slides in from the right and out to it, and waits out the slide before it
// closes; the desktop slide and reduced motion are untouched.
describe('FacetPanel phone sheet slide', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const transitionEnd = (propertyName: string) => {
    const end = new Event('transitionend', { bubbles: true });
    Object.defineProperty(end, 'propertyName', { value: propertyName });
    fireEvent(dialog(), end);
  };
  const slideEnd = () => transitionEnd('transform');
  const closeButton = () => screen.getAllByRole('button', { name: 'Close' })[0]!;

  it('holds the sheet open, leaving, until the slide ends, then closes and applies once', () => {
    stubViewport(false, false);
    const onApply = vi.fn();
    render(<FacetPanel {...props({}, { onApply })} />);
    fireEvent.click(filtersButton());

    fireEvent.click(closeButton());

    expect(dialog()).toHaveAttribute('open');
    expect(onApply).toHaveBeenCalledTimes(1);

    slideEnd();

    expect(dialog()).not.toHaveAttribute('open');
    expect(filtersButton()).toHaveAttribute('aria-expanded', 'false');
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('applies once however many times it is asked to shut during the slide', () => {
    stubViewport(false, false);
    const onApply = vi.fn();
    render(<FacetPanel {...props({}, { onApply })} />);
    fireEvent.click(filtersButton());

    fireEvent.click(closeButton());
    fireEvent.pointerDown(dialog());
    fireEvent.click(closeButton());
    slideEnd();
    fireEvent(dialog(), new Event('close'));

    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('closes after a limit when the browser never reports the end of the slide', () => {
    vi.useFakeTimers();
    stubViewport(false, false);
    render(<FacetPanel {...props()} />);
    fireEvent.click(filtersButton());
    fireEvent.click(closeButton());
    expect(dialog()).toHaveAttribute('open');

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(dialog()).not.toHaveAttribute('open');
  });

  // The backdrop's fade ends on the dialog too, and sooner than the sheet's slide.
  it('stays open when only the backdrop fade ends', () => {
    stubViewport(false, false);
    render(<FacetPanel {...props()} />);
    fireEvent.click(filtersButton());
    fireEvent.click(closeButton());

    transitionEnd('opacity');

    expect(dialog()).toHaveAttribute('open');
  });

  it('takes the sheet own Escape through the slide rather than closing at once', () => {
    stubViewport(false, false);
    render(<FacetPanel {...props()} />);
    fireEvent.click(filtersButton());

    const cancel = new Event('cancel', { cancelable: true });
    fireEvent(dialog(), cancel);

    expect(cancel.defaultPrevented).toBe(true);
    expect(dialog()).toHaveAttribute('open');
    slideEnd();
    expect(dialog()).not.toHaveAttribute('open');
  });

  it('closes at once under reduced motion', () => {
    stubViewport(false, true);
    const onApply = vi.fn();
    render(<FacetPanel {...props({}, { onApply })} />);
    fireEvent.click(filtersButton());

    fireEvent.click(closeButton());

    expect(dialog()).not.toHaveAttribute('open');
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('snaps shut with no slide when the width crosses the tablet width', () => {
    const listeners = stubViewport(false, false);
    render(<FacetPanel {...props()} />);
    fireEvent.click(filtersButton());

    act(() => listeners.forEach((listener) => listener()));

    expect(dialog()).not.toHaveAttribute('open');
  });
});

describe('FacetPanel width', () => {
  it('opens as a sheet below the width the stylesheet draws it as one', () => {
    const scss = readFileSync('src/scss/_variables.scss', 'utf8');
    const tablet = /^\$shell-tablet-width:\s*([\d.]+rem);/m.exec(scss)?.[1];
    expect(WIDE).toBe(`(min-width: ${tablet})`);
  });
});
