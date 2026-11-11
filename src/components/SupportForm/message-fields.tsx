'use client';

import type { ReactElement, ReactNode } from 'react';
import { MESSAGE_MAX_LENGTH, SUBJECT_MAX_LENGTH } from '../../modules/support/validation/limits';
import { PlainTextField } from '../Field/plain-text-field';

interface SupportMessageFieldsProps {
  subject: string;
  message: string;
  onSubject: (next: string) => void;
  onMessage: (next: string) => void;
  /** The problem to show beside each box. */
  subjectError?: string;
  messageError?: string;
  disabled: boolean;
  /** Between the subject and the message. */
  between?: ReactNode;
}

/** The Subject and Message boxes both support request forms draw, with the warning about private information. */
export const SupportMessageFields = ({
  subject,
  message,
  onSubject,
  onMessage,
  subjectError,
  messageError,
  disabled,
  between,
}: SupportMessageFieldsProps): ReactElement => (
  <>
    <PlainTextField
      name="subject"
      label="Subject"
      required
      placeholder="Add a subject"
      autoComplete="off"
      limit={SUBJECT_MAX_LENGTH}
      disabled={disabled}
      value={subject}
      error={subjectError}
      onChange={onSubject}
    />
    {between}
    <PlainTextField
      name="message"
      label="Message"
      required
      multiline
      rows={6}
      placeholder="Write a message"
      note={
        <span className="field__warning">
          Don’t include passwords, payment details or other private information.
        </span>
      }
      limit={MESSAGE_MAX_LENGTH}
      disabled={disabled}
      value={message}
      error={messageError}
      onChange={onMessage}
    />
  </>
);
