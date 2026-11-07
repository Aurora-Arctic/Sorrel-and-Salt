import Link from 'next/link';
import type { ReactElement } from 'react';
import './index.scss';

// A `note`, so a screen reader hears it as an aside (claude-docs/components/document-page.md).
const DisclaimerNotice = (): ReactElement => (
  <p className="disclaimer-notice" role="note">
    Safety notes do not list every risk. If an ingredient has no safety note, that does not mean it
    is safe. <Link href="/disclaimer">Read the Disclaimer</Link>
  </p>
);

export default DisclaimerNotice;
