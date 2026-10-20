import type { Story } from '@ladle/react';
import type { ReactElement } from 'react';
import CompendiumCards from '../src/components/CompendiumCards';
import type { CompendiumCardEntry } from '../src/components/CompendiumCards/types';
import type {
  CompendiumFacetCounts,
  CompendiumListFilter,
} from '../src/components/CompendiumList/types';
import PublicFrame from '../src/components/PublicFrame';
import { WorkshopPathname } from './navigation';
import './compendium-search-row.scss';

// The compendium's search row on a phone as built (MB.120, review item 6; the owner's call,
// 2026-10-20): the search box on the first line, the Filters button and Clear All sharing the
// second, and the two lines sticking together as the desktop row does. The one pair of stories
// shows it at a phone's width (375) in each theme; scroll one to see the row stick. The filter
// has a form chosen, so Clear All is drawn. Names are invented (M1.25).
export default {
  title: 'Pages / Compendium Search Row',
};

const FILTER: CompendiumListFilter = {
  query: '',
  forms: ['Oil'],
  withoutReferences: false,
  withoutForms: false,
  elements: [],
  categories: [],
  categoryMode: 'all',
  deities: [],
  zodiac: [],
  planets: [],
  toxic: '',
};

const FACETS: CompendiumFacetCounts = {
  forms: [],
  deities: [],
  categories: [],
  zodiac: [],
  planets: [],
  elements: [],
  toxic: [],
  withoutReferences: 0,
  withoutForms: 0,
};

const entry = (n: number): CompendiumCardEntry => ({
  id: `testwort-${n}`,
  name: `Testwort ${n}`,
  slug: `testwort-${n}`,
  canonicalName: `Fixtura testalis ${n}`,
  nomenclature: 'botanical',
  categories: [],
  variants: [{ form: 'Oil', formChoice: { group: { icon: 'botanical' } } }],
  toxic: false,
  safetyNotes: null,
});

const ENTRIES = Array.from({ length: 12 }, (_, at) => entry(at + 1));

const Page = (): ReactElement => (
  <WorkshopPathname.Provider value="/compendium">
    <PublicFrame>
      <div className="page-column proposal-sticky-page">
        <CompendiumCards
          entries={ENTRIES}
          filter={FILTER}
          facets={FACETS}
          categories={[]}
          vocabulary={{ deities: [], formIcons: {} }}
          total={ENTRIES.length}
          action="none"
        />
      </div>
    </PublicFrame>
  </WorkshopPathname.Provider>
);

// The owner's call, 2026-10-20, built: two lines, the search box then the Filters button and
// Clear All, and the two stick together.
export const ProposalStickyPhoneTwoLinesDark: Story = () => <Page />;
ProposalStickyPhoneTwoLinesDark.meta = { theme: 'dark', width: 375 };

export const ProposalStickyPhoneTwoLinesLight: Story = () => <Page />;
ProposalStickyPhoneTwoLinesLight.meta = { theme: 'light', width: 375 };
