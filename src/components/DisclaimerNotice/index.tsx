import type { ReactElement } from 'react';
import './index.scss';
import { PendingLink } from '../../lib/navigation';

// A `note`, so a screen reader hears it as an aside (claude-docs/components/document-page.md).
const DisclaimerNotice = (): ReactElement => (
  <p className="disclaimer-notice" role="note">
    Safety notes do not list every risk. If an ingredient has no safety note, that does not mean it
    is safe. <PendingLink href="/disclaimer">Read the Disclaimer</PendingLink>
  </p>
);

export default DisclaimerNotice;
