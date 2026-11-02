import { fieldRefusal } from './errors';

/** The most characters a message to a user may hold. */
export const MESSAGE_MAX_LENGTH = 500;

const LONG_MESSAGE = `Keep the message to ${MESSAGE_MAX_LENGTH} characters`;

/**
 * The message an owner writes to a member they pause: trimmed, and `null` when blank or not given.
 *
 * @throws {ValidationError} on `['message']` when it is over 500 characters.
 */
export function parseOptionalPauseMessage(message: string | null | undefined): string | null {
  const trimmed = typeof message === 'string' ? message.trim() : '';
  if (trimmed.length > MESSAGE_MAX_LENGTH) throw fieldRefusal('message', LONG_MESSAGE);
  return trimmed || null;
}

/**
 * The message an admin writes to a user they time out or pause on the site: trimmed, and required.
 *
 * @throws {ValidationError} on `['message']` when it is missing, blank or over 500 characters.
 */
export function parseRequiredPauseMessage(message: string | null | undefined): string {
  const trimmed = parseOptionalPauseMessage(message);
  if (!trimmed) throw fieldRefusal('message', 'Write a message to the user');
  return trimmed;
}
