import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { UpdateCategoryDocument } from '@/gql/graphql';
import { answerMutation, refusal, useMockHandlers } from '../../../.storybook/mock-api';
import { FIXTURE_GROUP_ID, GROUP_NAMES, asOptions } from '../../../.storybook/fixtures';
import { InModal } from '../../../.storybook/in-modal';
import { setInputValue, submitForm, usePressOnMount, useSteps } from '../../../.storybook/press';
import { FORM_GROUP_ICONS } from '../../modules/vocabulary/schema/form-group-icons';
import GroupedValueForm from '.';

// Render-only; behaviour is asserted in tests/components/GroupedValueForm.
// Every kind, the flat celestial bodies and signs among them (MB.115).
// A save is answered by the workshop's fake API (.storybook/mock-api.ts): the
// states that save are refused, one beside a field and one above the fields.
// Shown in the modal the admin pages open it in, each story in its own iframe,
// so the modal's top layer covers the story's frame rather than Storybook's
// sidebar. One story per way the form differs: a category (the plain grouped
// kind), a form (its group choices draw an icon), a deity (a tradition after
// its name), a flat kind (no group field).
const meta = {
  title: 'Admin / Grouped Value Form',
} satisfies Meta;
export default meta;
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

const addingACategoryNode = (
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

// A form filed under a group that draws its own icon.
const editingAFormNode = (
  <InModal eyebrow="Edit Form" title="Testleaf">
    <GroupedValueForm
      kind="form"
      value={{
        id: FIXTURE_GROUP_ID,
        name: 'Testleaf',
        description: 'An invented form, for the workshop.',
        groupId: FORM_GROUPS[0].id,
      }}
      groups={FORM_GROUPS}
      onDone={done}
    />
  </InModal>
);

// The other flat kind.
const addingAZodiacSignNode = (
  <InModal title="Add Zodiac Sign">
    <GroupedValueForm kind="zodiacSign" onDone={done} />
  </InModal>
);

// A rename sent and refused for the name: the server's sentence shows beside it.
const NAME_TAKEN = [
  answerMutation(UpdateCategoryDocument, () =>
    refusal({
      message: 'Validation failed',
      code: 'VALIDATION',
      fieldErrors: [{ path: ['name'], message: 'A category called Testcraft Two already exists.' }],
    }),
  ),
];
// ...and refused as a whole: the sentence shows above the fields.
const NOT_ALLOWED = [
  answerMutation(UpdateCategoryDocument, () =>
    refusal({ message: 'You cannot change categories right now.', code: 'FORBIDDEN' }),
  ),
];
const SaveRefusedView = ({ answers }: { answers: typeof NAME_TAKEN }) => {
  useMockHandlers(answers);
  useSteps([
    () =>
      setInputValue(
        document.querySelector<HTMLInputElement>('input[name="name"]')!,
        'Testcraft Two',
      ),
    () => submitForm('form'),
  ]);
  return <EditingACategoryView />;
};
const saveRefusedNode = <SaveRefusedView answers={NAME_TAKEN} />;
const saveFailedNode = <SaveRefusedView answers={NOT_ALLOWED} />;

// Saved while empty: each missing field says so.
const SavingEmptyView = () => {
  useSteps([() => submitForm('form')]);
  return addingACategoryNode;
};
const savingEmptyNode = <SavingEmptyView />;

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
        otherNames: ['Testrina', 'Tess'],
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

const STATES: Record<string, ReactNode> = {
  'Adding A Category': addingACategoryNode,
  'Editing A Category': editingACategoryNode,
  'Adding A Form': addingAFormNode,
  'Editing A Form': editingAFormNode,
  'Editing A Deity': editingADeityNode,
  'Adding A Celestial Body': addingACelestialBodyNode,
  'Adding A Zodiac Sign': addingAZodiacSignNode,
  'Save Refused For The Name': saveRefusedNode,
  'Save Refused As A Whole': saveFailedNode,
  'Saving Empty': savingEmptyNode,
};

export const States: Story = {
  args: { state: 'Adding A Category' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
