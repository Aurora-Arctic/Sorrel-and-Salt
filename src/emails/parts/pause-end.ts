/** A pause's end as a sentence fragment, in UTC because the mail is read in a zone the server cannot know. */
export function pauseEnd(until: Date | null): string {
  if (until === null) return 'It has no end date.';
  const when = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(until);
  return `It ends on ${when} UTC.`;
}
