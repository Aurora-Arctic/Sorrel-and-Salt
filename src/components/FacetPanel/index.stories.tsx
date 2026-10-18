import type { Story } from '@ladle/react';
import { useEffect, useRef, useState } from 'react';
import type { CompendiumFacetCounts } from '../CompendiumList/types';
import FacetPanel from '.';
import type { FacetPanelFilter } from './types';

// Render-only; behaviour is asserted in tests/components/FacetPanel. Invented values (M12.4).
// A change is held, not applied (the list's page holds it until Apply Filters or a close),
// and marks the chips "loading" for a moment, as the live counts on their way do. The
// counts themselves do not follow the choices; they are fixed here. A value counting
// nothing is left out of its list unless chosen. Narrow the preview below the tablet
// width for the modal sheet.
export default {
  title: 'Admin / Facet Panel',
};

const WARDING = { id: 'g1', name: 'Protective', colorDark: '#2f6b4f', colorLight: '#b7dfc9' };
const MENDING = { id: 'g2', name: 'Restorative', colorDark: '#7a4b8f', colorLight: '#dcc6e8' };

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
  planets: [
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
};

// The coven's counts: Source's two values, one at zero as Toxic's may be, and the In Stock count.
const COVEN_FACETS: CompendiumFacetCounts = {
  ...FACETS,
  source: [
    { value: 'local', label: 'Local', count: 18 },
    { value: 'compendium', label: 'Compendium', count: 0 },
  ],
  inStock: 9,
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

function Panel({
  start = NONE,
  admin = false,
  facets = FACETS,
  className,
  open = true,
}: {
  start?: FacetPanelFilter;
  admin?: boolean;
  facets?: CompendiumFacetCounts;
  className?: string;
  /** Open on desktop widths as the story loads, so the layout is seen without a click. */
  open?: boolean;
}) {
  const [filter, setFilter] = useState(start);
  const [loading, setLoading] = useState(false);
  const timer = useRef(0);
  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  // Press Filters once hydrated, on the wide layout only (below it the sheet is modal).
  useEffect(() => {
    if (!open || !window.matchMedia('(min-width: 56rem)').matches) return;
    const button = frame.current?.querySelector<HTMLButtonElement>('.facet-panel__button');
    if (button && button.getAttribute('aria-expanded') !== 'true') button.click();
  }, [open]);
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
          className={className}
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
export const Empty: Story = () => <Panel open={false} />;

// The public compendium's panel: no Source, no In Stock, no No Refs, and no counts for them.
// Open on desktop.
export const Public: Story = () => <Panel />;

// Chosen values: the count on the button (every chosen value, so seven here; Match counts
// none), Clear All beside it, Match with its hint for two categories.
export const Chosen: Story = () => (
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
export const FormsAndToxic: Story = () => (
  <Panel start={{ ...NONE, forms: ['test-oil', 'test-resin'], toxic: 'toxic' }} />
);

// Two categories alone: Match appears, with its hint, and adds nothing to the Filters count.
export const MatchShown: Story = () => (
  <Panel start={{ ...NONE, categories: ['warding', 'mending'], categoryMode: 'any' }} />
);

// A facet whose every value counts nothing keeps its field, with an empty list.
export const AllZeroFacet: Story = () => (
  <Panel
    facets={{
      ...FACETS,
      planets: FACETS.planets.map((choice) => ({ ...choice, count: 0 })),
    }}
  />
);

// Fewer than two categories: Match stays, on All, disabled and dashed, its hint saying when it
// applies.
export const MatchStuck: Story = () => <Panel start={{ ...NONE, categories: ['warding'] }} />;

// Either Toxic value counting nothing: every matching entry shares one toxicity, so the
// group rests on Any, is disabled, and says why in its hint.
export const ToxicStuck: Story = () => (
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

// The admin list also has the No Refs switch.
export const Admin: Story = () => <Panel admin start={{ ...NONE, withoutReferences: true }} />;

// The coven's list also has a Source group and the In Stock switch, on a row of their own
// above the foot. Their values count on the Filters button, so the two chosen here make 2.
export const Coven: Story = () => (
  <Panel facets={COVEN_FACETS} start={{ ...NONE, source: 'local', inStock: true }} />
);

// The coven's controls with nothing chosen: Source rests on All and the switch is off.
export const CovenEmpty: Story = () => (
  <Panel facets={COVEN_FACETS} start={{ ...NONE, source: '', inStock: false }} />
);

// Temporary comparison for the owner (M9.7): the Coven panel at each control height. Removed
// once the height is chosen.
export const Compact2Point5Rem: Story = () => (
  <Panel facets={COVEN_FACETS} start={{ ...NONE, source: 'local', inStock: true }} />
);

export const Compact2Point75Rem: Story = () => (
  <Panel
    className="facet-panel--control-275"
    facets={COVEN_FACETS}
    start={{ ...NONE, source: 'local', inStock: true }}
  />
);

Compact2Point5Rem.storyName = 'Compact 2.5rem';
Compact2Point75Rem.storyName = 'Compact 2.75rem';
