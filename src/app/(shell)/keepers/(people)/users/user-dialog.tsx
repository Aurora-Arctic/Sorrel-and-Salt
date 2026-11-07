'use client';

import type { ReactElement } from 'react';
import { RouteModal } from '../../../../../components/Modal';
import UserDetail from '../../../../../components/UserDetail';
import type { UserDialogProps } from './types';

// The users page's modal, opened by `?user=<id>` or at once by a press. The client edge between the
// server page and the body, as `RouteModal` takes a function a server component cannot pass. Always
// rendered, so a press's skeleton and the covens replacing it are one dialog.
export default function UserDialog({
  closeHref,
  opened,
  canImpersonate,
  changesPaused,
  place,
}: UserDialogProps): ReactElement {
  return (
    <RouteModal
      closeHref={closeHref}
      place={place}
      content={
        opened && {
          heading: opened.heading,
          body: () => (
            <UserDetail
              key={opened.user.id}
              user={opened.user}
              memberships={opened.memberships}
              timeouts={opened.timeouts}
              pauses={opened.pauses}
              canImpersonate={canImpersonate}
              changesPaused={changesPaused}
            />
          ),
        }
      }
    />
  );
}
