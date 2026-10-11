import type { Story } from '@ladle/react';
import Modal from '../Modal';
import GroupedValueForm from '.';

// Render-only; behaviour is asserted in tests/components/GroupedValueForm.
// Every kind, the flat planets and signs among them (MB.115).
// The workshop has no API, so a save answers with the form's generic error.
// Shown in the modal the admin pages open it in.
export default {
  title: 'Admin / Grouped Value Form',
};

// Enough of each to narrow: every group field is typed into (MB.115).
const CATEGORY_GROUPS = [
  { id: '0b9f0f6e-2f4c-4d7a-9a52-3c1c5b8e6d21', name: 'Fixture Healing' },
  { id: '1c8e1e5d-3e5b-4c6a-8b41-2d0b4a7d5c10', name: 'Fixture Protection' },
  { id: '2d7d2d4c-4f6a-4b59-9c30-1e9a3b6c4f0f', name: 'Mock Divination' },
  { id: '3e6c3c3b-5a79-4a48-8d2f-0d8b2a5b3e1e', name: 'Stub Prosperity' },
];

const FORM_GROUPS = [
  { id: '0b9f0f6e-2f4c-4d7a-9a52-3c1c5b8e6d21', name: 'Fixture Mineral' },
  { id: '1c8e1e5d-3e5b-4c6a-8b41-2d0b4a7d5c10', name: 'Fixture Substance' },
  { id: '2d7d2d4c-4f6a-4b59-9c30-1e9a3b6c4f0f', name: 'Mock Preparation' },
  { id: '3e6c3c3b-5a79-4a48-8d2f-0d8b2a5b3e1e', name: 'Stub Plant Part' },
];

const TRADITIONS = [
  { id: '0b9f0f6e-2f4c-4d7a-9a52-3c1c5b8e6d21', name: 'Fixtural' },
  { id: '1c8e1e5d-3e5b-4c6a-8b41-2d0b4a7d5c10', name: 'Mockish' },
  { id: '2d7d2d4c-4f6a-4b59-9c30-1e9a3b6c4f0f', name: 'Old Testic' },
  { id: '3e6c3c3b-5a79-4a48-8d2f-0d8b2a5b3e1e', name: 'Stubbish' },
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

export const AddingAPlanet: Story = () => (
  <Modal title="Add Planet" onClose={done}>
    <GroupedValueForm kind="planet" onDone={done} />
  </Modal>
);

// A flat kind has no group field. Rename it to see the note by Save that the
// rename carries onto the compendium.
export const EditingAZodiacSign: Story = () => (
  <Modal title="Edit Zodiac Sign" onClose={done}>
    <GroupedValueForm
      kind="zodiacSign"
      value={{
        id: '5a0e3c2b-7d6f-4e1a-9b8c-0f1e2d3c4b5a',
        name: 'Fixture Ram',
        description: 'An invented sign, for the workshop.',
      }}
      onDone={done}
    />
  </Modal>
);

// At a phone's width in each theme: the modal inset from the screen's edge,
// and the form under 28rem of its own width, so its buttons stack. Type into
// Group to see its list narrow beneath it, inside the modal.
export const PhoneDark: Story = () => <EditingACategory />;
export const PhoneLight: Story = () => <EditingACategory />;

// Each in its own iframe, so the modal's top layer covers the story's frame
// rather than Ladle's sidebar.
AddingACategory.meta = { iframed: true };
EditingACategory.meta = { iframed: true };
AddingAForm.meta = { iframed: true };
EditingAForm.meta = { iframed: true };
AddingADeity.meta = { iframed: true };
EditingADeity.meta = { iframed: true };
AddingAPlanet.meta = { iframed: true };
EditingAZodiacSign.meta = { iframed: true };
PhoneDark.meta = { iframed: true, theme: 'dark', width: 375 };
PhoneLight.meta = { iframed: true, theme: 'light', width: 375 };
