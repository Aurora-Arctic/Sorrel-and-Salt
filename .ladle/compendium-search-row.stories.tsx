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

// The compendium's search row on a phone as MB.120 proposes it (items 6 and 15, the MB.120
// plan). At 375 the sticky row stacked three lines deep (the search, the Filters button, Clear
// All) and covered a third of the window, and the scroll padding that keeps a focused control
// clear of it assumed one line. Scroll each story to see the row stick. (a) is recommended and
// built into the running page; (b) and (c) are written in compendium-search-row.scss for the
// stories alone, and the losers are deleted when the owner settles it. The filter has a form
// chosen, so Clear All is drawn and the row is as tall as it gets. Names are invented (M1.25).
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

const Page = ({ variant = '' }: { variant?: string }): ReactElement => (
  <WorkshopPathname.Provider value="/compendium">
    <PublicFrame>
      <div className={`page-column proposal-sticky-page ${variant}`}>
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

// (a) Recommended, built: only the search box sticks; the Filters button and Clear All scroll
// away with the page, and the scroll padding is one line.
export const ProposalStickyPhoneSearchOnlyDark: Story = () => <Page />;
ProposalStickyPhoneSearchOnlyDark.meta = { theme: 'dark', width: 375 };

export const ProposalStickyPhoneSearchOnlyLight: Story = () => <Page />;
ProposalStickyPhoneSearchOnlyLight.meta = { theme: 'light', width: 375 };

// (b) Nothing sticks on a phone: the row scrolls away whole.
export const ProposalStickyPhoneNothingDark: Story = () => (
  <Page variant="proposal-sticky-nothing" />
);
ProposalStickyPhoneNothingDark.meta = { theme: 'dark', width: 375 };

export const ProposalStickyPhoneNothingLight: Story = () => (
  <Page variant="proposal-sticky-nothing" />
);
ProposalStickyPhoneNothingLight.meta = { theme: 'light', width: 375 };

// (c) One line that sticks whole: the Filters button beside the search box, with Clear All and
// the density switch moved into the tray (hidden here: the tray is not built for it).
export const ProposalStickyPhoneOneLineDark: Story = () => (
  <Page variant="proposal-sticky-one-line" />
);
ProposalStickyPhoneOneLineDark.meta = { theme: 'dark', width: 375 };

export const ProposalStickyPhoneOneLineLight: Story = () => (
  <Page variant="proposal-sticky-one-line" />
);
ProposalStickyPhoneOneLineLight.meta = { theme: 'light', width: 375 };

// (d) The owner's call, 2026-10-20, built: two lines, the search box then the Filters button and
// Clear All, and the two stick together. The page as built, for comparison with (a) to (c).
export const ProposalStickyPhoneTwoLinesDark: Story = () => <Page />;
ProposalStickyPhoneTwoLinesDark.meta = { theme: 'dark', width: 375 };

export const ProposalStickyPhoneTwoLinesLight: Story = () => <Page />;
ProposalStickyPhoneTwoLinesLight.meta = { theme: 'light', width: 375 };
