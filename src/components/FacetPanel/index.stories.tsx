import type { Story } from '@ladle/react';
import { useEffect, useRef, useState } from 'react';
import type { CompendiumFacetCounts } from '../CompendiumList/types';
import FacetPanel from '.';
import type { FacetPanelFilter } from './types';

// Render-only; behaviour is asserted in tests/components/FacetPanel. Invented values (M12.4).
// A change marks the chips "loading" for a moment, as a search on its way does. The
// counts do not follow the choices; they are fixed here. Narrow the preview below the
// tablet width for the modal sheet.
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

function Panel({ start = NONE, admin = false }: { start?: FacetPanelFilter; admin?: boolean }) {
  const [filter, setFilter] = useState(start);
  const [loading, setLoading] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <div style={{ minHeight: '34rem' }}>
      {/* The anchor the panel opens under, as the list's filter form is. */}
      <form
        onSubmit={(event) => event.preventDefault()}
        style={{ position: 'relative', display: 'flex', gap: '1rem', alignItems: 'center' }}
      >
        <FacetPanel
          facets={FACETS}
          filter={filter}
          admin={admin}
          loading={loading}
          clearHref="#clear"
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
export const Empty: Story = () => <Panel />;

// Chosen values: the count on the button, Clear All beside it, Match for two categories.
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

// The admin list also has the No Refs switch.
export const Admin: Story = () => <Panel admin start={{ ...NONE, withoutReferences: true }} />;
