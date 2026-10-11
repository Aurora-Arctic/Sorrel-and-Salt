'use client';

import type { ReactElement } from 'react';
import GroupedValueForm from '../../components/GroupedValueForm';
import { RouteModal } from '../../components/Modal';
import type { ValueDialogProps } from './types';

// A curated value page's modal, opened by its address. The client edge
// between the server page and the form: `RouteModal` hands its contents the
// modal's own close as a function, which a server component cannot pass.
export default function ValueDialog({
  kind,
  title,
  closeHref,
  value,
  groups,
}: ValueDialogProps): ReactElement {
  return (
    <RouteModal title={title} closeHref={closeHref}>
      {(done) => <GroupedValueForm kind={kind} value={value} groups={groups} onDone={done} />}
    </RouteModal>
  );
}
