import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import Link from 'next/link';
import ErrorPage from '.';

// Render-only; behaviour is asserted in tests/components/ErrorPage. Each story
// carries its own `main.page-frame`, as the component does.
const meta = {
  title: 'Pages / Error Page',
} satisfies Meta;
export default meta;
// The dropdown story's `state` arg is the node it draws (see its argTypes mapping).
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const defaultNode = (
  <ErrorPage title="Page Not Found" reason="There is nothing at this address.">
    <Link className="btn btn--quiet" href="/">
      Back to Sorrel &amp; Salt
    </Link>
  </ErrorPage>
);

const SomethingWentWrongView = () => (
  <ErrorPage
    title="Something Went Wrong"
    reason="The page could not be shown. Trying again often works."
    reference="1234567890"
  >
    <button type="button" className="btn btn--solid">
      Try Again
    </button>
    <Link className="btn btn--quiet" href="/">
      Back to Sorrel &amp; Salt
    </Link>
  </ErrorPage>
);

const somethingWentWrongNode = <SomethingWentWrongView />;

// One story with a control to choose the state: each is a whole page or list,
// too big to sit beside the others (claude-docs/workshop.md, rule 5).
const STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  'Something Went Wrong': somethingWentWrongNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
