import type { ReactElement } from 'react';
import LocalTime from '../LocalTime';

/** What a timed-out sender cannot do, and until when, or that the time-out has no end date. */
const TimedOutSentence = ({
  cannot,
  until,
}: {
  /** The thing they cannot do, such as "You cannot reply". */
  cannot: string;
  until: Date | null;
}): ReactElement =>
  until ? (
    <>
      {cannot} until <LocalTime at={until} long />.
    </>
  ) : (
    <>{cannot}: you are timed out with no end date.</>
  );

export default TimedOutSentence;
