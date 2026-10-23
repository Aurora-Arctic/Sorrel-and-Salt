import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement, ReactNode } from 'react';
import Backdrop from '../Backdrop';
import Welcome from '.';

// Render-only; behaviour is asserted in tests/components/Welcome. The page
// decides `landing` from the session; a story fixes it by hand. Every story
// sits in the page's real frame, `main.page-frame.welcome-page`, so the
// column it shows is the one `/` draws (claude-docs/workshop.md).
const meta = {
  title: 'Pages / Welcome',
} satisfies Meta;
export default meta;
// The dropdown story's `state` arg is the node it draws (see its argTypes mapping).
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const Page = ({ children }: { children: ReactNode }) => (
  <>
    <main className="page-frame welcome-page">{children}</main>
    {/* The root layout draws it on every page; `.welcome-page` makes it the front door's size. */}
    <Backdrop />
  </>
);

const SignedOut = (): ReactElement => (
  <Page>
    <Welcome />
  </Page>
);

// What every signed-out visitor sees at `/`.
const defaultNode = <SignedOut />;

// The same page for a visitor with a live session: the way in is the landing.
const signedInNode = (
  <Page>
    <Welcome landing="/coven" />
  </Page>
);

// One story with a control to choose the state: each is a whole page or list,
// too big to sit beside the others (claude-docs/workshop.md, rule 5).
const STATES_STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  'Signed In': signedInNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES_STATES), mapping: STATES_STATES },
  },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
