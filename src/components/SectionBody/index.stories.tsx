import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement, ReactNode } from 'react';
import { Navigating } from '../../../.storybook/navigating';
import { PendingLink } from '../../lib/navigation';
import type { NavigationTarget } from '../../lib/navigation';
import SectionBody from '.';
import { route } from '../../../.storybook/route';

// Render-only; behaviour is asserted in tests/components/SectionBody. At rest it
// shows its page; the skeleton shows only while a navigation aimed at the section
// is on its way. The Loading stories open with a link pressed (it never arrives).
const meta = {
  title: 'Shell / Section Body',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const Resting = (
  <SectionBody region="coven" className="coven-layout">
    <main>
      <h1>Ingredients</h1>
      <p>Testwort</p>
    </main>
  </SectionBody>
);

// Each region has its own frame class, as its layout gives it: the coven's
// `coven-layout`, the admin area's `page-column`.
const FRAME = { coven: 'coven-layout', admin: 'page-column' } as const;

const Waiting = ({ name, target }: { name: string; target: NavigationTarget }): ReactElement => {
  const region = target.region as keyof typeof FRAME;
  return (
    <Navigating press={name}>
      <p>
        <PendingLink href={route('/coven/fixture-coven')} navigationTarget={target}>
          {name}
        </PendingLink>
      </p>
      <SectionBody region={region} className={FRAME[region]}>
        <main>
          <h1>{name}</h1>
        </main>
      </SectionBody>
    </Navigating>
  );
};

// Resting is the page itself. The rest are a wait, each in the skeleton of the
// destination it names: the coven's Ingredients (with and without an Add action),
// Members, Overview, an ingredient's page, and the admin index. The account page
// is aimed at the shell's body, not this one: see Main Body.
const STATES: Record<string, ReactNode> = {
  Resting,
  'Loading List': (
    <Waiting
      name="Ingredients"
      target={{ region: 'coven', shape: 'cards', title: true, filter: true }}
    />
  ),
  'Loading List With Action': (
    <Waiting
      name="Grimoire"
      target={{ region: 'coven', shape: 'cards', title: true, action: true, filter: true }}
    />
  ),
  'Loading Tabs': (
    <Waiting name="Members" target={{ region: 'coven', shape: 'table', title: true, tabs: true }} />
  ),
  'Loading With Menu': (
    <Waiting
      name="Overview"
      target={{ region: 'coven', shape: 'page', frame: 'with-nav', head: 'eyebrow' }}
    />
  ),
  'Loading Entry': (
    <Waiting name="Testwort" target={{ region: 'coven', shape: 'page', frame: 'entry' }} />
  ),
  'Loading Contents': <Waiting name="Admin" target={{ region: 'admin', shape: 'contents' }} />,
};

export const States: Story = {
  args: { state: 'Resting' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
