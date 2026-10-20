'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';
import { useOpenModalClick } from '../Modal';
import IconTip from './icon-tip';
import { AnnotateIcon, MysticEyeIcon, PencilIcon } from './icons';
import type { EditLinkProps } from './types';

/**
 * A list row's icon link into a dialog: the icon alone, at the larger size a
 * row takes, with its tip. Named by its verb and the row's own name in hidden
 * text, as the word link it replaced was, since a column of bare verbs is no
 * help to a screen reader. A press opens the row's modal at once under
 * `heading`, its form arriving with the navigation (M9.18); a link still, so a
 * new tab, or a press before the script loads, opens the address.
 */
const IconLink = ({
  href,
  name,
  heading,
  verb,
  icon,
  place,
  className = 'icon-tip__edit',
}: EditLinkProps & {
  verb: string;
  icon: ReactElement;
  place?: string;
  className?: string;
}): ReactElement => {
  const onClick = useOpenModalClick(href, heading, place);
  return (
    <IconTip tip={verb}>
      <Link className={className} href={href} onClick={onClick}>
        {icon}
        <span className="visually-hidden">
          {verb} {name}
        </span>
      </Link>
    </IconTip>
  );
};

/** A row's Edit: the pencil. */
export const EditLink = (props: EditLinkProps): ReactElement => (
  <IconLink {...props} verb="Edit" icon={<PencilIcon />} />
);

/**
 * A compendium entry's Annotate in a coven's list (M8.17): `AnnotateIcon`, not
 * Edit's pencil, since it writes the coven's notes over the entry
 * rather than changing the entry.
 */
export const AnnotateLink = (props: EditLinkProps): ReactElement => (
  <IconLink {...props} verb="Annotate" icon={<AnnotateIcon />} />
);

/**
 * An entry's Quick Look in a list (M12.5): the eye beside its name, opening
 * the entry's details over the list in the modal place `place` names, the
 * name itself still a plain link to the entry's page. Its own class, not
 * Edit's, as it sits in the name's line rather than a row's foot.
 */
export const QuickLookLink = (props: EditLinkProps & { place?: string }): ReactElement => (
  <IconLink {...props} verb="Quick Look" icon={<MysticEyeIcon />} className="icon-tip__look" />
);
