import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { ShellFrame } from '../../../.storybook/shell-frame';
import CovenHome from '.';
import type { CovenHomeAccess } from './types';

const meta = {
  title: 'Coven / Coven Home',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: ReactNode }>;

// What each role may do on the page, as the coven page reads it from the access statements.
const STEWARD = {
  canDelete: true,
  canReadMembers: true,
  canInvite: true,
} satisfies CovenHomeAccess;
const PRACTITIONER = {
  canDelete: false,
  canReadMembers: true,
  canInvite: false,
} satisfies CovenHomeAccess;
const OBSERVER = {
  canDelete: false,
  canReadMembers: false,
  canInvite: false,
} satisfies CovenHomeAccess;

// The two buttons the page passes in, drawn plain: the real ones open dialogs that call the API.
const leave = <button className="btn">Leave Coven</button>;
const remove = <button className="btn btn--destructive">Delete Coven</button>;

const SLUG = 'fixture-coven';

const asStewardNode = (
  <CovenHome
    slug={SLUG}
    name="Testwort Coven"
    role="owner"
    access={STEWARD}
    leave={leave}
    remove={remove}
  />
);

const asPractitionerNode = (
  <CovenHome slug={SLUG} name="Testwort Coven" role="member" access={PRACTITIONER} leave={leave} />
);

const asObserverNode = (
  <CovenHome slug={SLUG} name="Testwort Coven" role="viewer" access={OBSERVER} leave={leave} />
);

// The demo coven carries its badge; a keeper holds a steward seat there.
const demoNode = (
  <CovenHome
    slug={SLUG}
    name="Demo Coven"
    demo
    role="owner"
    access={STEWARD}
    leave={leave}
    remove={remove}
  />
);

// The skeleton once the layout has told it the name and the role: the page's own words as bars.
const pendingKnownNode = (
  <CovenHome pending slug={SLUG} name="Testwort Coven" role="member" access={PRACTITIONER} />
);

// The skeleton on a move from outside the coven: the title and the lede are bars, and the menu and
// sections are a steward's, the longest a coven shows.
const pendingUnknownNode = <CovenHome pending slug={SLUG} role="owner" access={STEWARD} />;

const STATES: Record<string, ReactNode> = {
  'As Steward': asStewardNode,
  'As Practitioner': asPractitionerNode,
  'As Observer': asObserverNode,
  'Demo Coven': demoNode,
  'Pending, Facts Known': pendingKnownNode,
  'Pending, Facts Unknown': pendingUnknownNode,
};

export const States: Story = {
  args: { state: 'As Steward' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  // The page inside the shell with the coven switcher and nav, as src/app/(shell)/coven/[slug]/page.tsx has it.
  render: ({ state }) => (
    <ShellFrame area="coven" open={`/coven/${SLUG}`}>
      {state}
    </ShellFrame>
  ),
};
