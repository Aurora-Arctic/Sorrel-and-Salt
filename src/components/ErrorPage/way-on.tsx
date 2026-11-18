'use client';

import type { ReactElement } from 'react';
import ReportThis from '../ReportThis';
import { PendingLink } from '../../lib/navigation';

// The ways on the 404 and the 403 share (claude-docs/components/error-page.md). Help and Report This sit in one
// `.error-page__pair` so the icon button never wraps alone at 375px.

export const BackToSite = (): ReactElement => (
  <PendingLink className="btn btn--quiet" href="/">
    Back to Sorrel &amp; Salt
  </PendingLink>
);

export const WayOn = ({ code }: { code: number }): ReactElement => (
  <>
    <BackToSite />
    <span className="error-page__pair">
      <PendingLink className="btn btn--quiet" href="/help">
        Help
      </PendingLink>
      <ReportThis code={code} />
    </span>
  </>
);
