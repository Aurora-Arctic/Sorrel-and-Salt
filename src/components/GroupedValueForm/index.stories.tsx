import type { Story } from '@ladle/react';
import { GROUP_NAMES, asOptions } from '../../../.ladle/fixtures';
import { usePressOnMount } from '../../../.ladle/press';
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
const CATEGORY_GROUPS = asOptions(GROUP_NAMES.category);
const FORM_GROUPS = asOptions(GROUP_NAMES.form);
const TRADITIONS = asOptions(GROUP_NAMES.tradition);

const done = () => {};

export const AddingACategory: Story = () => (
  <Modal title="Add Category" onClose={done}>
    <GroupedValueForm kind="category" groups={CATEGORY_GROUPS} onDone={done} />
  </Modal>
);

export const EditingACategory: Story = () => (
  <Modal eyebrow="Edit Category" title="Testcraft" onClose={done}>
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
  <Modal eyebrow="Edit Form" title="Testwort Shard" onClose={done}>
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

// Rename it to see the note by Save that the rename carries onto the
// compendium, and the head keep the name it was saved under, its tradition
// after it, as a deity's pills name it (MB.115).
export const EditingADeity: Story = () => (
  <Modal eyebrow="Edit Deity" title="Testra" qualifier="Fixtural" onClose={done}>
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
  <Modal eyebrow="Edit Zodiac Sign" title="Fixture Ram" onClose={done}>
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

// Delete pressed once drawn, as a person would: the question over the form,
// dimmed and held beneath it until Delete or Keep It answers (MB.115).
export const AskingToDelete: Story = () => {
  usePressOnMount('Delete Category');
  return <EditingACategory />;
};

// At a phone's width in each theme: the modal inset from the screen's edge,
// and the form under 28rem of its own width, so its buttons stack. Type into
// Group to see its list narrow beneath it, inside the modal.
export const PhoneDark: Story = () => <EditingACategory />;
export const PhoneLight: Story = () => <EditingACategory />;

// An edit's head in each theme, at a desktop's width and a phone's (MB.115).
export const EditingADeityDark: Story = () => <EditingADeity />;
export const EditingADeityLight: Story = () => <EditingADeity />;
export const EditingADeityPhoneDark: Story = () => <EditingADeity />;
export const EditingADeityPhoneLight: Story = () => <EditingADeity />;

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
AskingToDelete.meta = { iframed: true };
PhoneDark.meta = { iframed: true, theme: 'dark', width: 375 };
PhoneLight.meta = { iframed: true, theme: 'light', width: 375 };
EditingADeityDark.meta = { iframed: true, theme: 'dark' };
EditingADeityLight.meta = { iframed: true, theme: 'light' };
EditingADeityPhoneDark.meta = { iframed: true, theme: 'dark', width: 375 };
EditingADeityPhoneLight.meta = { iframed: true, theme: 'light', width: 375 };
