import type { ReactElement } from 'react';
import { RichTextEditorSkeleton } from '../RichTextEditor/skeleton';
import Skeleton from '../Skeleton';
import './index.scss';

// The editor's head while it loads: the editor's own classes around bars, so its title, lede, toolbar,
// text box and buttons stand where the real ones will.
export const DocumentEditorSkeleton = (): ReactElement => (
  <div className="document-editor">
    <h2>
      <span className="visually-hidden">Loading</span>
      <Skeleton shape="line" quiet />
    </h2>
    <div className="lede skeleton-lede">
      <Skeleton shape="line" count={3} quiet />
    </div>
    <RichTextEditorSkeleton label="Document Text" />
    <div className="document-editor__bar" aria-hidden="true">
      <span className="btn">Save Draft</span>
      <span className="btn btn--caution">Publish</span>
      <span className="btn btn--quiet">Restore</span>
    </div>
  </div>
);
