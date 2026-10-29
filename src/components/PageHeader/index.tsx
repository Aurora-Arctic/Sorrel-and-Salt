import type { ReactElement } from 'react';
import type { PageHeaderProps } from './types';

// A page's heading with its one primary action on the same line, the action at the end
// (claude-docs/styling.md, "Buttons"). No client directive and no hook, so a server page
// renders it directly; an action that needs the browser is a client component of its own.
const PageHeader = ({ title, lead, action }: PageHeaderProps): ReactElement => (
  <div className="page-header">
    {lead ? (
      // Beside the heading, not in it, so the heading reads as the title alone.
      <div className="page-header__title">
        {lead}
        <h1>{title}</h1>
      </div>
    ) : (
      <h1>{title}</h1>
    )}
    {action}
  </div>
);

export default PageHeader;
