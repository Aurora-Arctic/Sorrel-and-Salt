import type { Route } from 'next';
import type { ReactElement } from 'react';
import { EditLink } from '../IconTip';
import { HelpHeading } from './frame';
import type { HelpArticleTitleProps } from './types';
import './index.scss';

/** A help page's title with a keeper's pencil beside it. */
export function HelpArticleTitle({
  title,
  level = 'h2',
  editHref,
  editName = 'Article',
}: HelpArticleTitleProps): ReactElement {
  return (
    <div className="help-article__title">
      {level === 'h2' ? (
        <h2>{title}</h2>
      ) : (
        <HelpHeading level={2} up={level === 'h1' ? true : undefined}>
          {title}
        </HelpHeading>
      )}
      {editHref && <EditLink href={editHref as Route} name={editName} />}
    </div>
  );
}

export { HelpFrame, HelpHeading, HelpPageHead, WhenHelpFramed } from './frame';
