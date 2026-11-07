import type { ReactElement } from 'react';
import { ButtonFace } from '../ActionFace';
import Skeleton from '../Skeleton';
import './index.scss';
import './skeleton.scss';

// One field: its label row and its control, in the field's own block.
const FieldFace = (): ReactElement => (
  <div className="field">
    <Skeleton shape="line" quiet />
    <Skeleton shape="block" quiet />
  </div>
);

/** The form with nothing in it yet, drawn from the form's own parts: the lede, three fields, the switch and the Generate button. */
export const BusinessCardsBodySkeleton = (): ReactElement => (
  <div className="form business-cards admin-index skeleton-text business-cards-face">
    <div className="business-cards-face__lede">
      <Skeleton shape="line" count={4} quiet />
    </div>
    <FieldFace />
    <FieldFace />
    <FieldFace />
    <div className="field switch business-cards-face__switch">
      <Skeleton shape="line" quiet />
      <Skeleton shape="block" quiet />
    </div>
    <div aria-live="polite" />
    <div className="form__actions">
      <ButtonFace>Generate</ButtonFace>
    </div>
  </div>
);
