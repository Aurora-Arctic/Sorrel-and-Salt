import type { ReactElement } from 'react';
import { PencilIcon } from '../IconTip';
import { ListBodySkeleton, ListFilterFrame } from '../ListFrame/skeleton';
import Skeleton from '../Skeleton';
import { SkeletonWords } from '../Skeleton/text';
import HelpOutlineFilterRow from './filter';
import './index.scss';

/**
 * The outline with nothing in it yet, laid as the page lays it: the guides' pane (on a phone the Guide select), then the
 * chosen guide's head and a facts line as long as a guide's, over its sub pages' table, so the table stands where the
 * arrived one will.
 */
export const HelpOutlineBodySkeleton = (): ReactElement => (
  <div className="help-outline">
    <div className="help-outline__side" aria-hidden="true">
      <div className="help-outline__nav">
        <p className="help-outline__group">Guides</p>
        <Skeleton shape="line" count={4} quiet />
      </div>
      <div className="help-outline__select">
        <div className="field">
          <div className="field__label-row">
            <span className="field__label">Guide</span>
          </div>
          <Skeleton shape="block" quiet />
        </div>
      </div>
    </div>
    <section className="help-outline__pane">
      <div className="help-outline__head" aria-hidden="true">
        <h2>
          <SkeletonWords count={3} />
        </h2>
        <span className="help-outline__head-actions">
          <span className="shown-switch__label">Shown</span>
          <span className="icon-tip__edit">
            <PencilIcon />
          </span>
        </span>
      </div>
      <p className="help-outline__facts" aria-hidden="true">
        <SkeletonWords count={10} />
      </p>
      <ListBodySkeleton
        label="Help"
        headings={['Position', 'Sub Page', 'Audience', 'Order', 'Edit']}
        actions={['Order', 'Edit']}
        hidden={['Edit']}
      />
    </section>
  </div>
);

/** The keepers' help outline's placeholder: its filter row, at the defaults, over the body. */
export const HelpOutlineSkeleton = (): ReactElement => (
  <ListFilterFrame
    filter={<HelpOutlineFilterRow filter={{ query: '', kind: '', audience: '', shown: 'shown' }} />}
  >
    <HelpOutlineBodySkeleton />
  </ListFilterFrame>
);
