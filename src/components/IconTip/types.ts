import type { Route } from 'next';
import type { ReactElement, ReactNode, Ref } from 'react';
import type { PreloadHandlers } from '../../lib/types';
import type { ModalHeading } from '../Modal/types';

export interface IconTipProps {
  /** The tip's word or two, "Edit": drawn for a sighted user and never read, since the control's own name says it. */
  tip: string;
  children: ReactNode;
  placement?: 'side' | 'below' | 'above';
  /** A press opens the tip too, for a status mark whose button does nothing else; opens rather than toggles. Not for a control with its own press. */
  opensOnPress?: boolean;
}

export interface EditLinkProps {
  href: Route;
  name: string;
  /** The modal the address opens over the list; left out, the address is a page of its own and the link goes there. */
  heading?: ModalHeading;
  /** The link's element, for a caller that returns the focus to it once a dialog it opened closes. */
  ref?: Ref<HTMLAnchorElement>;
  /** Starts the dialog's late-loading parts when the pointer, focus or a press reaches the link. */
  preload?: PreloadHandlers;
}

export interface LiddedEyeIconProps {
  open: boolean;
  className?: string;
}

export interface ChevronIconProps {
  className?: string;
  textSized?: boolean;
}

export interface IconProps {
  /** The one path to draw; an icon of several shapes passes them as children instead. */
  path?: string;
  strokeWidth?: number;
  className?: string;
  viewBox?: string;
  children?: ReactNode;
}

export interface IconButtonProps {
  /** The button's name, read aloud and never drawn. */
  label: string;
  icon: ReactElement;
  onClick: () => void;
  /** Added to `icon-tip__edit`. */
  className?: string;
  pressed?: boolean;
}
