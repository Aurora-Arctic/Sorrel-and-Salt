import type { Story } from '@ladle/react';
import { GROUP_NAMES, asOptions } from '../../../.ladle/fixtures';
import { usePressOnMount } from '../../../.ladle/press';
import { Reopenable } from '../../../.ladle/reopenable';
import Modal from '../Modal';
import GroupForm from '.';

// Render-only; behaviour is asserted in tests/components/GroupForm. The
// workshop has no API, so a save answers with the form's generic error. Shown
// in the modal the admin pages open it in.
export default {
  title: 'Admin / Group Form',
};

// Two of the shared groups, and the one edited here. The first two carry an
// icon, which a form group's move-to choices draw: the first its own, the
// second none, so the generic.
const GROUPS = [
  ...asOptions(GROUP_NAMES.form.slice(0, 2)).map((group, index) => ({
    ...group,
    icon: index === 0 ? ('mineral' as const) : null,
  })),
  { id: '5a0e3c2b-7d6f-4e1a-9b8c-0f1e2d3c4b5a', name: 'Testwort Wards' },
];

const WARDS = {
  id: GROUPS[2].id,
  name: 'Testwort Wards',
  description: 'An invented group, for the workshop.',
  colorDark: '#5d8ab1',
  colorLight: '#286ba6',
  icon: '' as const,
};

const done = () => {};

export const AddingACategoryGroup: Story = () => (
  <Reopenable>
    {(close) => (
      <Modal title="Add Category Group" onClose={close}>
        <GroupForm kind="category" groups={GROUPS} onDone={done} />
      </Modal>
    )}
  </Reopenable>
);

// Press Delete Group to see the move: a group to choose, then the confirmation.
export const EditingACategoryGroup: Story = () => (
  <Reopenable>
    {(close) => (
      <Modal eyebrow="Edit Category Group" title={WARDS.name} onClose={close}>
        <GroupForm kind="category" group={WARDS} groups={GROUPS} memberCount={3} onDone={done} />
      </Modal>
    )}
  </Reopenable>
);

// A form group adds its icon: six, and None last for the generic.
export const AddingAFormGroup: Story = () => (
  <Reopenable>
    {(close) => (
      <Modal title="Add Form Group" onClose={close}>
        <GroupForm kind="form" groups={GROUPS} onDone={done} />
      </Modal>
    )}
  </Reopenable>
);

export const EditingAFormGroup: Story = () => (
  <Reopenable>
    {(close) => (
      <Modal eyebrow="Edit Form Group" title="Testwort Matter" onClose={close}>
        <GroupForm
          kind="form"
          group={{
            ...WARDS,
            name: 'Testwort Matter',
            colorDark: '',
            colorLight: '',
            icon: 'mineral',
          }}
          groups={GROUPS}
          memberCount={0}
          onDone={done}
        />
      </Modal>
    )}
  </Reopenable>
);

const TRADITIONS = asOptions(GROUP_NAMES.tradition.slice(0, 2));

export const AddingATradition: Story = () => (
  <Reopenable>
    {(close) => (
      <Modal title="Add Tradition" onClose={close}>
        <GroupForm kind="tradition" groups={TRADITIONS} onDone={done} />
      </Modal>
    )}
  </Reopenable>
);

// Press Delete Tradition to see the move: its two deities to another tradition.
export const EditingATradition: Story = () => (
  <Reopenable>
    {(close) => (
      <Modal eyebrow="Edit Tradition" title="Fixtural" onClose={close}>
        <GroupForm
          kind="tradition"
          group={{
            id: TRADITIONS[0].id,
            name: 'Fixtural',
            description: 'An invented tradition, for the workshop.',
            colorDark: '',
            colorLight: '',
            icon: '',
          }}
          groups={TRADITIONS}
          memberCount={2}
          onDone={done}
        />
      </Modal>
    )}
  </Reopenable>
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
