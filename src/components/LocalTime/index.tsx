'use client';

import type { ReactElement } from 'react';
import { longMinuteInZone, minuteInZone, shortDayInZone, shortMinuteInZone } from '../../lib/utc';
import type { LocalTimeProps } from './types';
import { useLocalTime } from './use-local-time';

/** The server and hydration print UTC; once hydrated it prints the viewer's zone, read as an external store so the two renders never mismatch. */
const LocalTime = ({ at, timeZone, long, short }: LocalTimeProps): ReactElement => {
  const print = (zone: string | undefined): string => {
    if (short === 'day') return shortDayInZone(at, zone);
    if (short === 'minute') return shortMinuteInZone(at, zone);
    return long ? longMinuteInZone(at, zone) : minuteInZone(at, zone);
  };
  const text = useLocalTime(print, timeZone);
  return <time dateTime={at.toISOString()}>{text}</time>;
};

export default LocalTime;
