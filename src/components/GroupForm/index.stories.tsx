import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { FIXTURE_GROUP_ID, GROUP_NAMES, asOptions } from '../../../.storybook/fixtures';
import { InModal } from '../../../.storybook/in-modal';
import { submitForm, usePressOnMount, useSteps } from '../../../.storybook/press';
import GroupForm from '.';

// Render-only; behaviour is asserted in tests/components/GroupForm. The
// workshop has no API, so a save answers with the form's generic error. Shown
// in the modal the admin pages open it in, each story in its own iframe, so
// the modal's top layer covers the story's frame rather than Storybook's sidebar.
// One Adding and one Editing per kind the form draws differently: a category
// group has colours, a form group an icon, a tradition neither.
const meta = {
  title: 'Admin / Group Form',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

// Two of the shared groups, and the one edited here. The first two carry an
// icon, which a form group's move-to choices draw: the first its own, the
// second none, so the generic.
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

// A category group adds its two colours.
const addingACategoryGroupNode = (
  <InModal title="Add Category Group">
    <GroupForm kind="category" groups={GROUPS} onDone={done} />
  </InModal>
);

// Press Delete Group to see the move: a group to choose, then the confirmation.
const EditingACategoryGroupView = () => (
  <InModal eyebrow="Edit Category Group" title={WARDS.name}>
    <GroupForm kind="category" group={WARDS} groups={GROUPS} memberCount={3} onDone={done} />
  </InModal>
);

const editingACategoryGroupNode = <EditingACategoryGroupView />;

// A form group adds its icon: six, and None last for the generic.
const addingAFormGroupNode = (
  <InModal title="Add Form Group">
    <GroupForm kind="form" groups={GROUPS} onDone={done} />
  </InModal>
);

const TRADITIONS = asOptions(GROUP_NAMES.tradition.slice(0, 2));

// A tradition has neither colour nor icon. Press Delete Tradition to see the
// move: its two deities to another tradition.
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

// Delete Group pressed once drawn, as a person would: the first step, where
// its categories go, asked over the form, which is dimmed and held beneath it
// (MB.115).
export const AskingWhereToMove: Story = {
  render: () => {
    usePressOnMount('Delete Group');
    return <EditingACategoryGroupView />;
  },
};

// Saved while empty: the name, the description and both colours say so.
const SavingEmptyCategoryView = () => {
  useSteps([() => submitForm('form')]);
  return addingACategoryGroupNode;
};
const savingEmptyCategoryGroupNode = <SavingEmptyCategoryView />;

// Saved while empty: the icon choice says so too.
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
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
