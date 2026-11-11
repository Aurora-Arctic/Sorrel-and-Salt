import type { ReactElement } from 'react';
import type { ProviderId } from '../../lib/types';

interface ProviderArtProps {
  /** Facebook only: true draws the white "f" on a blue chip, false its own blue circle. */
  chip?: boolean;
}

export type ProviderArt = (props: ProviderArtProps) => ReactElement;

export interface ProviderMarkProps extends ProviderArtProps {
  id: ProviderId;
}

export interface ProviderUnavailableNoteProps {
  id: string;
  className?: string;
}
