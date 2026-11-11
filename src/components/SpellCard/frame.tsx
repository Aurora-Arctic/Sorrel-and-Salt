import type { ReactElement, ReactNode } from 'react';
import { BurnLayers, FaceLayers } from './layers';
import './index.scss';
import type { SpellCardSkeletonKind } from './types';

// The spell card's data-free frame: the face and shadow layers, the content, and the smouldering
// edge's layers over it. The card and its skeleton both draw it, so the skeleton stands where the
// card does. `labelledBy` is the id of the heading the card names itself by.
export const SpellCardFrame = ({
  labelledBy,
  children,
  skeleton,
}: {
  labelledBy?: string;
  children?: ReactNode;
  skeleton?: SpellCardSkeletonKind;
}): ReactElement => (
  <article
    className={`spell-card specimen${skeleton ? ` spell-card--skeleton spell-card--skeleton-${skeleton}` : ''}`}
    aria-labelledby={labelledBy}
  >
    {/* The card's face and shadow, and the warm glow behind them, as layers, so the
        smouldering edge (_smoulder.scss) can burn a real hole in the face and its shadow.
        First, so the content paints over them; decoration only, so hidden from assistive
        technology and named in nothing. */}
    <span className="spell-card__glow" aria-hidden="true" />
    <FaceLayers block="spell-card" />
    {skeleton ? <span className="card-skeleton__fill" aria-hidden="true" /> : children}
    {/* The smoulder's ember line and char rim, over the content (_smoulder.scss). */}
    <BurnLayers block="spell-card" />
  </article>
);
