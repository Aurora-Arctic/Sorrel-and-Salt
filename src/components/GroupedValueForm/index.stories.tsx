import type { Story } from '@ladle/react';
import { GROUP_NAMES, asOptions } from '../../../.ladle/fixtures';
import { usePressOnMount } from '../../../.ladle/press';
import { Reopenable } from '../../../.ladle/reopenable';
import { FORM_GROUP_ICONS } from '../../modules/vocabulary/schema/form-group-icons';
import Modal from '../Modal';
import GroupedValueForm from '.';

// Render-only; behaviour is asserted in tests/components/GroupedValueForm.
// Every kind, the flat celestial bodies and signs among them (MB.115).
// The workshop has no API, so a save answers with the form's generic error.
// Shown in the modal the admin pages open it in.
export default {
  title: 'Admin / Grouped Value Form',
};

// Enough of each to narrow: every group field is typed into (MB.115).
const CATEGORY_GROUPS = asOptions(GROUP_NAMES.category);
// A form group's choices draw its icon: the first two their own, one none (the generic).
const FORM_GROUPS = asOptions(GROUP_NAMES.form).map((group, index) => ({
  ...group,
  icon: index === 3 ? null : FORM_GROUP_ICONS[index],
}));
const TRADITIONS = asOptions(GROUP_NAMES.tradition);

const done = () => {};

export const AddingACategory: Story = () => (
  <Reopenable>
    {(close) => (
      <Modal title="Add Category" onClose={close}>
        <GroupedValueForm kind="category" groups={CATEGORY_GROUPS} onDone={done} />
      </Modal>
    )}
  </Reopenable>
);

export const EditingACategory: Story = () => (
  <Reopenable>
    {(close) => (
      <Modal eyebrow="Edit Category" title="Testcraft" onClose={close}>
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
    )}
  </Reopenable>
);

export const AddingAForm: Story = () => (
  <Reopenable>
    {(close) => (
      <Modal title="Add Form" onClose={close}>
        <GroupedValueForm kind="form" groups={FORM_GROUPS} onDone={done} />
      </Modal>
    )}
  </Reopenable>
);

// Rename it to see the note by Save that the rename carries onto the compendium.
export const EditingAForm: Story = () => (
  <Reopenable>
    {(close) => (
      <Modal eyebrow="Edit Form" title="Testwort Shard" onClose={close}>
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
    )}
  </Reopenable>
);

export const AddingADeity: Story = () => (
  <Reopenable>
    {(close) => (
      <Modal title="Add Deity" onClose={close}>
        <GroupedValueForm kind="deity" groups={TRADITIONS} onDone={done} />
      </Modal>
    )}
  </Reopenable>
);

// Rename it to see the note by Save that the rename carries onto the
// compendium, and the head keep the name it was saved under, its tradition
// after it, as a deity's pills name it (MB.115).
export const EditingADeity: Story = () => (
  <Reopenable>
    {(close) => (
      <Modal eyebrow="Edit Deity" title="Testra" qualifier="Fixtural" onClose={close}>
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
    )}
  </Reopenable>
);

export const AddingACelestialBody: Story = () => (
  <Reopenable>
    {(close) => (
      <Modal title="Add Celestial Body" onClose={close}>
        <GroupedValueForm kind="celestialBody" onDone={done} />
      </Modal>
    )}
  </Reopenable>
);

// A flat kind has no group field. Rename it to see the note by Save that the
// rename carries onto the compendium.
export const EditingAZodiacSign: Story = () => (
  <Reopenable>
    {(close) => (
      <Modal eyebrow="Edit Zodiac Sign" title="Fixture Ram" onClose={close}>
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
    )}
  </Reopenable>
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
AddingACelestialBody.meta = { iframed: true };
EditingAZodiacSign.meta = { iframed: true };
AskingToDelete.meta = { iframed: true };
PhoneDark.meta = { iframed: true, theme: 'dark', width: 375 };
PhoneLight.meta = { iframed: true, theme: 'light', width: 375 };
EditingADeityDark.meta = { iframed: true, theme: 'dark' };
EditingADeityLight.meta = { iframed: true, theme: 'light' };
EditingADeityPhoneDark.meta = { iframed: true, theme: 'dark', width: 375 };
EditingADeityPhoneLight.meta = { iframed: true, theme: 'light', width: 375 };
