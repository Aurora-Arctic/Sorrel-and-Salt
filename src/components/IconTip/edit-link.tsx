'use client';

import type { ReactElement } from 'react';
import { ModalLink, useOpenModalClick } from '../Modal';
import IconTip from './icon-tip';
import { AnnotateIcon, MysticEyeIcon, PencilIcon } from './icons';
import type { EditLinkProps } from './types';

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
      <ModalLink ref={ref} className={className} href={href} onClick={onClick}>
        {icon}
        <span className="visually-hidden">
          {verb} {name}
        </span>
      </ModalLink>
    </IconTip>
  );
};

export const EditLink = ({
  className,
  ...props
}: EditLinkProps & { className?: string }): ReactElement => (
  <IconLink {...props} className={className} verb="Edit" icon={<PencilIcon />} />
);

/** Edit on a compendium entry for a keeper or a curator: named and tipped "Edit in Compendium", so it cannot be taken for a coven's own choice. */
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

export const QuickLookLink = (props: EditLinkProps & { place?: string }): ReactElement => (
  <IconLink {...props} verb="Quick Look" icon={<MysticEyeIcon />} className="icon-tip__look" />
);
