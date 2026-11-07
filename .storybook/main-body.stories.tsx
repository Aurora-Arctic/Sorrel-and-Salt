import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement, ReactNode } from 'react';
import { PendingLink } from '../src/lib/navigation';
import { Navigating } from './navigating';
import { route } from './route';
import { ShellFrame } from './shell-frame';

// The shell's body (src/components/AppShell/main-body.tsx): a page, and the `page` skeleton that
// replaces it while a navigation aimed at `main` is on its way. The navigation never arrives
// (./navigating.tsx), so the wait stays; "Start Over" ends it.
const meta = {
  title: 'Feedback / Main Body',
} satisfies Meta;
export default meta;
// The dropdown story's `state` arg is the node it draws (see its argTypes mapping).
type Story = StoryObj<{ state?: import('react').ReactNode }>;

// One link per destination frame, each named for the frame its wait is drawn in.
const Page = (): ReactElement => (
  <main className="page-frame">
    <h1>Your Account</h1>
    <ul>
      <li>
        <PendingLink href="/compendium">Compendium</PendingLink>
      </li>
      <li>
        <PendingLink href="/compendium">Wide</PendingLink>
      </li>
      <li>
        <PendingLink href="/coven">Narrow</PendingLink>
      </li>
      <li>
        <PendingLink href="/account">With Menu</PendingLink>
      </li>
      <li>
        <PendingLink href="/coven/new">Form</PendingLink>
      </li>
      <li>
        <PendingLink href={route('/compendium/ingredients/testwort')}>Entry</PendingLink>
      </li>
      <li>
        <PendingLink href={'/keepers/users'}>Tabs And Action</PendingLink>
      </li>
      <li>
        <PendingLink href="/account/email">Eyebrow Head</PendingLink>
      </li>
      <li>
        <PendingLink href={'/account'}>Title Head</PendingLink>
      </li>
    </ul>
  </main>
);

// Each state is the same page. All but the first open with one link already pressed, so the
// skeleton stands in a `main` of that link's destination's frame (top-aligned), under the page
// bar. Resting is the page at rest: press a link to see it swap.
const waiting = (press?: string): ReactElement => (
  <Navigating bar press={press}>
    <ShellFrame area="none">
      <Page />
    </ShellFrame>
  </Navigating>
);

const STATES: Record<string, ReactNode> = {
  Resting: waiting(),
  Compendium: waiting('Compendium'),
  Wide: waiting('Wide'),
  Narrow: waiting('Narrow'),
  'With Menu': waiting('With Menu'),
  Form: waiting('Form'),
  Entry: waiting('Entry'),
  'Tabs And Action': waiting('Tabs And Action'),
  'Eyebrow Head': waiting('Eyebrow Head'),
  'Title Head': waiting('Title Head'),
};

export const States: Story = {
  args: { state: 'Resting' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div>{state}</div>,
};
