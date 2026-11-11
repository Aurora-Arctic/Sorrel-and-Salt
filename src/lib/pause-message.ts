import { fieldRefusal } from './errors';
import { limitMessage } from './formats';

/** The most characters a pause's note or message holds, once trimmed: the pause services and the pause forms state it from here. */
export const PAUSE_TEXT_MAX_LENGTH = 500;

const TOO_LONG = limitMessage(PAUSE_TEXT_MAX_LENGTH);
const PAST_END = 'Choose a time in the future';
const NO_NOTE = 'Write a note saying why';

/** Whether a time is invalid or not in the future: the one rule for an end or expiry, so a caller with its own sentence and issue list still shares it. */
export function isNotFuture(time: Date): boolean {
  return !(time instanceof Date) || Number.isNaN(time.getTime()) || time.getTime() <= Date.now();
}

/** @throws {ValidationError} on `['until']` when it is given and is not a valid time in the future. `null` and `undefined` mean no end. */
export function parsePauseEnd(until: Date | null | undefined): void {
  if (until != null && isNotFuture(until)) throw fieldRefusal('until', PAST_END);
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
  if (trimmed.length > PAUSE_TEXT_MAX_LENGTH) throw fieldRefusal('note', TOO_LONG);
  return trimmed || null;
}

/**
 * `null` when blank or not given.
 * @throws {ValidationError} on `['message']` when it is over 500 characters.
 */
export function parseOptionalPauseMessage(message: string | null | undefined): string | null {
  const trimmed = typeof message === 'string' ? message.trim() : '';
  if (trimmed.length > PAUSE_TEXT_MAX_LENGTH) throw fieldRefusal('message', TOO_LONG);
  return trimmed || null;
}

/** @throws {ValidationError} on `['message']` when it is missing, blank or over 500 characters. */
export function parseRequiredPauseMessage(message: string | null | undefined): string {
  const trimmed = parseOptionalPauseMessage(message);
  if (!trimmed) throw fieldRefusal('message', 'Write a message to the user');
  return trimmed;
}
