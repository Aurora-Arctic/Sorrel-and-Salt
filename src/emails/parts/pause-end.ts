import { longMinuteInZone } from '../../lib/utc';

/** A pause's end as a sentence, in UTC because the mail is read in a zone the server cannot know. */
export function pauseEnd(until: Date | null): string {
  if (until === null) return 'It has no end date.';
  return `It ends on ${longMinuteInZone(until, 'UTC')} UTC.`;
}
