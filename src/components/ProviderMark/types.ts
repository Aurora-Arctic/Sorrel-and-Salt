import type { ReactElement } from 'react';
import type { ProviderId } from '../../lib/types';

export interface ProviderArtProps {
  /**
   * Facebook's mark only: true draws its white "f" on the blue chip a brand
   * button wants, false (the default) its own blue circle for a list.
   * The other three marks have one form and ignore it.
   */
  chip?: boolean;
}

/** One provider's mark as an SVG, from SignInPanel/icons.tsx. */
export type ProviderArt = (props: ProviderArtProps) => ReactElement;

export interface ProviderMarkProps extends ProviderArtProps {
  /** Whose mark, on whose ground. */
  id: ProviderId;
}

export interface ProviderUnavailableNoteProps {
  /** Named by the greyed button's `aria-describedby`. */
  id: string;
  /** A layout class from the caller, such as a row's full-width line. */
  className?: string;
}
