import Link from 'next/link';
import type { ReactElement } from 'react';
import IconTip from './icon-tip';
import { PencilIcon } from './icons';
import type { EditLinkProps } from './types';

/**
 * A list row's Edit: the pencil alone, at the larger size a row takes, with
 * its tip. Named "Edit" and the row's own name in hidden text, as the word
 * link it replaced was, since a column of bare "Edit"s is no help to a
 * screen reader. A soft navigation: the page renders again with its modal
 * open.
 */
export const EditLink = ({ href, name }: EditLinkProps): ReactElement => (
  <IconTip tip="Edit">
    <Link className="icon-tip__edit" href={href}>
      <PencilIcon />
      <span className="visually-hidden">Edit {name}</span>
    </Link>
  </IconTip>
);
