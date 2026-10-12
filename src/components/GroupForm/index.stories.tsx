import type { Story } from '@ladle/react';
import { GROUP_NAMES, asOptions } from '../../../.ladle/fixtures';
import { usePressOnMount } from '../../../.ladle/press';
import Modal from '../Modal';
import GroupForm from '.';

// Render-only; behaviour is asserted in tests/components/GroupForm. The
// workshop has no API, so a save answers with the form's generic error. Shown
// in the modal the admin pages open it in.
export default {
  title: 'Admin / Group Form',
};

// Two of the shared groups, and the one edited here.
const GROUPS = [
  ...asOptions(GROUP_NAMES.form.slice(0, 2)),
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
  <Modal eyebrow="Edit Category Group" title={WARDS.name} onClose={done}>
    <GroupForm kind="category" group={WARDS} groups={GROUPS} memberCount={3} onDone={done} />
  </Modal>
);

export const EditingAFormGroup: Story = () => (
  <Modal eyebrow="Edit Form Group" title="Testwort Matter" onClose={done}>
    <GroupForm
      kind="form"
      group={{ ...WARDS, name: 'Testwort Matter', colorDark: '', colorLight: '' }}
      groups={GROUPS}
      memberCount={0}
      onDone={done}
    />
  </Modal>
);

const TRADITIONS = asOptions(GROUP_NAMES.tradition.slice(0, 2));

export const AddingATradition: Story = () => (
  <Modal title="Add Tradition" onClose={done}>
    <GroupForm kind="tradition" groups={TRADITIONS} onDone={done} />
  </Modal>
);

// Press Delete Tradition to see the move: its two deities to another tradition.
export const EditingATradition: Story = () => (
  <Modal eyebrow="Edit Tradition" title="Fixtural" onClose={done}>
    <GroupForm
      kind="tradition"
      group={{
        id: TRADITIONS[0].id,
        name: 'Fixtural',
        description: 'An invented tradition, for the workshop.',
        colorDark: '',
        colorLight: '',
      }}
      groups={TRADITIONS}
      memberCount={2}
      onDone={done}
    />
  </Modal>
);

// Delete Group pressed once drawn, as a person would: the first step, where
// its categories go, asked over the form, which is dimmed and held beneath it
// (MB.115).
export const AskingWhereToMove: Story = () => {
  usePressOnMount('Delete Group');
  return <EditingACategoryGroup />;
};

// At a phone's width, in each theme: the fields, the two pickers and the
// buttons, which stack under the form's 28rem.
export const PhoneDark: Story = () => <EditingACategoryGroup />;

export const PhoneLight: Story = () => <EditingACategoryGroup />;

// Each in its own iframe, so the modal's top layer covers the story's frame
// rather than Ladle's sidebar.
AddingACategoryGroup.meta = { iframed: true };
EditingACategoryGroup.meta = { iframed: true };
EditingAFormGroup.meta = { iframed: true };
AddingATradition.meta = { iframed: true };
EditingATradition.meta = { iframed: true };
AskingWhereToMove.meta = { iframed: true };
PhoneDark.meta = { theme: 'dark', width: 375, iframed: true };
PhoneLight.meta = { theme: 'light', width: 375, iframed: true };
