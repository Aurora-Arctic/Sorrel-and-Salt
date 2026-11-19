import type { ReactElement, ReactNode } from 'react';
import { HELP_LEDE } from '../../lib/help-pages';
import { HelpFrontTitle } from './title';
import './index.scss';

/** The word Help, the lede and the search box, one for the page and its skeleton so the two cannot differ. */
export const HelpFrontHead = ({
  action,
  asLabel,
  search,
}: {
  action?: ReactNode;
  /** Whether Help is a label, because the page's own title is its heading; unset, the address decides (`HelpFrontTitle`). */
  asLabel?: boolean;
  search: ReactNode;
}): ReactElement => (
  <div className="help-page help-front__head">
    <HelpFrontTitle action={action} asLabel={asLabel} />
    <p className="lede">{HELP_LEDE}</p>
    {search}
  </div>
);
