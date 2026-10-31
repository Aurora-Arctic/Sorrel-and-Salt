'use client';

import Link from 'next/link';
import { type FormEvent, type ReactElement, useId, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { SUPPORT_LIST_PATH } from '../../lib/support-path';
import type { Failure } from '../../lib/types';
import { FieldShell, FormActions, RadioGroupField, fieldDescription } from '../Field';
import { DiscardQuestion, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import type { SupportFormProps, SupportKind } from './types';

// The support request form, in the Support dialog and on `/support`: a kind, a subject and a message,
// sent as `sendSupportRequest`. The limits are the service's, said here so they are met before sending
// (claude-docs/components/support-form.md).

const SendSupportRequestDocument = graphql(`
  mutation SendSupportRequest($input: SupportRequestInput!) {
    sendSupportRequest(input: $input) {
      id
    }
  }
`);

const SUBJECT_LIMIT = 120;
const MESSAGE_LIMIT = 4000;

/** The kinds on offer, accessibility first. */
const KINDS: readonly { value: SupportKind; label: string; description: string }[] = [
  {
    value: 'accessibility',
    label: 'Accessibility',
    description: 'Something on the site you cannot use or read.',
  },
  { value: 'bug', label: 'Bug', description: 'Something is broken or does not do what it says.' },
  { value: 'question', label: 'Question', description: 'Something you would like to ask us.' },
];

const SupportForm = ({
  kind: initialKind = 'accessibility',
  errorCode,
  path,
  onDone,
}: SupportFormProps): ReactElement => {
  const subjectId = useId();
  const messageId = useId();
  const [kind, setKind] = useState<SupportKind>(initialKind);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<Failure>({});
  const [sent, setSent] = useState(false);

  const subjectField = fieldDescription({
    id: subjectId,
    note: `Up to ${SUBJECT_LIMIT} characters.`,
    error: failure.field?.name === 'subject' ? failure.field.message : undefined,
  });
  const messageField = fieldDescription({
    id: messageId,
    note: `Up to ${MESSAGE_LIMIT} characters.`,
    error: failure.field?.name === 'message' ? failure.field.message : undefined,
  });

  const ready = subject.trim() !== '' && message.trim() !== '';
  const discard = useDiscardGuard(!sent && (subject !== '' || message !== ''));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setFailure({});
    try {
      await graphqlRequest(SendSupportRequestDocument, {
        input: {
          kind,
          subject: subject.trim(),
          message: message.trim(),
          path,
          ...(errorCode !== undefined && { errorCode }),
        },
      });
      setSending(false);
      setSent(true);
    } catch (error) {
      setSending(false);
      setFailure(readGraphqlFailure(error, ['subject', 'message']));
    }
  }

  if (sent) {
    return (
      <div className="form">
        <Notice kind="success">
          Your request was received. Replies appear on{' '}
          <Link href={SUPPORT_LIST_PATH}>Your Support Requests</Link>, and we mail you when one
          arrives.
        </Notice>
        {onDone && (
          <div className="modal__actions">
            <button className="btn btn--solid" type="button" onClick={onDone}>
              Done
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <form className="form" noValidate onSubmit={(event) => void submit(event)}>
      {failure.alert && <Notice kind="error">{failure.alert}</Notice>}
      <RadioGroupField
        legend="Kind"
        name="support-kind"
        options={KINDS}
        value={kind}
        onChange={setKind}
        disabled={sending}
      />
      {(errorCode !== undefined || path) && (
        <p className="support-form__context">
          {errorCode !== undefined && <span>Error {errorCode}. </span>}
          <span>
            Page: <code>{path}</code>
          </span>
        </p>
      )}
      <FieldShell
        label="Subject"
        required
        note={`Up to ${SUBJECT_LIMIT} characters.`}
        {...subjectField}
      >
        <input
          id={subjectField.controlId}
          className="input"
          type="text"
          autoComplete="off"
          placeholder="Add a subject"
          maxLength={SUBJECT_LIMIT}
          aria-required
          {...subjectField.aria}
          value={subject}
          disabled={sending}
          onChange={(event) => setSubject(event.target.value)}
        />
      </FieldShell>
      <FieldShell
        label="Message"
        required
        note={`Up to ${MESSAGE_LIMIT} characters.`}
        {...messageField}
      >
        <textarea
          id={messageField.controlId}
          className="textarea"
          rows={6}
          placeholder="Write a message"
          maxLength={MESSAGE_LIMIT}
          aria-required
          {...messageField.aria}
          value={message}
          disabled={sending}
          onChange={(event) => setMessage(event.target.value)}
        />
      </FieldShell>
      <FormActions
        noun="Request"
        label="Send Request"
        busyLabel="Sending"
        dirty={ready}
        submitting={sending}
        holdCancel
        onCancel={onDone && (() => discard.request(onDone))}
      />
      {discard.asking && <DiscardQuestion guard={discard} />}
    </form>
  );
};

export default SupportForm;
