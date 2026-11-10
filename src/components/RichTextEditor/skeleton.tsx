import type { ReactElement } from 'react';
import './index.scss';

// The buttons in each of the toolbar's groups, in the order toolbar.tsx lays them.
const GROUP_SIZES = [2, 3, 2, 2, 2];

// The editor's box while it loads: its own classes around empty buttons, so the toolbar and the text box stand where the real
// ones will. Drawn here, not shared with toolbar.tsx, as the real toolbar needs the editor library.
export const RichTextEditorSkeleton = ({ label }: { label: string }): ReactElement => (
  <div className="document-page__body rich-text-editor">
    <div role="toolbar" aria-label={`${label} Formatting`} className="rich-text-editor__toolbar">
      {GROUP_SIZES.map((size, group) => (
        <div key={group} className="rich-text-editor__group">
          {Array.from({ length: size }, (_, at) => (
            <span key={at} className="btn btn--quiet btn--icon" />
          ))}
        </div>
      ))}
    </div>
    <div role="presentation" className="rich-text-editor__skeleton-text" />
  </div>
);
