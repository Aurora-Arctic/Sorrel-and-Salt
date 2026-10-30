import { dayWords, today } from '../DateField/day';

/** Why a draft dated `workedOn` cannot be completed yet, or `undefined` once its day has come. */
export function completeReason(workedOn: string): string | undefined {
  if (workedOn <= today()) return undefined;
  return `Complete on or after ${dayWords(workedOn)}`;
}
