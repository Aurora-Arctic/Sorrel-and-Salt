import type { ReactElement, ReactNode } from 'react';
import './index.scss';

export type IngredientCardKind = 'cupboard' | 'compendium';

// The ingredient card's data-free frame: the cabinet slot, the drawer behind the face and the face
// itself. The card and its skeleton both draw it, so the skeleton stands where the card does.
export const IngredientCardFrame = ({
  children,
  skeleton,
}: {
  children?: ReactNode;
  /** Draw the frame as a placeholder for this kind of card's list, its height the list's. */
  skeleton?: IngredientCardKind;
}): ReactElement => (
  // The slot is the cabinet hole the card's face slides out of; the drawer body behind the
  // face is decorative and painted first, so it sits behind the face (index.scss).
  <div className="ingredient-card-slot">
    <span className="ingredient-card-slot__drawer" aria-hidden="true" />
    <article
      className={`ingredient-card specimen${skeleton ? ` ingredient-card--skeleton ingredient-card--skeleton-${skeleton}` : ''}`}
    >
      {skeleton ? <span className="card-skeleton__fill" aria-hidden="true" /> : children}
    </article>
  </div>
);
