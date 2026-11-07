'use client';

import type { ComponentProps, ReactElement } from 'react';
import { PendingLink } from '../../lib/navigation';

/** A link whose address opens a modal over the page: `scroll={false}`, since a modal opening leaves the page where it is, which a plain `next/link` would not. */
const ModalLink = (props: ComponentProps<typeof PendingLink>): ReactElement => (
  <PendingLink scroll={false} {...props} />
);

export default ModalLink;
