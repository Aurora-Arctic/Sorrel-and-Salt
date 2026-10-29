import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { Route } from 'next';
import type { ReactNode } from 'react';
import { fn } from 'storybook/test';
import MenuButton from '.';
import { sectionsFor } from './sections';
import type { MenuButtonItem } from './types';

// Render-only; keys and closing are asserted in tests/components/MenuButton/index.test.tsx.
// The entry page's More menu (a link first, the destructive choice last), the
// button busy, and the Annotate dialog's More, opening above from a dialog's foot.
const meta = {
  title: 'Forms / Menu Button',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: ReactNode }>;

const ITEMS: MenuButtonItem[] = [
  {
    key: 'edit',
    label: 'Edit Compendium Entry',
    href: '/?edit' as Route,
    onClick: (e) => e.preventDefault(),
  },
  { key: 'annotate', label: 'Annotate', onSelect: fn() },
  { key: 'own', label: 'Make It Ours', onSelect: fn() },
  { key: 'remove', label: 'Remove', destructive: true, onSelect: fn() },
];

const Row = ({ busy = false }: { busy?: boolean }) => (
  <div style={{ display: 'flex', justifyContent: 'flex-end', minHeight: '14rem' }}>
    <MenuButton
      label="Edit"
      className="btn btn--quiet btn--medium"
      items={ITEMS}
      busy={busy}
      busyLabel="Adding"
    />
  </div>
);

// At a dialog's foot, as the Annotate dialog's More is, its items in the
// button's type: set at the window's foot, where the room is above, so the
// menu flips over the button. No prop says so; the room decides.
const Foot = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
      minHeight: '90vh',
    }}
  >
    <MenuButton label="More" className="btn btn--quiet" items={ITEMS.slice(2)} buttonType />
  </div>
);

// The plus's menu of covens: a coven that holds the entry is disabled, its name followed
// by the green check (`mark`) and named "Fixture Coven Two, in its cupboard".
const MarkedItem = () => (
  <div style={{ display: 'flex', justifyContent: 'flex-end', minHeight: '10rem' }}>
    <MenuButton
      label="Add to My Ingredients"
      className="btn btn--quiet btn--medium"
      items={[
        { key: 'one', label: 'Fixture Coven One', onSelect: fn() },
        {
          key: 'two',
          label: 'Fixture Coven Two',
          onSelect: fn(),
          disabled: true,
          mark: 'in its cupboard',
        },
      ]}
    />
  </div>
);

// Sections: a menu holding both the compendium's choices and the
// coven's draws them under discreet headings, the viewer's own side first. Set on a coven's page
// (Coven first) and on a compendium page (Compendium first).
const SECTIONED = {
  compendium: [{ key: 'edit', label: 'Edit in Compendium', onSelect: fn() }],
  coven: [
    { key: 'own', label: 'Make It Ours', onSelect: fn() },
    { key: 'remove', label: 'Remove', destructive: true, onSelect: fn() },
  ],
};

const SectionedRow = ({ viewing }: { viewing: 'compendium' | 'coven' }) => (
  <div style={{ display: 'flex', justifyContent: 'flex-end', minHeight: '14rem' }}>
    <MenuButton
      label="More"
      className="btn btn--quiet btn--medium"
      sections={sectionsFor(SECTIONED, viewing)}
    />
  </div>
);

// One control chooses the state (claude-docs/workshop.md, rule 5); some open the
// menu on a tall frame and one sits at the window's foot.
const STATES: Record<string, ReactNode> = {
  Closed: <Row />,
  Pending: <Row busy />,
  'Opens Above': <Foot />,
  'Marked Item': <MarkedItem />,
  'Sectioned On A Coven Page': <SectionedRow viewing="coven" />,
  'Sectioned On A Compendium Page': <SectionedRow viewing="compendium" />,
};

export const States: Story = {
  args: { state: 'Closed' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
