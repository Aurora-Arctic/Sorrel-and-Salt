import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement, ReactNode } from 'react';
import Backdrop from '../Backdrop';
import Welcome from '.';

const meta = {
  title: 'Pages / Welcome',
} satisfies Meta;
export default meta;
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

const defaultNode = <SignedOut />;

const signedInNode = (
  <Page>
    <Welcome landing="/coven" />
  </Page>
);

const STATES_STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  'Signed In': signedInNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES_STATES), mapping: STATES_STATES },
  },
  render: ({ state }) => <div>{state}</div>,
};
