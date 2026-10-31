'use client';

import Link from 'next/link';
import { type FormEvent, type ReactElement, useId, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { SUPPORT_LIST_PATH } from '../../lib/support-path';
import type { Failure } from '../../lib/types';
import {
  CharacterCount,
  ErrorSummary,
  FieldShell,
  FormActions,
  RadioGroupField,
  fieldDescription,
} from '../Field';
import { DiscardQuestion, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import { SUPPORT_ABOUTS } from '../../lib/support-path';
import type { SupportAbout, SupportFormProps } from './types';

type Problems = Partial<Record<'about' | 'subject' | 'message' | 'path', string>>;

// The support request form, in the Support dialog and on `/support`: an about, a subject and a message,
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
const PATH_LIMIT = 500;

/** Said under the choices when Send is pressed with none chosen. */
const ABOUT_REQUIRED = 'Choose what this is about.';

/** What a missing or over-long subject, message or page is told, as the service words it. */
const SUBJECT_REQUIRED = 'Write a subject';
const MESSAGE_REQUIRED = 'Write a message';
const SUBJECT_TOO_LONG = `Keep the subject to ${SUBJECT_LIMIT} characters`;
const MESSAGE_TOO_LONG = `Keep the message to ${MESSAGE_LIMIT} characters`;
const PATH_TOO_LONG = 'That page address is too long';

/** What the about field is called. */
const ABOUT_LABEL = 'What Is This About?';

const SupportForm = ({
  about: initialAbout,
  errorCode,
  errorReference,
  path,
  onDone,
}: SupportFormProps): ReactElement => {
  const aboutId = useId();
  const aboutBoxId = `${aboutId}-choices`;
  const subjectId = useId();
  const messageId = useId();
  const pageId = useId();
  const [about, setAbout] = useState<SupportAbout | null>(initialAbout ?? null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(path);
  const [sending, setSending] = useState(false);
  const [problems, setProblems] = useState<Problems>({});
  const [attempt, setAttempt] = useState(0);
  const [failure, setFailure] = useState<Failure>({});
  const [sent, setSent] = useState(false);
  const [sentSubject, setSentSubject] = useState('');

  const shown: Problems = {
    ...(failure.field && { [failure.field.name]: failure.field.message }),
    ...problems,
  };
  const subjectCountId = `${subjectId}-count`;
  const messageCountId = `${messageId}-count`;
  const pageCountId = `${pageId}-count`;

  const subjectField = fieldDescription({
    id: subjectId,
    describedBy: subjectCountId,
    note: `Up to ${SUBJECT_LIMIT} characters.`,
    error: shown.subject,
  });
  const messageField = fieldDescription({
    id: messageId,
    describedBy: messageCountId,
    note: `Up to ${MESSAGE_LIMIT} characters.`,
    error: shown.message,
  });

  const pageField = fieldDescription({
    id: pageId,
    describedBy: pageCountId,
    note: `Up to ${PATH_LIMIT} characters.`,
    error: shown.path,
  });

  // Top of the form, in the order the fields sit.
  const summary = [
    shown.about && { target: aboutBoxId, message: shown.about },
    shown.path && { target: pageField.controlId, message: shown.path },
    shown.subject && { target: subjectField.controlId, message: shown.subject },
    shown.message && { target: messageField.controlId, message: shown.message },
  ].filter((item): item is { target: string; message: string } => !!item);

  const discard = useDiscardGuard(!sent && (subject !== '' || message !== '' || page !== path));

  // What is wrong with the form as it stands, by the service's own rules: the server stays the authority.
  function problemsOf(): Problems {
    const found: Problems = {};
    if (about === null) found.about = ABOUT_REQUIRED;
    if (page.trim().length > PATH_LIMIT) found.path = PATH_TOO_LONG;
    if (subject.trim() === '') found.subject = SUBJECT_REQUIRED;
    else if (subject.trim().length > SUBJECT_LIMIT) found.subject = SUBJECT_TOO_LONG;
    if (message.trim() === '') found.message = MESSAGE_REQUIRED;
    else if (message.trim().length > MESSAGE_LIMIT) found.message = MESSAGE_TOO_LONG;
    return found;
  }

  function edited(name: keyof Problems) {
    setProblems((now) => ({ ...now, [name]: undefined }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = problemsOf();
    if (Object.keys(found).length > 0) {
      setProblems(found);
      setFailure({});
      setAttempt((count) => count + 1);
      return;
    }
    setProblems({});
    if (about === null) return;
    setSending(true);
    setFailure({});
    try {
      await graphqlRequest(SendSupportRequestDocument, {
        input: {
          about,
          subject: subject.trim(),
          message: message.trim(),
          ...(page.trim() !== '' && { path: page.trim() }),
          ...(errorCode !== undefined && { errorCode }),
          ...(errorReference && { errorReference }),
        },
      });
      setSending(false);
      setSentSubject(subject.trim());
      setSent(true);
    } catch (error) {
      setSending(false);
      const failed = readGraphqlFailure(error, ['about', 'subject', 'message', 'path']);
      setFailure(failed);
      if (failed.field) setAttempt((count) => count + 1);
    }
  }

  if (sent) {
    return (
      <div className="form">
        <Notice kind="success">
          Your request, <Link href={SUPPORT_LIST_PATH}>{sentSubject}</Link>, was received. We aim to
          reply within 5 working days; we are a small team. Replies appear on{' '}
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
      {summary.length > 0 && <ErrorSummary key={attempt} errors={summary} />}
      {failure.alert && <Notice kind="error">{failure.alert}</Notice>}
      <div id={aboutBoxId}>
        <RadioGroupField
          legend={ABOUT_LABEL}
          name={aboutId}
          layout="cards"
          options={SUPPORT_ABOUTS}
          value={about}
          disabled={sending}
          error={shown.about}
          onChange={(value) => {
            setAbout(value);
            edited('about');
          }}
        />
      </div>
      {errorCode !== undefined && (
        <p className="support-form__context">
          Error {errorCode}
          {errorReference ? `, reference ${errorReference}` : ''}.
        </p>
      )}
      <FieldShell
        label="Page"
        note={`Up to ${PATH_LIMIT} characters.`}
        after={<CharacterCount id={pageCountId} length={page.length} limit={PATH_LIMIT} />}
        {...pageField}
      >
        <input
          id={pageField.controlId}
          className="input"
          type="text"
          autoComplete="off"
          {...pageField.aria}
          value={page}
          disabled={sending}
          onChange={(event) => {
            setPage(event.target.value);
            edited('path');
          }}
        />
      </FieldShell>
      <FieldShell
        label="Subject"
        required
        note={`Up to ${SUBJECT_LIMIT} characters.`}
        after={<CharacterCount id={subjectCountId} length={subject.length} limit={SUBJECT_LIMIT} />}
        {...subjectField}
      >
        <input
          id={subjectField.controlId}
          className="input"
          type="text"
          autoComplete="off"
          placeholder="Add a subject"
          aria-required
          {...subjectField.aria}
          value={subject}
          disabled={sending}
          onChange={(event) => {
            setSubject(event.target.value);
            edited('subject');
          }}
        />
      </FieldShell>
      <FieldShell
        label="Message"
        required
        note={`Up to ${MESSAGE_LIMIT} characters.`}
        after={<CharacterCount id={messageCountId} length={message.length} limit={MESSAGE_LIMIT} />}
        {...messageField}
      >
        <textarea
          id={messageField.controlId}
          className="textarea"
          rows={6}
          placeholder="Write a message"
          aria-required
          {...messageField.aria}
          value={message}
          disabled={sending}
          onChange={(event) => {
            setMessage(event.target.value);
            edited('message');
          }}
        />
      </FieldShell>
      <FormActions
        noun="Request"
        label="Send Request"
        busyLabel="Sending"
        dirty
        submitting={sending}
        holdCancel
        onCancel={onDone && (() => discard.request(onDone))}
      />
      {discard.asking && <DiscardQuestion guard={discard} />}
    </form>
  );
};

export default SupportForm;
