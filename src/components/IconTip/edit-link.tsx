'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';
import { useOpenModalClick } from '../Modal';
import IconTip from './icon-tip';
import { PencilIcon } from './icons';
import type { EditLinkProps } from './types';

/**
 * A list row's Edit: the pencil alone, at the larger size a row takes, with
 * its tip. Named "Edit" and the row's own name in hidden text, as the word
 * link it replaced was, since a column of bare "Edit"s is no help to a
 * screen reader. A press opens the row's modal at once under `heading`, its
 * form arriving with the navigation (M9.18); a link still, so a new tab, or a
 * press before the script loads, opens the address.
 */
export const EditLink = ({ href, name, heading }: EditLinkProps): ReactElement => {
  const onClick = useOpenModalClick(href, heading);
  return (
    <IconTip tip="Edit">
      <Link className="icon-tip__edit" href={href} onClick={onClick}>
        <PencilIcon />
        <span className="visually-hidden">Edit {name}</span>
      </Link>
    </IconTip>
  );
};
