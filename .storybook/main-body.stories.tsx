import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement, ReactNode } from 'react';
import { PendingLink } from '../src/lib/navigation';
import { Navigating } from './navigating';
import { route } from './route';
import { ShellFrame } from './shell-frame';

// The shell's body (src/components/AppShell/main-body.tsx), drawn by the shell
// itself: a page, and the one `page` skeleton that takes its place while a
// navigation aimed at the `main` region is on its way. A navigation here never
// arrives (./navigating.tsx), so the wait stays; "Start Over" ends it.
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
        <PendingLink href="/compendium" navigationTarget={{ region: 'main', shape: 'page' }}>
          Compendium
        </PendingLink>
      </li>
      <li>
        <PendingLink
          href="/compendium"
          navigationTarget={{
            region: 'main',
            shape: 'cards',
            frame: 'wide',
            title: true,
            filter: true,
          }}
        >
          Wide
        </PendingLink>
      </li>
      <li>
        <PendingLink
          href="/coven"
          navigationTarget={{ region: 'main', shape: 'page', frame: 'narrow' }}
        >
          Narrow
        </PendingLink>
      </li>
      <li>
        <PendingLink
          href="/account"
          navigationTarget={{ region: 'main', shape: 'page', frame: 'with-nav' }}
        >
          With Menu
        </PendingLink>
      </li>
      <li>
        <PendingLink
          href="/coven/new"
          navigationTarget={{ region: 'main', shape: 'form', frame: 'narrow' }}
        >
          Form
        </PendingLink>
      </li>
      <li>
        <PendingLink
          href={route('/compendium/ingredients/testwort')}
          navigationTarget={{ region: 'main', shape: 'page', frame: 'entry' }}
        >
          Entry
        </PendingLink>
      </li>
      <li>
        <PendingLink
          href={'/admin/users'}
          navigationTarget={{
            region: 'main',
            shape: 'table',
            frame: 'wide',
            title: true,
            tabs: true,
            action: true,
            filter: true,
          }}
        >
          Tabs And Action
        </PendingLink>
      </li>
      <li>
        <PendingLink
          href="/account/email"
          navigationTarget={{ region: 'main', shape: 'page', head: 'eyebrow' }}
        >
          Eyebrow Head
        </PendingLink>
      </li>
      <li>
        <PendingLink
          href={'/account'}
          navigationTarget={{ region: 'main', shape: 'page', head: 'title' }}
        >
          Title Head
        </PendingLink>
      </li>
    </ul>
  </main>
);

// Each state is the same page; all but the first are opened with one link
// already pressed, so the page has gone and the skeleton stands in a `main`
// of its own, under the page bar, in the frame that link's destination sits in
// (top-aligned, never centred down the window): the standard frame, the wide
// column of the Compendium's cards, the forms' column of the coven index, the
// account's jump menu beside its sections, Create Coven's form on its panel, an
// ingredient's page with its menu, a table with tabs and an action, and the two
// heads. Resting is the page at rest: press a link to see it swap.
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
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
