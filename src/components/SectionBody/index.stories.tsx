import type { Story } from '@ladle/react';
import type { ReactElement } from 'react';
import { Navigating } from '../../../.ladle/navigating';
import { PendingLink } from '../../lib/navigation';
import type { NavigationTarget } from '../../lib/navigation';
import SectionBody from '.';

// Render-only; behaviour is asserted in tests/components/SectionBody. At rest it
// shows its page; the skeleton stands in only while a navigation aimed at the
// section is on its way. The Loading stories open with a link already pressed,
// so the wait stays on screen (the workshop's navigation never arrives).
export default {
  title: 'Shell / Section Body',
};

export const AtRest: Story = () => (
  <SectionBody region="coven" className="coven-layout">
    <main>
      <h1>Ingredients</h1>
      <p>Testwort</p>
    </main>
  </SectionBody>
);

const Waiting = ({ name, target }: { name: string; target: NavigationTarget }): ReactElement => (
  <Navigating press={name}>
    <p>
      <PendingLink href="/coven/fixture-coven" navigationTarget={target}>
        {name}
      </PendingLink>
    </p>
    <SectionBody region={target.region as 'coven' | 'admin'} className="coven-layout">
      <main>
        <h1>{name}</h1>
      </main>
    </SectionBody>
  </Navigating>
);

// The coven's Ingredients: its heading, filter and cards in the wide column.
export const LoadingList: Story = () => (
  <Waiting
    name="Ingredients"
    target={{ region: 'coven', shape: 'cards', title: true, filter: true }}
  />
);

// The coven's Members: its heading with the tab row, then the table.
export const LoadingTabs: Story = () => (
  <Waiting name="Members" target={{ region: 'coven', shape: 'table', title: true, tabs: true }} />
);

// The coven's home: the page with its contents menu beside it.
export const LoadingWithMenu: Story = () => (
  <Waiting name="Overview" target={{ region: 'coven', shape: 'page', frame: 'with-nav' }} />
);
