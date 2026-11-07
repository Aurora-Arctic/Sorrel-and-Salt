import { inUtc } from './utc';

export function pauseNote({ until }: { until: Date | null }): string {
  return until ? `Paused until ${inUtc(until)}` : 'Paused, with no end date';
}
