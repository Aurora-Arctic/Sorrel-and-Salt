'use client';

import { type ReactElement, useSyncExternalStore } from 'react';
import { minuteInUtc, minuteInZone } from '../../lib/utc';
import type { LocalTimeProps } from './types';

// The local zone never changes while a page is open, so there is nothing to subscribe to.
const subscribe = (): (() => void) => () => undefined;

/**
 * An instant to the minute (`2026-10-30 14:05`) in a `<time>` carrying the full instant. The server and
 * hydration print UTC; once hydrated it prints the viewer's own zone, read as an external store so
 * the two renders never mismatch.
 */
const LocalTime = ({ at, timeZone }: LocalTimeProps): ReactElement => {
  const text = useSyncExternalStore(
    subscribe,
    () => minuteInZone(at, timeZone),
    () => minuteInUtc(at),
  );
  return <time dateTime={at.toISOString()}>{text}</time>;
};

export default LocalTime;
