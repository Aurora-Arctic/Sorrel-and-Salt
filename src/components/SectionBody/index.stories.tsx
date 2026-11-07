import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { Route } from 'next';
import type { ReactElement, ReactNode } from 'react';
import { Navigating } from '../../../.storybook/navigating';
import { PendingLink } from '../../lib/navigation';
import SectionBody from '.';
import { route } from '../../../.storybook/route';

// Render-only; behaviour is asserted in tests/components/SectionBody. At rest it
// shows its page; the skeleton shows only while a navigation to a page of the section
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

const Waiting = ({
  name,
  region,
  href,
}: {
  name: string;
  region: keyof typeof FRAME;
  href: Route;
}): ReactElement => (
  <Navigating press={name}>
    <p>
      <PendingLink href={href}>{name}</PendingLink>
    </p>
    <SectionBody region={region} className={FRAME[region]}>
      <main>
        <h1>{name}</h1>
      </main>
    </SectionBody>
  </Navigating>
);

// Resting is the page itself. The rest are a wait, each drawing the skeleton the registry holds for
// the address the link goes to: a page of the same coven, and a page of the same admin area.
const STATES: Record<string, ReactNode> = {
  Resting,
  'Loading Coven Page': (
    <Waiting name="Overview" region="coven" href={route('/coven/fixture-coven')} />
  ),
  'Loading Admin Page': <Waiting name="Forms" region="admin" href={route('/curator/forms')} />,
};

export const States: Story = {
  args: { state: 'Resting' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div>{state}</div>,
};
