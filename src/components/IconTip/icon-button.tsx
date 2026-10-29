'use client';

import type { ReactElement, Ref } from 'react';
import MenuButton from '../MenuButton';
import type { MenuButtonChoices } from '../MenuButton/types';
import IconTip from './icon-tip';
import { AnnotateIcon, BinIcon, DotsIcon, MysticEyeIcon } from './icons';

// The icon controls that are a button rather than a link, shared by the coven cards' foot, the entry page and the Quick Look window so the places cannot differ
// (claude-docs/components/icon-tip.md).

/** The bin: a Delete or a Remove, in the wax a remove control wears, as a lone choice of the More. */
export const BinButton = ({
  verb,
  name,
  onClick,
  ref,
}: {
  /** "Delete Ingredient" on a coven's own entry, "Remove" on a compendium entry it holds. */
  verb: string;
  /** The entry, read after the verb. */
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

/** Annotate as a button, where a press asks which coven first; the one coven's is `AnnotateLink`. */
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
  /** `small`: the eye at 1rem in a 24px box, for a row already full (a spell's steps). */
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

/** The three dots: a menu of further choices, in the page's ink, always in labelled Compendium and Coven sections; a lone Delete or Remove is the bin instead. */
export const MoreMenu = ({
  name,
  ref,
  ...choices
}: MenuButtonChoices & {
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
