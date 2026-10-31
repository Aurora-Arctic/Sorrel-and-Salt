import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { CompendiumFacetCounts } from '../CompendiumList/types';
import FacetPanel, { WIDE } from '.';
import type { FacetPanelFilter } from './types';

// Render-only; behaviour is asserted in tests/components/FacetPanel. A change is held
// until Apply Filters or a close, and marks the chips "loading" briefly. Counts are
// fixed. Narrow the preview below the tablet width for the modal sheet.
const meta = {
  title: 'Forms / Facet Panel',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: ReactNode }>;

const WARDING = { id: 'g1', name: 'Protective', colorDark: '#50a58e', colorLight: '#1d755d' };
const MENDING = { id: 'g2', name: 'Restorative', colorDark: '#b98ac9', colorLight: '#7a4b8f' };

const FACETS: CompendiumFacetCounts = {
  forms: [
    { value: 'test-oil', label: 'Test Oil', count: 12, icon: null },
    { value: 'test-leaf', label: 'Test Leaf', count: 9, icon: null },
    { value: 'test-resin', label: 'Test Resin', count: 3, icon: null },
    { value: 'test-bark', label: 'Test Bark', count: 0, icon: null },
  ],
  deities: [
    { value: 'testa-fixtura', label: 'Testa', count: 6, tradition: 'Fixtura' },
    { value: 'probus-fixtura', label: 'Probus', count: 2, tradition: 'Fixtura' },
    { value: 'mockra-exempla', label: 'Mockra', count: 4, tradition: 'Exempla' },
  ],
  categories: [
    { value: 'warding', label: 'Testwarding', count: 14, group: WARDING },
    { value: 'shielding', label: 'Testshielding', count: 5, group: WARDING },
    { value: 'mending', label: 'Testmending', count: 8, group: MENDING },
    { value: 'soothing', label: 'Testsoothing', count: 0, group: MENDING },
  ],
  zodiac: [
    { value: 'test-ram', label: 'Test Ram', count: 4 },
    { value: 'test-crab', label: 'Test Crab', count: 7 },
    { value: 'test-scales', label: 'Test Scales', count: 0 },
  ],
  celestialBodies: [
    { value: 'test-sun', label: 'Test Sun', count: 10 },
    { value: 'test-moon', label: 'Test Moon', count: 6 },
  ],
  elements: [
    { value: 'fire', label: 'Fire', count: 5 },
    { value: 'water', label: 'Water', count: 11 },
    { value: 'earth', label: 'Earth', count: 0 },
  ],
  toxic: [
    { value: 'toxic', label: 'Toxic', count: 4 },
    { value: 'not_toxic', label: 'Not Toxic', count: 21 },
  ],
  withoutReferences: 7,
  withoutForms: 4,
};

// The coven's counts: Source's two values (one at zero), In Stock and Low Stock Only.
const COVEN_FACETS: CompendiumFacetCounts = {
  ...FACETS,
  source: [
    { value: 'local', label: 'Local', count: 18 },
    { value: 'compendium', label: 'Compendium', count: 7 },
  ],
  inStock: 9,
  lowStockOnly: 4,
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

function Panel({
  start = NONE,
  admin = false,
  facets = FACETS,
  open = true,
  menu,
  covens,
}: {
  start?: FacetPanelFilter;
  admin?: boolean;
  facets?: CompendiumFacetCounts;
  /** Open on desktop widths as the story loads, so the layout is seen without a click. */
  open?: boolean;
  /** The chip whose menu is opened once the panel is, so the menu is seen without a click. */
  menu?: string;
  /** The viewer's covens, for the In My Covens field. */
  covens?: readonly { id: string; name: string }[];
}) {
  const [filter, setFilter] = useState(start);
  const [loading, setLoading] = useState(false);
  const timer = useRef(0);
  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  // Press Filters once hydrated, on the wide layout only (below it the sheet is modal).
  useEffect(() => {
    if (!open || !window.matchMedia(WIDE).matches) return;
    const button = frame.current?.querySelector<HTMLButtonElement>('.facet-panel__button');
    if (button && button.getAttribute('aria-expanded') !== 'true') button.click();
    if (!menu) return undefined;
    const wait = window.setTimeout(() => {
      const chips = frame.current?.querySelectorAll<HTMLElement>('.facet-chip__summary') ?? [];
      [...chips].find((chip) => chip.textContent?.startsWith(`${menu}:`))?.click();
    }, 500);
    return () => window.clearTimeout(wait);
  }, [open, menu]);
  return (
    <div ref={frame} style={{ minHeight: '34rem' }}>
      {/* The anchor the panel opens under, as the list's filter form is. */}
      <form
        onSubmit={(event) => event.preventDefault()}
        style={{ position: 'relative', display: 'flex', gap: '1rem', alignItems: 'center' }}
      >
        <FacetPanel
          facets={facets}
          filter={filter}
          admin={admin}
          covens={covens}
          loading={loading}
          clearHref="#clear"
          onClear={() => setFilter(NONE)}
          onChange={(patch) => {
            setFilter((now) => ({ ...now, ...patch }));
            setLoading(true);
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => setLoading(false), 1500);
          }}
        />
      </form>
      <p>The results sit here, and do not move when the panel opens.</p>
    </div>
  );
}

// Nothing chosen: Filters alone, no Clear All.
const defaultNode = <Panel open={false} />;

// The public compendium's panel: Categories with Match at its right, Forms with Toxic, and no
// Source, In Stock or No Refs. Open on desktop.
const publicNode = <Panel />;

// Chosen values: the count on the button (every chosen value, so seven here; Match counts
// none), Clear All beside it, Match with its hint for two categories.
const chosenNode = (
  <Panel
    start={{
      ...NONE,
      categories: ['warding', 'mending'],
      forms: ['test-oil', 'test-resin'],
      deities: ['testa-fixtura'],
      elements: ['water'],
      toxic: 'not_toxic',
    }}
  />
);

// Two forms and Toxic: the Filters button reads 3, one for each chosen value.
const formsAndToxicNode = (
  <Panel start={{ ...NONE, forms: ['test-oil', 'test-resin'], toxic: 'toxic' }} />
);

// Two categories alone: Match appears, with its hint, and adds nothing to the Filters count.
const matchShownNode = (
  <Panel start={{ ...NONE, categories: ['warding', 'mending'], categoryMode: 'any' }} />
);

// A facet whose every value counts nothing keeps its field, with an empty list.
const allZeroFacetNode = (
  <Panel
    facets={{
      ...FACETS,
      celestialBodies: FACETS.celestialBodies.map((choice) => ({ ...choice, count: 0 })),
    }}
  />
);

// Fewer than two categories: the Match chip stays, on All, disabled and dashed, its hint saying
// when it applies.
const matchStuckNode = <Panel start={{ ...NONE, categories: ['warding'] }} />;

// Either Toxic value counting nothing: every matching entry shares one toxicity, so the
// chip rests on Any, is disabled, and says why in its hint.
const toxicStuckNode = (
  <Panel
    start={{ ...NONE, toxic: 'toxic' }}
    facets={{
      ...FACETS,
      toxic: [
        { value: 'toxic', label: 'Toxic', count: 0 },
        { value: 'not_toxic', label: 'Not Toxic', count: 21 },
      ],
    }}
  />
);

// Either source counting nothing: every matching entry comes from the other, so the chip rests
// on All, is disabled, and says why when the pointer or focus is on it.
const sourceStuckNode = (
  <Panel
    facets={{
      ...COVEN_FACETS,
      source: [
        { value: 'local', label: 'Local', count: 18 },
        { value: 'compendium', label: 'Compendium', count: 0 },
      ],
    }}
    start={{ ...NONE, source: 'local', inStock: false }}
  />
);

// The admin list also has the No Refs switch, after Toxic on the Forms row.
const adminNode = <Panel admin start={{ ...NONE, withoutReferences: true }} />;

// The coven's list adds a Source chip and the In Stock and Low Stock Only
// switches on the Forms row. Their values count on the Filters button (3 here).
const covenNode = (
  <Panel
    facets={COVEN_FACETS}
    start={{ ...NONE, source: 'local', inStock: true, lowStockOnly: true }}
  />
);

// The coven's controls with nothing chosen: Source rests on All and the switch is off.
const covenEmptyNode = (
  <Panel facets={COVEN_FACETS} start={{ ...NONE, source: '', inStock: false }} />
);

// The Match chip open, two categories chosen: the menu of radios fades in under the chip.
const matchMenuNode = (
  <Panel
    menu="Match"
    start={{ ...NONE, categories: ['warding', 'mending'], categoryMode: 'any' }}
  />
);

// The coven's Source chip open: Local and Compendium with their counts, no brackets.
const sourceMenuNode = (
  <Panel
    menu="Source"
    facets={COVEN_FACETS}
    start={{ ...NONE, source: 'local', inStock: true, lowStockOnly: true }}
  />
);

// The admin's Toxic chip open, with No Refs on the same row.
const toxicMenuNode = <Panel menu="Toxic" admin start={NONE} />;

// A signed-in viewer in two covens: In My Covens beside Forms and Toxic, each half the line,
// one coven picked. The covens carry no counts.
const inMyCovensNode = (
  <Panel
    covens={[
      { id: 'coven-one', name: 'Test Coven One' },
      { id: 'coven-two', name: 'Test Coven Two' },
    ]}
    start={{ ...NONE, covens: ['coven-one'] }}
  />
);

// The admin's Reviewed strip, on Needs Review: Reviewed and Needs Review with their counts.
const adminReviewedNode = (
  <Panel
    admin
    facets={{
      ...FACETS,
      reviewed: [
        { value: 'reviewed', label: 'Reviewed', count: 15 },
        { value: 'needs_review', label: 'Needs Review', count: 10 },
      ],
    }}
    start={{ ...NONE, reviewed: 'needs_review' }}
  />
);

const STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  Public: publicNode,
  Chosen: chosenNode,
  'Forms And Toxic': formsAndToxicNode,
  'Match Shown': matchShownNode,
  'All Zero Facet': allZeroFacetNode,
  'Match Stuck': matchStuckNode,
  'Toxic Stuck': toxicStuckNode,
  'Source Stuck': sourceStuckNode,
  Admin: adminNode,
  Coven: covenNode,
  'Coven Empty': covenEmptyNode,
  'Match Menu': matchMenuNode,
  'Source Menu': sourceMenuNode,
  'Toxic Menu': toxicMenuNode,
  'In My Covens': inMyCovensNode,
  'Admin Reviewed': adminReviewedNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div>{state}</div>,
};
