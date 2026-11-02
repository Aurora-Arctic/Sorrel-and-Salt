'use client';

import Link from 'next/link';
import type { ComponentProps, ReactElement } from 'react';

/** A link whose address opens a modal over the page: `scroll={false}`, since a modal opening leaves the page where it is, which a plain `next/link` would not. */
const ModalLink = (props: ComponentProps<typeof Link>): ReactElement => (
  <Link scroll={false} {...props} />
);

export default ModalLink;
