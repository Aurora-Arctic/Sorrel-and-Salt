import type { Route } from 'next';
import type { ReactElement } from 'react';
import { EditLink } from '../IconTip';
import type { HelpArticleTitleProps } from './types';
import './index.scss';

/** A help page's title with a keeper's pencil beside it. */
export function HelpArticleTitle({
  title,
  editHref,
  editName = 'Article',
}: HelpArticleTitleProps): ReactElement {
  return (
    <div className="help-article__title">
      <h2>{title}</h2>
      {editHref && <EditLink href={editHref as Route} name={editName} />}
    </div>
  );
}

export { HelpFrame, HelpPageHead, WhenHelpFramed } from './frame';
