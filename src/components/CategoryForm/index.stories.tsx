import type { Story } from '@ladle/react';
import Modal from '../Modal';
import CategoryForm from '.';

// Render-only; behaviour is asserted in tests/components/CategoryForm. The
// workshop has no API, so a save answers with the form's generic error. Shown
// in the modal the admin page opens it in.
export default {
  title: 'Admin / Category Form',
};

const GROUPS = [
  { id: '0b9f0f6e-2f4c-4d7a-9a52-3c1c5b8e6d21', name: 'Fixture Healing' },
  { id: '1c8e1e5d-3e5b-4c6a-8b41-2d0b4a7d5c10', name: 'Fixture Protection' },
];

const done = () => {};

export const Adding: Story = () => (
  <Modal title="Add Category" onClose={done}>
    <CategoryForm groups={GROUPS} onDone={done} />
  </Modal>
);

export const Editing: Story = () => (
  <Modal title="Edit Category" onClose={done}>
    <CategoryForm
      category={{
        id: '5a0e3c2b-7d6f-4e1a-9b8c-0f1e2d3c4b5a',
        name: 'Testcraft',
        description: 'An invented category, for the workshop.',
        groupId: GROUPS[1].id,
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
