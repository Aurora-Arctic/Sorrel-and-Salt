import type { ReactElement } from 'react';
import type { ErrorPageProps } from './types';
import './index.scss';

// The 404 and 500 screens' shared body: a heading, a reason and the way onward. It takes a reason, never an `Error`
// (claude-docs/components/error-page.md), and sets its own `<title>` (React hoists it), which a 404 and global-error lack.

const ErrorPage = ({ title, reason, reference, children }: ErrorPageProps): ReactElement => (
  <main className="page-frame">
    <title>{title}</title>
    <div className="error-page">
      <div className="header">
        <h1 className="error-page__title">{title}</h1>
        <p className="error-page__reason lede">{reason}</p>
      </div>
      {reference && <p className="error-page__reference">Reference: {reference}</p>}
      <p className="error-page__way-on">{children}</p>
    </div>
  </main>
);

export default ErrorPage;
