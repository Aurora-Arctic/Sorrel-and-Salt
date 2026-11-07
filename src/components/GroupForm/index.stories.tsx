import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { FIXTURE_GROUP_ID, GROUP_NAMES, asOptions } from '../../../.storybook/fixtures';
import { InModal } from '../../../.storybook/in-modal';
import { submitForm, usePressOnMount, useSteps } from '../../../.storybook/press';
import GroupForm from '.';

const meta = {
  title: 'Admin / Group Form',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const GROUPS = [
  ...asOptions(GROUP_NAMES.form.slice(0, 2)).map((group, index) => ({
    ...group,
    icon: index === 0 ? ('mineral' as const) : null,
  })),
  { id: FIXTURE_GROUP_ID, name: 'Testwort Wards' },
];

const WARDS = {
  id: GROUPS[2].id,
  name: 'Testwort Wards',
  description: 'An invented group, for the workshop.',
  colorDark: '#5d8ab1',
  colorLight: '#286ba6',
  icon: '' as const,
};

const done = () => {};

const addingACategoryGroupNode = (
  <InModal title="Add Category Group">
    <GroupForm kind="category" groups={GROUPS} onDone={done} />
  </InModal>
);

const EditingACategoryGroupView = () => (
  <InModal eyebrow="Edit Category Group" title={WARDS.name}>
    <GroupForm kind="category" group={WARDS} groups={GROUPS} memberCount={3} onDone={done} />
  </InModal>
);

const editingACategoryGroupNode = <EditingACategoryGroupView />;

const addingAFormGroupNode = (
  <InModal title="Add Form Group">
    <GroupForm kind="form" groups={GROUPS} onDone={done} />
  </InModal>
);

const TRADITIONS = asOptions(GROUP_NAMES.tradition.slice(0, 2));

const editingATraditionNode = (
  <InModal eyebrow="Edit Tradition" title="Fixtural">
    <GroupForm
      kind="tradition"
      group={{
        id: TRADITIONS[0].id,
        name: 'Fixtural',
        description: 'An invented tradition, for the workshop.',
        colorDark: '',
        colorLight: '',
        icon: '',
      }}
      groups={TRADITIONS}
      memberCount={2}
      onDone={done}
    />
  </InModal>
);

export const AskingWhereToMove: Story = {
  render: () => {
    usePressOnMount('Delete Group');
    return <EditingACategoryGroupView />;
  },
};

const SavingEmptyCategoryView = () => {
  useSteps([() => submitForm('form')]);
  return addingACategoryGroupNode;
};
const savingEmptyCategoryGroupNode = <SavingEmptyCategoryView />;

const SavingEmptyFormView = () => {
  useSteps([() => submitForm('form')]);
  return addingAFormGroupNode;
};
const savingEmptyFormGroupNode = <SavingEmptyFormView />;

const STATES: Record<string, ReactNode> = {
  'Adding A Category Group': addingACategoryGroupNode,
  'Editing A Category Group': editingACategoryGroupNode,
  'Adding A Form Group': addingAFormGroupNode,
  'Editing A Tradition': editingATraditionNode,
  'Saving Empty Category Group': savingEmptyCategoryGroupNode,
  'Saving Empty Form Group': savingEmptyFormGroupNode,
};

export const States: Story = {
  args: { state: 'Adding A Category Group' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div>{state}</div>,
};
