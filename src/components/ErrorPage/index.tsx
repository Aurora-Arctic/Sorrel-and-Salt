import type { ReactElement } from 'react';
import PageHeader from '../PageHeader';
import type { ErrorPageProps } from './types';
import './index.scss';

// Takes a reason, never an `Error` (claude-docs/components/error-page.md), and sets its own `<title>`, which a 404 and
// global-error lack.

const ErrorPage = ({
  title,
  reason,
  reference,
  withinMain = false,
  children,
}: ErrorPageProps): ReactElement => {
  const Frame = withinMain ? 'div' : 'main';
  return (
    <Frame className={withinMain ? undefined : 'page-frame'}>
      <title>{title}</title>
      <div className="error-page">
        <PageHeader title={title} lede={reason} />
        <p className="error-page__way-on">{children}</p>
        {reference && <p className="error-page__reference">Reference {reference}</p>}
      </div>
    </Frame>
  );
};

export default ErrorPage;
