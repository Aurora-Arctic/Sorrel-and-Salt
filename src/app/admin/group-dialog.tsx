'use client';

import type { ReactElement } from 'react';
import GroupForm from '../../components/GroupForm';
import { RouteModal } from '../../components/Modal';
import type { GroupDialogProps } from './types';

// A group page's modal, opened by its address. The client edge between the
// server page and the form: `RouteModal` hands its contents the modal's own
// close as a function, which a server component cannot pass. A save closes
// it whatever it changed, since a rename moves the group's address, and a
// form group's or a tradition's moves its rows' too.
export default function GroupDialog({
  kind,
  title,
  closeHref,
  group,
  groups,
  memberCount,
}: GroupDialogProps): ReactElement {
  return (
    <RouteModal title={title} closeHref={closeHref}>
      {(done) => (
        <GroupForm
          kind={kind}
          group={group}
          groups={groups}
          memberCount={memberCount}
          onDone={done}
        />
      )}
    </RouteModal>
  );
}
