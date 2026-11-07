'use client';

import type { ReactElement, Ref } from 'react';
import MenuButton from '../MenuButton';
import type { MenuButtonChoices, MenuButtonProps } from '../MenuButton/types';
import IconTip from './icon-tip';
import {
  AnnotateIcon,
  BinIcon,
  CauldronIcon,
  DotsIcon,
  MysticEyeIcon,
  PencilIcon,
  PreviewIcon,
} from './icons';

// The icon controls that are a button rather than a link, shared by the coven cards' foot, the entry page and the Quick Look window so the places cannot differ
// (claude-docs/components/icon-tip.md).

export const BinButton = ({
  verb,
  name,
  onClick,
  ref,
}: {
  verb: string;
  name: string;
  onClick: () => void;
  ref?: Ref<HTMLButtonElement>;
}): ReactElement => (
  <IconTip tip={verb}>
    <button ref={ref} type="button" className="icon-tip__remove" onClick={onClick}>
      <BinIcon />
      <span className="visually-hidden">
        {verb} {name}
      </span>
    </button>
  </IconTip>
);

/** The pencil as a button, where Edit opens a dialog in the page rather than going to an address. */
export const EditButton = ({
  name,
  onClick,
  plain = false,
  ref,
}: {
  name: string;
  plain?: boolean;
  onClick: () => void;
  ref?: Ref<HTMLButtonElement>;
}): ReactElement => (
  <IconTip tip="Edit">
    <button
      ref={ref}
      type="button"
      className={plain ? 'icon-tip__edit icon-tip__edit--plain' : 'icon-tip__edit'}
      onClick={onClick}
    >
      <PencilIcon />
      <span className="visually-hidden">Edit {name}</span>
    </button>
  </IconTip>
);

export const AnnotateButton = ({
  name,
  onClick,
  ref,
}: {
  name: string;
  onClick: () => void;
  ref?: Ref<HTMLButtonElement>;
}): ReactElement => (
  <IconTip tip="Annotate">
    <button ref={ref} type="button" className="icon-tip__edit" onClick={onClick}>
      <AnnotateIcon />
      <span className="visually-hidden">Annotate {name}</span>
    </button>
  </IconTip>
);

/** Quick Look as a button, where the details open in the page rather than at an address, such as over the Add Ingredient form's held duplicates; elsewhere the eye is `QuickLookLink`. */
export const QuickLookButton = ({
  name,
  onClick,
  size,
  ref,
}: {
  name: string;
  onClick: () => void;
  size?: 'small';
  ref?: Ref<HTMLButtonElement>;
}): ReactElement => (
  <IconTip tip="Quick Look">
    <button
      ref={ref}
      type="button"
      className={size === 'small' ? 'icon-tip__look icon-tip__look--small' : 'icon-tip__look'}
      onClick={onClick}
    >
      <MysticEyeIcon />
      <span className="visually-hidden">Quick Look {name}</span>
    </button>
  </IconTip>
);

export const PreviewButton = ({
  name,
  onClick,
  ref,
}: {
  name: string;
  onClick: () => void;
  ref?: Ref<HTMLButtonElement>;
}): ReactElement => (
  <IconTip tip="Preview">
    <button
      ref={ref}
      type="button"
      className="icon-tip__edit icon-tip__edit--plain"
      onClick={onClick}
    >
      <PreviewIcon />
      <span className="visually-hidden">Preview Spell {name}</span>
    </button>
  </IconTip>
);

export const RecordButton = ({
  name,
  onClick,
  ref,
}: {
  name: string;
  onClick: () => void;
  ref?: Ref<HTMLButtonElement>;
}): ReactElement => (
  <IconTip tip="Record a Working">
    <button ref={ref} type="button" className="icon-tip__edit" onClick={onClick}>
      <CauldronIcon />
      <span className="visually-hidden">Record a Working of {name}</span>
    </button>
  </IconTip>
);

export const MoreMenu = ({
  name,
  ref,
  ...choices
}: MenuButtonChoices &
  Pick<MenuButtonProps, 'busy' | 'busyLabel'> & {
    name: string;
    ref?: Ref<HTMLButtonElement>;
  }): ReactElement => (
  <IconTip tip="More">
    <MenuButton
      ref={ref}
      label={`More for ${name}`}
      className="icon-tip__edit icon-tip__more"
      icon={<DotsIcon />}
      {...choices}
    />
  </IconTip>
);
