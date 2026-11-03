'use client';

import type { ReactElement } from 'react';
import { useLocalTime } from '../LocalTime/use-local-time';
import { longMinuteInZone } from '../../lib/utc';
import { Mark } from './marks';
import type { UntilMarkProps } from './types';

/**
 * A red cross for a standing time-out or pause, its end in the hidden text and the tip in the site's long date form, the
 * viewer's own zone once hydrated, as `LocalTime` prints it; "with no end date" where it has none. A client component,
 * since a tip takes text and only the browser knows the viewer's zone.
 */
const UntilMark = ({ standing, until }: UntilMarkProps): ReactElement => {
  const end = useLocalTime((zone) => (until ? longMinuteInZone(until, zone) : ''));
  return (
    <Mark
      value={false}
      label={until ? `${standing} until ${end}` : `${standing} with no end date`}
      tip={until ? `Until ${end}` : 'No end date'}
    />
  );
};

export default UntilMark;
