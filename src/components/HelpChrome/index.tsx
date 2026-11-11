import type { Route } from 'next';
import type { ReactElement } from 'react';
import HelpSearchForm from '../HelpSearchForm';
import { EditLink } from '../IconTip';
import PageHeader from '../PageHeader';
import type { HelpArticleTitleProps, HelpPageHeadProps } from './types';
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

/** The help heading and its search box, which the help layout's header holds on the public pages. */
export function HelpPageHead({
  heading = 'Help',
  framed = false,
}: HelpPageHeadProps): ReactElement {
  return (
    <>
      {!framed && <PageHeader title={heading} />}
      {!framed && <HelpSearchForm />}
    </>
  );
}
