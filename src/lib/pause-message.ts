import { fieldRefusal } from './errors';

export const MESSAGE_MAX_LENGTH = 500;

/** The most characters a pause's note holds, once trimmed: the three pause services and the pause forms state it from here. */
export const PAUSE_NOTE_MAX_LENGTH = 500;

const LONG_MESSAGE = `Keep the message to ${MESSAGE_MAX_LENGTH} characters`;

/**
 * `null` when blank or not given.
 * @throws {ValidationError} on `['message']` when it is over 500 characters.
 */
export function parseOptionalPauseMessage(message: string | null | undefined): string | null {
  const trimmed = typeof message === 'string' ? message.trim() : '';
  if (trimmed.length > MESSAGE_MAX_LENGTH) throw fieldRefusal('message', LONG_MESSAGE);
  return trimmed || null;
}

/** @throws {ValidationError} on `['message']` when it is missing, blank or over 500 characters. */
export function parseRequiredPauseMessage(message: string | null | undefined): string {
  const trimmed = parseOptionalPauseMessage(message);
  if (!trimmed) throw fieldRefusal('message', 'Write a message to the user');
  return trimmed;
}
