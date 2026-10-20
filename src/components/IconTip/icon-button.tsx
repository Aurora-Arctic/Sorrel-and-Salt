'use client';

import type { ReactElement, Ref } from 'react';
import MenuButton from '../MenuButton';
import type { MenuButtonChoices } from '../MenuButton/types';
import IconTip from './icon-tip';
import { AnnotateIcon, BinIcon, DotsIcon } from './icons';

// The icon controls that are a button rather than a link, shared by the coven cards' foot and
// the entry page and Quick Look window's row (the owner's call, 2026-10-20: an entry's actions
// follow the cards' conventions), so the places cannot differ: the bin, the annotate icon that
// asks which coven first, and the three dots that open a menu. Each is named by its verb and the
// entry in hidden text, with the verb as its tip, as the dialog links beside them are.
// claude-docs/components/icon-tip.md.

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

/**
 * The three dots: a menu of the entry's further choices, in the ink of the page rather than the
 * green of Edit, as the card has it. Only where there are more choices than the icons beside it
 * already offer, always drawn in labelled Compendium and Coven sections through `choicesFor`, even
 * where it holds only one kind (the owner's call, 2026-10-20). A lone Delete or Remove is not a
 * menu of one: the caller draws it as the bin instead and does not render this.
 */
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
