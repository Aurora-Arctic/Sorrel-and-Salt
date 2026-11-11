import type { ReactElement } from 'react';

// The spell card's face and smouldering-edge layers, which the card and the spell preview's scene
// both draw. `block` is the class prefix each styles them under (`spell-card`, `spell-preview`).
// Decoration only: the caller hides them from assistive technology.

export const FaceLayers = ({ block }: { block: string }): ReactElement => (
  <span className={`${block}__face`} aria-hidden="true">
    <span className={`${block}__face-paper`}>
      <span className={`${block}__face-corner`}>
        <span className={`${block}__face-hole`} />
      </span>
    </span>
  </span>
);

export const BurnLayers = ({ block }: { block: string }): ReactElement => (
  <span className={`${block}__burn`} aria-hidden="true">
    <span className={`${block}__burn-paper`}>
      <span className={`${block}__burn-corner`}>
        <span className={`${block}__burn-hole`} />
      </span>
      <span className={`${block}__burn-curve`} />
    </span>
  </span>
);
