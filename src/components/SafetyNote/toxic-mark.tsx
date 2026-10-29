import type { ReactElement } from 'react';
import type { ToxicMarkProps } from './types';

// The Toxic badge: on when the ingredient or any form its consumer shows is flagged, since a
// form's flag is its own and never its ingredient's. It carries its word, so the warning
// never rests on the red. claude-docs/components/safety-note.md, "ToxicMark".
export const ToxicMark = ({ toxic, variants = [] }: ToxicMarkProps): ReactElement | null =>
  toxic || variants.some((variant) => variant.toxic) ? (
    <span className="badge badge--safety">Toxic</span>
  ) : null;
