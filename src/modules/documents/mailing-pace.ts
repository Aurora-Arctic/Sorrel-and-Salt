// How fast a document mailing goes: the mail provider's free plan allows 100 mails a day, so a day takes 60 and leaves room for the
// site's other mail. Plain constants so the workflow bundle and the screens can both read them.
export const MAILING_BATCH_SIZE = 25;
export const MAILING_BATCH_PAUSE_SECONDS = 60;
export const MAILING_DAILY_CAP = 60;

/** How many days a mailing to `accountCount` accounts takes at the daily cap. */
export function mailingDays(accountCount: number): number {
  return Math.ceil(accountCount / MAILING_DAILY_CAP);
}

/** The token a mailing's run holds, so a second run of the same mailing finds the first. */
export function documentMailingHookToken(mailingId: string): string {
  return `document-mailing:${mailingId}`;
}
