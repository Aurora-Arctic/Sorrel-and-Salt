'use client';

import { type ReactElement, useSyncExternalStore } from 'react';
import { longMinuteInZone, minuteInZone, shortDayInZone, shortMinuteInZone } from '../../lib/utc';
import type { LocalTimeProps } from './types';

// The local zone never changes while a page is open, so there is nothing to subscribe to.
const subscribe = (): (() => void) => () => undefined;

/**
 * An instant to the minute (`2026-10-30 2:05 pm`, or `28 August 2026, 12:00 am` with `long`) in a `<time>` carrying the full instant. The server and
 * hydration print UTC; once hydrated it prints the viewer's own zone, read as an external store so
 * the two renders never mismatch.
 */
const LocalTime = ({ at, timeZone, long, short }: LocalTimeProps): ReactElement => {
  const print = (zone: string | undefined): string => {
    if (short === 'day') return shortDayInZone(at, zone);
    if (short === 'minute') return shortMinuteInZone(at, zone);
    return long ? longMinuteInZone(at, zone) : minuteInZone(at, zone);
  };
  const text = useSyncExternalStore(
    subscribe,
    () => print(timeZone),
    () => print('UTC'),
  );
  return <time dateTime={at.toISOString()}>{text}</time>;
};

export default LocalTime;
