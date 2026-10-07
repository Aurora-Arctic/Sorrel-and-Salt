import type { Story } from '@ladle/react';
import Modal from '../Modal';
import GroupForm from '.';

// Render-only; behaviour is asserted in tests/components/GroupForm. The
// workshop has no API, so a save answers with the form's generic error. Shown
// in the modal the admin pages open it in.
export default {
  title: 'Admin / Group Form',
};

const GROUPS = [
  { id: '0b9f0f6e-2f4c-4d7a-9a52-3c1c5b8e6d21', name: 'Fixture Mineral' },
  { id: '1c8e1e5d-3e5b-4c6a-8b41-2d0b4a7d5c10', name: 'Fixture Substance' },
  { id: '5a0e3c2b-7d6f-4e1a-9b8c-0f1e2d3c4b5a', name: 'Testwort Wards' },
];

const WARDS = {
  id: GROUPS[2].id,
  name: 'Testwort Wards',
  description: 'An invented group, for the workshop.',
  colorDark: '#5d8ab1',
  colorLight: '#286ba6',
};

const done = () => {};

export const AddingACategoryGroup: Story = () => (
  <Modal title="Add Category Group" onClose={done}>
    <GroupForm kind="category" groups={GROUPS} onDone={done} />
  </Modal>
);

// Press Delete Group to see the move: a group to choose, then the confirmation.
export const EditingACategoryGroup: Story = () => (
  <Modal title="Edit Category Group" onClose={done}>
    <GroupForm kind="category" group={WARDS} groups={GROUPS} memberCount={3} onDone={done} />
  </Modal>
);

export const EditingAFormGroup: Story = () => (
  <Modal title="Edit Form Group" onClose={done}>
    <GroupForm
      kind="form"
      group={{ ...WARDS, name: 'Testwort Matter', colorDark: '', colorLight: '' }}
      groups={GROUPS}
      memberCount={0}
      onDone={done}
    />
  </Modal>
);

// Each in its own iframe, so the modal's top layer covers the story's frame
// rather than Ladle's sidebar.
AddingACategoryGroup.meta = { iframed: true };
EditingACategoryGroup.meta = { iframed: true };
EditingAFormGroup.meta = { iframed: true };
