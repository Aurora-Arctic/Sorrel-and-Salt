import Link from 'next/link';
import type { ReactElement } from 'react';
import './index.scss';

// The one line under an entry's safety notes, drawn whether or not there are any: the notes are
// not complete, and the disclaimer page says what they are and are not. A `note`, so a screen
// reader hears it as an aside to the section rather than as content of its own
// (claude-docs/components/disclaimer-notice.md).
const DisclaimerNotice = (): ReactElement => (
  <p className="disclaimer-notice" role="note">
    Safety notes are not complete, and an ingredient with none is not thereby safe.{' '}
    <Link href="/disclaimer">Read the Disclaimer</Link>
  </p>
);

export default DisclaimerNotice;
