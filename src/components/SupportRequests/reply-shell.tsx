'use client';

import type { FormEvent, ReactElement, ReactNode } from 'react';
import type { Failure } from '../../lib/types';
import { MESSAGE_MAX_LENGTH } from '../../modules/support/validation/limits';
import BusyButton from '../BusyButton';
import { PlainTextField } from '../Field/plain-text-field';
import { DiscardQuestion, useDiscardGuard } from '../Modal';
import Notice from '../Notice';

interface SupportReplyShellProps {
  body: string;
  onBody: (next: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  busy: boolean;
  /** The box and button are closed, as for a sender who is timed out. */
  shut?: boolean;
  failure: Failure;
  label: string;
  placeholder: string;
  required?: boolean;
  submitLabel: string;
  busyLabel: string;
  /** Before the box. */
  above?: ReactNode;
  /** Between the box and the buttons. */
  below?: ReactNode;
  /** Beside the submit button. */
  actions?: ReactNode;
  /** Questions the form may ask, shown after the discard question. */
  questions?: ReactNode;
}

/** The box, error notice, submit button and discard question every support message form shares. */
const SupportReplyShell = ({
  body,
  onBody,
  onSubmit,
  busy,
  shut = false,
  failure,
  label,
  placeholder,
  required = false,
  submitLabel,
  busyLabel,
  above,
  below,
  actions,
  questions,
}: SupportReplyShellProps): ReactElement => {
  const discard = useDiscardGuard(body.trim() !== '');
  const tooLong = body.trim().length > MESSAGE_MAX_LENGTH;

  return (
    <form className="form support-detail__reply" noValidate onSubmit={onSubmit}>
      {above}
      {failure.alert && <Notice kind="error">{failure.alert}</Notice>}
      <PlainTextField
        name="body"
        label={label}
        required={required}
        multiline
        rows={4}
        placeholder={placeholder}
        limit={MESSAGE_MAX_LENGTH}
        disabled={shut || busy}
        value={body}
        error={failure.field?.name === 'body' ? failure.field.message : undefined}
        onChange={onBody}
      />
      {below}
      <div className="support-detail__actions">
        <BusyButton
          type="submit"
          className="btn btn--solid"
          disabled={shut || body.trim() === '' || tooLong || busy}
          busy={busy}
          busyLabel={busyLabel}
        >
          {submitLabel}
        </BusyButton>
        {actions}
      </div>
      {discard.asking && <DiscardQuestion guard={discard} />}
      {questions}
    </form>
  );
};

export default SupportReplyShell;
