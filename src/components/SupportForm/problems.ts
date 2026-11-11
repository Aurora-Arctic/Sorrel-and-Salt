import { limitMessage } from '../../lib/formats';
import { MESSAGE_REQUIRED, SUBJECT_REQUIRED } from '../../lib/support-messages';
import { MESSAGE_MAX_LENGTH, SUBJECT_MAX_LENGTH } from '../../modules/support/validation/limits';

/** The subject and message checks both support forms make, by the service's own rules: the server stays the authority. */
export function subjectAndMessageProblems(
  subject: string,
  message: string,
): { subject?: string; message?: string } {
  const found: { subject?: string; message?: string } = {};
  if (subject.trim() === '') found.subject = SUBJECT_REQUIRED;
  else if (subject.trim().length > SUBJECT_MAX_LENGTH)
    found.subject = limitMessage(SUBJECT_MAX_LENGTH);
  if (message.trim() === '') found.message = MESSAGE_REQUIRED;
  else if (message.trim().length > MESSAGE_MAX_LENGTH)
    found.message = limitMessage(MESSAGE_MAX_LENGTH);
  return found;
}
