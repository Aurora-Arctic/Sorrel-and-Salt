import type { Story } from '@ladle/react';
import Modal from '../Modal';
import GroupedValueForm from '.';

// Render-only; behaviour is asserted in tests/components/GroupedValueForm.
// The workshop has no API, so a save answers with the form's generic error.
// Shown in the modal the admin pages open it in.
export default {
  title: 'Admin / Grouped Value Form',
};

const CATEGORY_GROUPS = [
  { id: '0b9f0f6e-2f4c-4d7a-9a52-3c1c5b8e6d21', name: 'Fixture Healing' },
  { id: '1c8e1e5d-3e5b-4c6a-8b41-2d0b4a7d5c10', name: 'Fixture Protection' },
];

const FORM_GROUPS = [
  { id: '0b9f0f6e-2f4c-4d7a-9a52-3c1c5b8e6d21', name: 'Fixture Mineral' },
  { id: '1c8e1e5d-3e5b-4c6a-8b41-2d0b4a7d5c10', name: 'Fixture Substance' },
];

const TRADITIONS = [
  { id: '0b9f0f6e-2f4c-4d7a-9a52-3c1c5b8e6d21', name: 'Fixtural' },
  { id: '1c8e1e5d-3e5b-4c6a-8b41-2d0b4a7d5c10', name: 'Mockish' },
];

const done = () => {};

export const AddingACategory: Story = () => (
  <Modal title="Add Category" onClose={done}>
    <GroupedValueForm kind="category" groups={CATEGORY_GROUPS} onDone={done} />
  </Modal>
);

export const EditingACategory: Story = () => (
  <Modal title="Edit Category" onClose={done}>
    <GroupedValueForm
      kind="category"
      value={{
        id: '5a0e3c2b-7d6f-4e1a-9b8c-0f1e2d3c4b5a',
        name: 'Testcraft',
        description: 'An invented category, for the workshop.',
        groupId: CATEGORY_GROUPS[1].id,
      }}
      groups={CATEGORY_GROUPS}
      onDone={done}
    />
  </Modal>
);

export const AddingAForm: Story = () => (
  <Modal title="Add Form" onClose={done}>
    <GroupedValueForm kind="form" groups={FORM_GROUPS} onDone={done} />
  </Modal>
);

// Rename it to see the note by Save that the rename carries onto the compendium.
export const EditingAForm: Story = () => (
  <Modal title="Edit Form" onClose={done}>
    <GroupedValueForm
      kind="form"
      value={{
        id: '5a0e3c2b-7d6f-4e1a-9b8c-0f1e2d3c4b5a',
        name: 'Testwort Shard',
        description: 'An invented form, for the workshop.',
        groupId: FORM_GROUPS[0].id,
      }}
      groups={FORM_GROUPS}
      onDone={done}
    />
  </Modal>
);

export const AddingADeity: Story = () => (
  <Modal title="Add Deity" onClose={done}>
    <GroupedValueForm kind="deity" groups={TRADITIONS} onDone={done} />
  </Modal>
);

// Rename it to see the note by Save that the rename carries onto the compendium.
export const EditingADeity: Story = () => (
  <Modal title="Edit Deity" onClose={done}>
    <GroupedValueForm
      kind="deity"
      value={{
        id: '5a0e3c2b-7d6f-4e1a-9b8c-0f1e2d3c4b5a',
        name: 'Testra',
        description: 'An invented deity, for the workshop.',
        groupId: TRADITIONS[0].id,
      }}
      groups={TRADITIONS}
      onDone={done}
    />
  </Modal>
);

// Each in its own iframe, so the modal's top layer covers the story's frame
// rather than Ladle's sidebar.
AddingACategory.meta = { iframed: true };
EditingACategory.meta = { iframed: true };
AddingAForm.meta = { iframed: true };
EditingAForm.meta = { iframed: true };
AddingADeity.meta = { iframed: true };
EditingADeity.meta = { iframed: true };
