import type { ReactElement } from 'react';
import { isoDayInUtc } from '../../lib/utc';

/** A moment shown as its UTC day, `YYYY-MM-DD`, in a `<time>` that carries the full instant. */
const Day = ({ at }: { at: Date }): ReactElement => (
  <time dateTime={at.toISOString()}>{isoDayInUtc(at)}</time>
);

export default Day;
