export const passkeyLabel = (name: string | null): string => name || 'Passkey';

/** UTC, so the server's zone cannot move the day. */
export const passkeyAdded = (at: string): string =>
  new Date(at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
