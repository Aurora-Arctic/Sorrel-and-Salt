import type { Story } from '@ladle/react';
import Modal from '../Modal';
import IngredientFormValueForm from '.';

// Render-only; behaviour is asserted in tests/components/IngredientFormValueForm.
// The workshop has no API, so a save answers with the form's generic error.
// Shown in the modal the admin page opens it in.
export default {
  title: 'Admin / Ingredient Form Value Form',
};

const GROUPS = [
  { id: '0b9f0f6e-2f4c-4d7a-9a52-3c1c5b8e6d21', name: 'Fixture Mineral' },
  { id: '1c8e1e5d-3e5b-4c6a-8b41-2d0b4a7d5c10', name: 'Fixture Substance' },
];

const done = () => {};

export const Adding: Story = () => (
  <Modal title="Add Form" onClose={done}>
    <IngredientFormValueForm groups={GROUPS} onDone={done} />
  </Modal>
);

// Rename it to see the note by Save that the rename carries onto the compendium.
export const Editing: Story = () => (
  <Modal title="Edit Form" onClose={done}>
    <IngredientFormValueForm
      formValue={{
        id: '5a0e3c2b-7d6f-4e1a-9b8c-0f1e2d3c4b5a',
        name: 'Testwort Shard',
        description: 'An invented form, for the workshop.',
        groupId: GROUPS[0].id,
      }}
      groups={GROUPS}
      onDone={done}
    />
  </Modal>
);

// Each in its own iframe, so the modal's top layer covers the story's frame
// rather than Ladle's sidebar.
Adding.meta = { iframed: true };
Editing.meta = { iframed: true };
