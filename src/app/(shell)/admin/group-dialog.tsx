'use client';

import type { ReactElement } from 'react';
import GroupForm from '../../../components/GroupForm';
import { RouteModal } from '../../../components/Modal';
import type { GroupDialogProps } from './types';

// A group page's modal, opened by its address or at once by a press. The client edge between the
// server page and the form, as `RouteModal` hands its contents the modal's close as a function a
// server component cannot pass. Rendered whatever the address opens. A save closes it whatever it
// changed, since a rename moves the group's address, and a form group's or tradition's moves its
// rows' too.
export default function GroupDialog({
  kind,
  closeHref,
  opened,
  groups,
}: GroupDialogProps): ReactElement {
  return (
    <RouteModal
      closeHref={closeHref}
      content={
        opened && {
          heading: opened.heading,
          body: (done) => (
            <GroupForm
              // A fresh form per group: one opened after another starts from its own values.
              key={opened.group?.id ?? 'new'}
              kind={kind}
              group={opened.group}
              groups={groups}
              memberCount={opened.memberCount}
              onDone={done}
            />
          ),
        }
      }
    />
  );
}
