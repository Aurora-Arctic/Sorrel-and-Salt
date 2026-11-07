import type { ReactElement } from 'react';
import Skeleton from '../Skeleton';
import './index.scss';

// The buttons in each of the toolbar's groups, in the order toolbar.tsx lays them.
const GROUP_SIZES = [2, 3, 2, 2, 2];

// The editor's head while it loads: the editor's own classes around bars, so its title, lede, toolbar
// and text box stand where the real ones will. The toolbar is drawn here, not shared, as it needs the
// editor library.
export const DocumentEditorSkeleton = (): ReactElement => (
  <div className="document-editor">
    <h2>
      <span className="visually-hidden">Loading</span>
      <Skeleton shape="line" quiet />
    </h2>
    <div className="lede skeleton-lede">
      <Skeleton shape="line" count={2} quiet />
    </div>
    <div className="document-page__body document-editor__text">
      <div className="document-editor__toolbar" aria-hidden="true">
        {GROUP_SIZES.map((size, group) => (
          <div key={group} className="document-editor__group">
            {Array.from({ length: size }, (_, at) => (
              <span key={at} className="btn btn--quiet btn--icon" />
            ))}
          </div>
        ))}
      </div>
      <div role="presentation" className="document-editor__skeleton-text" />
    </div>
  </div>
);
