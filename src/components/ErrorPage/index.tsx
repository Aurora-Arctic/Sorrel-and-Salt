import type { ReactElement } from 'react';
import type { ErrorPageProps } from './types';
import './index.scss';

// What the 404 and 500 screens share: a heading, a reason, and the way
// onward. It never takes an `Error`, only a reason written for the reader, so
// a message or stack trace cannot reach the page through it
// (claude-docs/components/error-page.md).

const ErrorPage = ({ title, reason, reference, children }: ErrorPageProps): ReactElement => (
  <main className="page-frame">
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
