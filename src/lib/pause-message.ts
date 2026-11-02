import { fieldRefusal } from './errors';

/** The most characters a message to a user may hold. */
export const MESSAGE_MAX_LENGTH = 500;

/**
 * The message an admin or owner writes to the user they time out or pause: trimmed, and `null` when blank or not given.
 *
 * @throws {ValidationError} on `['message']` when it is over 500 characters.
 */
export function parsePauseMessage(message: string | null | undefined): string | null {
  const trimmed = message?.trim() || null;
  if (trimmed && trimmed.length > MESSAGE_MAX_LENGTH) {
    throw fieldRefusal('message', `Keep the message to ${MESSAGE_MAX_LENGTH} characters`);
  }
  return trimmed;
}
