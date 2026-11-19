import { hasText } from '@/lib/text';
import type { ReactElement } from 'react';
import DisclaimerNotice from '../DisclaimerNotice';
import SafetyNote from './safety-note';
import type { SafetyNoteProps } from './types';

// A caution and its one disclaimer as a single item, so the disclaimer closes the caution by its own
// margin and not a flow gap further. Nothing is drawn, not even the wrapper, when there is no caution.
const SafetyNoteWithDisclaimer = (props: SafetyNoteProps): ReactElement => {
  const cautioned =
    hasText(props.safetyNotes) ||
    (props.variants ?? []).some((variant) => hasText(variant.safetyNotes)) ||
    Boolean(props.footnote);
  return (
    <div className="safety-note-unit">
      <SafetyNote {...props} />
      {cautioned && <DisclaimerNotice />}
    </div>
  );
};

export default SafetyNoteWithDisclaimer;
