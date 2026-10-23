import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ShellFrame, shellFrameParameters } from '../../../.storybook/shell-frame';
import Backdrop from '../Backdrop';
import NotAuthorized from '../NotAuthorized';
import ErrorPage from '.';

// Render-only; behaviour is asserted in tests/components/ErrorPage. Each story
// carries its own `main.page-frame`, as the component does.
const meta = {
  title: 'Pages / Error Page',
  parameters: shellFrameParameters,
} satisfies Meta;
export default meta;
// The dropdown story's `state` arg is the node it draws (see its argTypes mapping).
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const notFound = (
  <ErrorPage title="Page Not Found" reason="There is nothing at this address.">
    <Link className="btn btn--quiet" href="/">
      Back to Sorrel &amp; Salt
    </Link>
  </ErrorPage>
);

// A signed-in visitor: `(shell)/not-found.tsx` re-exports the root page so the shell's bar stays.
const defaultNode = (
  <>
    <ShellFrame area="none" open="/">
      {notFound}
    </ShellFrame>
    <Backdrop />
  </>
);

// A visitor with no session: the root page alone, with the layout's corner ornaments.
const notFoundSignedOutNode = (
  <>
    {notFound}
    <Backdrop />
  </>
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

// The 403 page `forbidden.tsx` draws for a signed-in non-admin: its real
// `main.page-frame`, inside the app shell. It takes no props.
const notAuthorizedNode = (
  <>
    <ShellFrame area="none" open="/admin" workspaces={[]} viewer={{ canCreate: false }}>
      <main className="page-frame">
        <NotAuthorized />
      </main>
    </ShellFrame>
    <Backdrop />
  </>
);

// One story with a control to choose the state: each is a whole page or list,
// too big to sit beside the others (claude-docs/workshop.md, rule 5).
const STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  'Not Found Signed Out': notFoundSignedOutNode,
  'Something Went Wrong': somethingWentWrongNode,
  'Not Authorized': notAuthorizedNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
