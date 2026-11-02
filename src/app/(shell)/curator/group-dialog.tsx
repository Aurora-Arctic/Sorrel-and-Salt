'use client';

import type { ReactElement } from 'react';
import GroupForm from '../../../components/GroupForm';
import { RouteModal } from '../../../components/Modal';
import type { GroupDialogProps } from './types';

// A group page's modal, opened by its address or at once by a press. The client edge between server
// page and form, as `RouteModal` hands its contents `close`, which a server component cannot pass. A
// save closes it, since a rename moves the group's address and its rows'.
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
