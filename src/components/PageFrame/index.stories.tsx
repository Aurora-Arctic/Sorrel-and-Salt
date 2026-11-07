import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import PageColumn from '../PageColumn';
import PageHeader from '../PageHeader';
import PageNav from '../PageNav';
import type { PageNavEntry } from '../PageNav/types';
import PageWithNav from '../PageWithNav';
import PageFrame from '.';

// Render-only; the three layout frames a page and its skeleton both draw. Each is drawn as a `div`
// so the story holds no second `main` landmark.
const meta = {
  title: 'Layout / Page Frames',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: ReactNode }>;

const MENU: PageNavEntry[] = [
  { href: '#account', label: 'Account' },
  { href: '#security', label: 'Security' },
  { href: '#data', label: 'Data' },
];

const STATES: Record<string, ReactNode> = {
  'Page Frame': (
    <PageFrame as="div">
      <PageHeader title="Account" />
      <p>The standard frame.</p>
    </PageFrame>
  ),
  'Narrow Page Frame': (
    <PageFrame as="div" narrow>
      <PageHeader title="Sign In" />
      <p>The narrow frame the forms stand in.</p>
    </PageFrame>
  ),
  'Page Column': (
    <PageColumn as="div">
      <PageHeader title="Compendium" />
      <p>The wide column the lists stand in.</p>
    </PageColumn>
  ),
  'Page With Nav': (
    <PageWithNav as="div">
      <PageHeader title="Settings" />
      <PageNav label="On This Page" entries={MENU} />
      <p>A page with a jump menu beside its sections.</p>
    </PageWithNav>
  ),
  'Page With Nav Headless': (
    <PageWithNav as="div" headless>
      <PageNav label="On This Page" entries={MENU} />
      <p>A tab of a tabbed page, with no heading above the menu.</p>
    </PageWithNav>
  ),
};

export const States: Story = {
  args: { state: 'Page Frame' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div>{state}</div>,
};
