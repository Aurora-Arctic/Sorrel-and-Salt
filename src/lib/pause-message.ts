import { fieldRefusal } from './errors';

export const PAUSE_TEXT_MAX_LENGTH = 500;

const LONG_MESSAGE = `Keep the message to ${PAUSE_TEXT_MAX_LENGTH} characters`;
const LONG_NOTE = `Keep the note to ${PAUSE_TEXT_MAX_LENGTH} characters`;
const PAST_END = 'Choose a time in the future';
const NO_NOTE = 'Write a note saying why';

/** @throws {ValidationError} on `['until']` when it is given and is not a valid time in the future. `null` and `undefined` mean no end. */
export function parsePauseEnd(until: Date | null | undefined): void {
  if (
    until != null &&
    (!(until instanceof Date) || Number.isNaN(until.getTime()) || until.getTime() <= Date.now())
  ) {
    throw fieldRefusal('until', PAST_END);
  }
}

/**
 * The note trimmed; `null` when it is blank and not required.
 * @throws {ValidationError} on `['note']` when it is over 500 characters, or blank and required.
 */
export function parsePauseNote(
  note: string | null | undefined,
  options: { required: true },
): string;
export function parsePauseNote(
  note: string | null | undefined,
  options: { required: false },
): string | null;
export function parsePauseNote(
  note: string | null | undefined,
  options: { required: boolean },
): string | null {
  const trimmed = typeof note === 'string' ? note.trim() : '';
  if (!trimmed && options.required) throw fieldRefusal('note', NO_NOTE);
  if (trimmed.length > PAUSE_TEXT_MAX_LENGTH) throw fieldRefusal('note', LONG_NOTE);
  return trimmed || null;
}

/**
 * `null` when blank or not given.
 * @throws {ValidationError} on `['message']` when it is over 500 characters.
 */
export function parseOptionalPauseMessage(message: string | null | undefined): string | null {
  const trimmed = typeof message === 'string' ? message.trim() : '';
  if (trimmed.length > PAUSE_TEXT_MAX_LENGTH) throw fieldRefusal('message', LONG_MESSAGE);
  return trimmed || null;
}

/** @throws {ValidationError} on `['message']` when it is missing, blank or over 500 characters. */
export function parseRequiredPauseMessage(message: string | null | undefined): string {
  const trimmed = parseOptionalPauseMessage(message);
  if (!trimmed) throw fieldRefusal('message', 'Write a message to the user');
  return trimmed;
}
