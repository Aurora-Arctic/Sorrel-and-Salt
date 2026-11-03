'use client';

import type { ReactElement } from 'react';
import GroupedValueForm from '../../../components/GroupedValueForm';
import { RouteModal } from '../../../components/Modal';
import type { ValueDialogProps } from './types';

// A curated value page's modal, opened by its address or at once by a press. The client edge between
// server page and form, as `RouteModal` hands its contents `close`, which a server component cannot
// pass. Always rendered, so a press's skeleton and the form replacing it are one dialog.
export default function ValueDialog({
  kind,
  closeHref,
  opened,
  groups,
}: ValueDialogProps): ReactElement {
  return (
    <RouteModal
      closeHref={closeHref}
      content={
        opened && {
          heading: opened.heading,
          body: (done) => (
            <GroupedValueForm
              // A fresh form per value: one opened after another starts from its own values.
              key={opened.value?.id ?? 'new'}
              kind={kind}
              value={opened.value}
              groups={groups}
              onDone={done}
            />
          ),
        }
      }
    />
  );
}
