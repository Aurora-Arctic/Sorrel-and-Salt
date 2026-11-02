import Link from 'next/link';
import type { ReactElement } from 'react';
import './index.scss';

// The one line under an entry's safety notes, drawn whether or not there are any: the notes are
// not complete, and the disclaimer page says what they are and are not. A `note`, so a screen
// reader hears it as an aside to the section rather than as content of its own
// (claude-docs/components/disclaimer-notice.md).
const DisclaimerNotice = (): ReactElement => (
  <p className="disclaimer-notice" role="note">
    Safety notes do not list every risk. If an ingredient has no safety note, that does not mean it
    is safe. <Link href="/disclaimer">Read the Disclaimer</Link>
  </p>
);

export default DisclaimerNotice;
