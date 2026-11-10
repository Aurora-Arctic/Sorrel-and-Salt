import type { ReactElement } from 'react';
import LocalTime from '.';

/** How a pause or time-out ends, in the viewer's zone: "until <date>", or `noEnd` where it has none. */
const Until = ({
  until,
  noEnd = 'with no end date',
}: {
  until: Date | null;
  noEnd?: string;
}): ReactElement => (
  <>
    {until ? (
      <>
        until <LocalTime at={until} long />
      </>
    ) : (
      noEnd
    )}
  </>
);

export default Until;
