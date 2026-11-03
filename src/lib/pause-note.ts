import { inUtc } from './utc';

/** The line a paused coven's row carries in a list of the viewer's covens: when the pause ends, or that it has no end. */
export function pauseNote({ until }: { until: Date | null }): string {
  return until ? `Paused until ${inUtc(until)}` : 'Paused, with no end date';
}
