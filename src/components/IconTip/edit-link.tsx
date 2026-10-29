'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';
import { useOpenModalClick } from '../Modal';
import IconTip from './icon-tip';
import { AnnotateIcon, MysticEyeIcon, PencilIcon } from './icons';
import type { EditLinkProps } from './types';

/** A list row's icon link into a dialog, named by its verb and the row's name in hidden text; a press opens the row's modal at once under `heading`, and the link still works as an address. */
const IconLink = ({
  href,
  name,
  heading,
  ref,
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
      <Link ref={ref} className={className} href={href} onClick={onClick}>
        {icon}
        <span className="visually-hidden">
          {verb} {name}
        </span>
      </Link>
    </IconTip>
  );
};

/** A row's Edit: the pencil. `className` replaces the default green look (the coven card's plain one). */
export const EditLink = ({
  className,
  ...props
}: EditLinkProps & { className?: string }): ReactElement => (
  <IconLink {...props} className={className} verb="Edit" icon={<PencilIcon />} />
);

/** Edit on a compendium entry for an admin or a curator: named and tipped "Edit in Compendium", so it cannot be taken for a coven's own choice. */
export const CompendiumEditLink = ({
  className,
  ...props
}: EditLinkProps & { className?: string }): ReactElement => (
  <IconLink {...props} className={className} verb="Edit in Compendium" icon={<PencilIcon />} />
);

/** A compendium entry's Annotate in a coven's list: `AnnotateIcon`, not Edit's pencil, since it writes the coven's notes over the entry. */
export const AnnotateLink = ({
  className,
  ...props
}: EditLinkProps & { className?: string }): ReactElement => (
  <IconLink {...props} className={className} verb="Annotate" icon={<AnnotateIcon />} />
);

/** An entry's Quick Look in a list: the eye beside its name, opening the details in the modal place `place` names, in its own class as it sits in the name's line. */
export const QuickLookLink = (props: EditLinkProps & { place?: string }): ReactElement => (
  <IconLink {...props} verb="Quick Look" icon={<MysticEyeIcon />} className="icon-tip__look" />
);
