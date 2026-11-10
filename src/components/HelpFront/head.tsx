import type { ReactElement, ReactNode } from 'react';
import { HELP_LEDE } from '../../lib/help-pages';
import PageHeader from '../PageHeader';
import './index.scss';

/** The heading, the lede and the search box, one for the page and its skeleton so the two cannot differ. */
export const HelpFrontHead = ({
  action,
  search,
}: {
  action?: ReactNode;
  search: ReactNode;
}): ReactElement => (
  <div className="help-page help-front__head">
    <PageHeader title="Help" action={action} />
    <p className="lede">{HELP_LEDE}</p>
    {search}
  </div>
);
