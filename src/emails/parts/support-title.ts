// A subject is up to 120 characters; the heading and subject line keep to 80 so a long one does not wrap a mail client's list.
const SUBJECT_LIMIT = 80;

/** `prefix`, a colon and the request's subject cut to length: the line a support mail's subject and heading both read. */
export function supportTitle(prefix: string, requestSubject: string): string {
  const subject = requestSubject.trim();
  const cut =
    subject.length > SUBJECT_LIMIT ? `${subject.slice(0, SUBJECT_LIMIT).trimEnd()}…` : subject;
  return `${prefix}: ${cut}`;
}
