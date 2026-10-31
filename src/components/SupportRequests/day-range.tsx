'use client';

import { type ReactElement, useSyncExternalStore } from 'react';

// The local zone never changes while a page is open, so there is nothing to subscribe to.
const subscribe = (): (() => void) => () => undefined;

const dayOf = (at: Date, withYear: boolean, timeZone?: string): string =>
  at.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone,
  });

/** One day as `3 Oct 2026`, or `3 Oct` without the year; UTC until hydrated, then the viewer's zone, as `LocalTime` does. */
export const LocalDay = ({ at, year = true }: { at: Date; year?: boolean }): ReactElement => {
  const text = useSyncExternalStore(
    subscribe,
    () => dayOf(at, year),
    () => dayOf(at, year, 'UTC'),
  );
  return <time dateTime={at.toISOString()}>{text}</time>;
};

/** Two days as `3 Oct – 10 Oct 2026`; the first carries its year only when it differs from the second's. */
export const DayRange = ({ from, to }: { from: Date; to: Date }): ReactElement => {
  const sameYear = from.getUTCFullYear() === to.getUTCFullYear();
  return (
    <>
      <LocalDay at={from} year={!sameYear} /> – <LocalDay at={to} />
    </>
  );
};
