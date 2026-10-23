import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { FIXTURE_GROUP_ID, GROUP_NAMES, asOptions } from '../../../.storybook/fixtures';
import { InModal } from '../../../.storybook/in-modal';
import { usePressOnMount } from '../../../.storybook/press';
import { FORM_GROUP_ICONS } from '../../modules/vocabulary/schema/form-group-icons';
import GroupedValueForm from '.';

// Render-only; behaviour is asserted in tests/components/GroupedValueForm.
// Every kind, the flat celestial bodies and signs among them (MB.115).
// The workshop has no API, so a save answers with the form's generic error.
// Shown in the modal the admin pages open it in, each story in its own iframe,
// so the modal's top layer covers the story's frame rather than Storybook's
// sidebar. One story per way the form differs: a category (the plain grouped
// kind), a form (its group choices draw an icon), a deity (a tradition after
// its name), a flat kind (no group field).
const meta = {
  title: 'Admin / Grouped Value Form',
} satisfies Meta;
export default meta;
// The dropdown story's `state` arg is the node it draws (see its argTypes mapping).
type Story = StoryObj<{ state?: import('react').ReactNode }>;

// Enough of each to narrow: every group field is typed into (MB.115).
const CATEGORY_GROUPS = asOptions(GROUP_NAMES.category);
// A form group's choices draw its icon: the first two their own, one none (the generic).
const FORM_GROUPS = asOptions(GROUP_NAMES.form).map((group, index) => ({
  ...group,
  icon: index === 3 ? null : FORM_GROUP_ICONS[index],
}));
const TRADITIONS = asOptions(GROUP_NAMES.tradition);

const done = () => {};

const defaultNode = (
  <InModal title="Add Category">
    <GroupedValueForm kind="category" groups={CATEGORY_GROUPS} onDone={done} />
  </InModal>
);

const EditingACategoryView = () => (
  <InModal eyebrow="Edit Category" title="Testcraft">
    <GroupedValueForm
      kind="category"
      value={{
        id: FIXTURE_GROUP_ID,
        name: 'Testcraft',
        description: 'An invented category, for the workshop.',
        groupId: CATEGORY_GROUPS[1].id,
      }}
      groups={CATEGORY_GROUPS}
      onDone={done}
    />
  </InModal>
);

const editingACategoryNode = <EditingACategoryView />;

const addingAFormNode = (
  <InModal title="Add Form">
    <GroupedValueForm kind="form" groups={FORM_GROUPS} onDone={done} />
  </InModal>
);

// Rename it to see the note by Save that the rename carries onto the
// compendium, and the head keep the name it was saved under, its tradition
// after it, as a deity's pills name it (MB.115).
const editingADeityNode = (
  <InModal eyebrow="Edit Deity" title="Testra" qualifier="Fixtural">
    <GroupedValueForm
      kind="deity"
      value={{
        id: FIXTURE_GROUP_ID,
        name: 'Testra',
        description: 'An invented deity, for the workshop.',
        groupId: TRADITIONS[0].id,
      }}
      groups={TRADITIONS}
      onDone={done}
    />
  </InModal>
);

// A flat kind has no group field.
const addingACelestialBodyNode = (
  <InModal title="Add Celestial Body">
    <GroupedValueForm kind="celestialBody" onDone={done} />
  </InModal>
);

// Delete pressed once drawn, as a person would: the question over the form,
// dimmed and held beneath it until Delete or Keep It answers (MB.115).
export const AskingToDelete: Story = {
  render: () => {
    usePressOnMount('Delete Category');
    return <EditingACategoryView />;
  },
};

// One story with a control to choose the state: each is a whole page or list,
// too big to sit beside the others (claude-docs/workshop.md, rule 5).
const STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  'Editing ACategory': editingACategoryNode,
  'Adding AForm': addingAFormNode,
  'Editing ADeity': editingADeityNode,
  'Adding ACelestial Body': addingACelestialBodyNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
