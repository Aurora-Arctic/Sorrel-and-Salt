/** What a passkey is listed as: its name, or "Passkey" for one never named. */
export const passkeyLabel = (name: string | null): string => name || 'Passkey';

/** The day a passkey was added, as LastEdit prints a day, in UTC so the server's zone cannot move it. */
export const passkeyAdded = (at: string): string =>
  new Date(at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
