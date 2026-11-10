// How fast a document mailing goes: the mail provider's free plan allows 100 mails a day, so a day takes 60 and leaves room for the
// site's other mail. Plain constants so the workflow bundle and the screens can both read them.
export const MAILING_BATCH_SIZE = 25;
export const MAILING_BATCH_PAUSE_SECONDS = 60;
export const MAILING_DAILY_CAP = 60;

export function mailingDays(accountCount: number): number {
  return Math.ceil(accountCount / MAILING_DAILY_CAP);
}

export function documentMailingHookToken(mailingId: string): string {
  return `document-mailing:${mailingId}`;
}
