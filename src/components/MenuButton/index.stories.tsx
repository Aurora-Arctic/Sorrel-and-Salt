import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { Route } from 'next';
import type { ReactNode } from 'react';
import { fn } from 'storybook/test';
import { usePressOnMount } from '../../../.storybook/press';
import { CheckIcon } from '../IconTip';
import '../AddIcon/index.scss';
import MenuButton from '.';
import { sectionsFor } from './sections';
import type { MenuButtonItem } from './types';

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

const ICON_LABEL = 'Add Testwort to My Ingredients';
const IconWithMenuName = () => {
  usePressOnMount(ICON_LABEL);
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', minHeight: '10rem' }}>
      <MenuButton
        label={ICON_LABEL}
        menuLabel="Add Testwort To"
        className="add-icon"
        icon={<CheckIcon />}
        state="added"
        items={[
          { key: 'one', label: 'Fixture Coven One', onSelect: fn() },
          { key: 'two', label: 'Fixture Coven Two', onSelect: fn() },
        ]}
      />
    </div>
  );
};

const STATES: Record<string, ReactNode> = {
  Closed: <Row />,
  Pending: <Row busy />,
  'Opens Above': <Foot />,
  'Marked Item': <MarkedItem />,
  'Sectioned On A Coven Page': <SectionedRow viewing="coven" />,
  'Sectioned On A Compendium Page': <SectionedRow viewing="compendium" />,
  'Icon Button With Its Own Menu Name': <IconWithMenuName />,
};

export const States: Story = {
  args: { state: 'Closed' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div>{state}</div>,
};
