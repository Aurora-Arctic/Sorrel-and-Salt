import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FacetPanel from '@/components/FacetPanel';
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
  planets: [{ value: 'test-sun', label: 'Test Sun', count: 3 }],
  elements: [
    { value: 'water', label: 'Water', count: 7 },
    { value: 'fire', label: 'Fire', count: 0 },
  ],
  toxic: [
    { value: 'toxic', label: 'Toxic', count: 2 },
    { value: 'not_toxic', label: 'Not Toxic', count: 9 },
  ],
  withoutReferences: 3,
};

const NONE: FacetPanelFilter = {
  categories: [],
  categoryMode: 'all',
  forms: [],
  deities: [],
  zodiac: [],
  planets: [],
  elements: [],
  toxic: '',
  withoutReferences: false,
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
    expect(filtersButton()).toHaveAccessibleName('Filters (5)');
  });

  it('offers Clear All beside the button only while something is chosen', () => {
    stubViewport(true);
    const { rerender } = render(<FacetPanel {...props()} />);
    expect(screen.queryByRole('link', { name: 'Clear All' })).toBeNull();

    rerender(<FacetPanel {...props({ planets: ['test-sun'] })} />);
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
          planets: ['test-sun'],
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
    expect(sent('planets')).toEqual(['test-sun']);
    expect(sent('elements')).toEqual(['water']);
    expect(sent('toxic')).toEqual(['not_toxic']);
    expect(sent('categoryMode')).toEqual(['any']);
  });

  it('keeps Match below two categories, on All, disabled and with a hint, and enables it at two', () => {
    stubViewport(true);
    const { rerender } = render(
      <FacetPanel {...props({ categories: ['warding'], categoryMode: 'any' })} />,
    );
    fireEvent.click(filtersButton());
    const match = () => screen.getByRole('group', { name: 'Match' });
    // The held mode is Any, so All being checked is the stuck state and not the stored value.
    expect(within(match()).getByRole('radio', { name: 'All' })).toBeChecked();
    expect(match()).toBeDisabled();
    expect(match()).toHaveAccessibleDescription();

    rerender(
      <FacetPanel {...props({ categories: ['warding', 'mending'], categoryMode: 'any' })} />,
    );
    expect(match()).toBeEnabled();
    expect(within(match()).getByRole('radio', { name: 'Any' })).toBeChecked();
  });

  it('shows No Refs to an admin only', () => {
    stubViewport(true);
    const { rerender } = render(<FacetPanel {...props()} />);
    fireEvent.click(filtersButton());
    expect(screen.queryByRole('switch', { name: /^No Refs/ })).toBeNull();

    rerender(<FacetPanel {...props({}, { admin: true })} />);
    expect(screen.getByRole('switch', { name: /^No Refs/ })).toBeInTheDocument();
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

    it('keeps all three segments, disables the group on Any and carries a hint when Toxic is zero', () => {
      withToxic([
        { value: 'toxic', label: 'Toxic', count: 0 },
        { value: 'not_toxic', label: 'Not Toxic', count: 9 },
      ]);
      expect(within(group()).getAllByRole('radio')).toHaveLength(3);
      expect(screen.getByRole('radio', { name: /^Toxic \(0\)/ })).toBeInTheDocument();
      expect(within(group()).getByRole('radio', { name: /^Any/ })).toBeChecked();
      expect(group()).toBeDisabled();
      expect(group()).toHaveAccessibleDescription();
    });

    it('does the same when Not Toxic is zero, even if it was the chosen value', () => {
      withToxic(
        [
          { value: 'toxic', label: 'Toxic', count: 4 },
          { value: 'not_toxic', label: 'Not Toxic', count: 0 },
        ],
        { toxic: 'not_toxic' },
      );
      expect(screen.getByRole('radio', { name: /^Not Toxic \(0\)/ })).toBeInTheDocument();
      expect(within(group()).getByRole('radio', { name: /^Any/ })).toBeChecked();
      expect(group()).toBeDisabled();
    });

    it('is enabled, with no hint, when both counts are above zero', () => {
      withToxic(FACETS.toxic);
      expect(group()).toBeEnabled();
      expect(group()).not.toHaveAccessibleDescription();
    });
  });

  it('reports a changed Toxic choice and No Refs as a patch of only that part', () => {
    stubViewport(true);
    const onChange = vi.fn();
    render(<FacetPanel {...props({}, { admin: true, onChange })} />);
    fireEvent.click(filtersButton());

    fireEvent.click(screen.getByRole('radio', { name: /^Toxic \(2\)/ }));
    expect(onChange).toHaveBeenLastCalledWith({ toxic: 'toxic' });

    fireEvent.click(screen.getByRole('switch', { name: /^No Refs/ }));
    expect(onChange).toHaveBeenLastCalledWith({ withoutReferences: true });
  });

  it('renders inline and open before hydration, every control present, with Filters a link to the panel', () => {
    const markup = renderToString(<FacetPanel {...props({ forms: ['test-oil'] })} />);
    const host = document.createElement('div');
    host.innerHTML = markup;

    const panel = host.querySelector('dialog') as HTMLDialogElement;
    expect(panel.hasAttribute('open')).toBe(true);
    // The class the stylesheet hides under the document's script mark until hydration takes over.
    expect(panel.classList.contains('facet-panel--static')).toBe(true);
    const link = host.querySelector(`a[href="#${panel.id}"]`);
    expect(link).not.toBeNull();
    expect(host.firstElementChild?.tagName).toBe('A');
    expect(panel.querySelector('button[type="submit"]')).not.toBeNull();
    expect(panel.querySelector('select[name="forms"], input[name="forms"]')).not.toBeNull();
    expect(panel.querySelector('input[name="toxic"]')).not.toBeNull();
  });
});
