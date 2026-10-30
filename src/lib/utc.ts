/**
 * An instant as a person reads it, in UTC (`28 August 2026, 00:00 UTC`): how a refusal names when a compendium redirect closes. `expires_at` is midnight UTC,
 * so the server's zone must not move it.
 */
export function inUtc(at: Date): string {
  const day = at.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const time = at.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'UTC',
  });
  return `${day}, ${time} UTC`;
}
