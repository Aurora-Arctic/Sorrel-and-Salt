'use client';

import { type FormEvent, type ReactElement, type ReactNode, useId, useState } from 'react';
import { graphql } from '@/lib/graphql-document';
import { graphqlRequest } from '../../lib/graphql-client';
import { useFormSend } from '../../lib/use-form-send';
import {
  MESSAGE_MAX_LENGTH,
  PATH_MAX_LENGTH,
  SUBJECT_MAX_LENGTH,
} from '../../modules/support/validation/limits';
import { SUPPORT_LIST_PATH } from '../../lib/support-path';
import { ABOUT_REQUIRED, PATH_TOO_LONG } from '../../lib/support-messages';
import {
  FormActions,
  PlainTextField,
  RadioGroupField,
  usePlainProblems,
  type PlainProblems,
} from '../Field';
import { DiscardQuestion, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import { ErrorDetails } from './error-details';
import { subjectAndMessageProblems } from './problems';
import { PAGE_NOT_ON_SITE, SUPPORT_ABOUTS, isSitePage } from '../../lib/support-path';
import type { SupportAbout, SupportFormProps } from './types';
import { PendingLink } from '../../lib/navigation';

// The limits are the service's, said here so they are met before sending (claude-docs/components/support-form.md).

const SendSupportRequestDocument = graphql(`
  mutation SendSupportRequest($input: SupportRequestInput!) {
    sendSupportRequest(input: $input) {
      id
    }
  }
`);

const FIELDS = ['about', 'path', 'subject', 'message'] as const;

const ABOUT_LABEL = 'What Is This About?';

const SupportForm = ({
  about: initialAbout,
  errorCode,
  errorReference,
  errorDetail,
  path,
  onDone,
}: SupportFormProps): ReactElement => {
  const aboutId = useId();
  const aboutBoxId = `${aboutId}-choices`;
  const [about, setAbout] = useState<SupportAbout | null>(initialAbout ?? null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(path);
  const { sending, failure, setFailure, send } = useFormSend(FIELDS);
  // The topic group's first radio stands for the group.
  const { formRef, shown, edited, refuse } = usePlainProblems(FIELDS, failure, {
    about: aboutBoxId,
  });
  const [sent, setSent] = useState(false);
  const [sentSubject, setSentSubject] = useState('');

  const pageNote: ReactNode =
    errorCode === undefined ? undefined : (
      <>
        Opened from the Error {errorCode} page
        {errorReference && (
          <>
            , reference <code>{errorReference}</code>
          </>
        )}
        . You can change it.
      </>
    );

  const discard = useDiscardGuard(!sent && (subject !== '' || message !== '' || page !== path));

  // By the service's own rules: the server stays the authority.
  function problemsOf() {
    const found: PlainProblems<(typeof FIELDS)[number]> = subjectAndMessageProblems(
      subject,
      message,
    );
    if (about === null) found.about = ABOUT_REQUIRED;
    if (page.trim().length > PATH_MAX_LENGTH) found.path = PATH_TOO_LONG;
    else if (!isSitePage(page)) found.path = PAGE_NOT_ON_SITE;
    return found;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (refuse(problemsOf())) return setFailure({});
    if (about === null) return;
    const done = await send(() =>
      graphqlRequest(SendSupportRequestDocument, {
        input: {
          about,
          subject: subject.trim(),
          message: message.trim(),
          ...(page.trim() !== '' && { path: page.trim() }),
          ...(errorCode !== undefined && { errorCode }),
          ...(errorReference && { errorReference }),
          ...(errorDetail && { errorDetail }),
        },
      }),
    );
    if (!done) return;
    setSentSubject(subject.trim());
    setSent(true);
  }

  if (sent) {
    return (
      <div className="form">
        <Notice kind="success">
          Your request, <PendingLink href={SUPPORT_LIST_PATH}>{sentSubject}</PendingLink>, was
          received. We aim to reply within 5 working days; we are a small team. Replies appear on{' '}
          <PendingLink href={SUPPORT_LIST_PATH}>Your Support Requests</PendingLink>, and we mail you
          when one arrives.
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
    <form ref={formRef} className="form" noValidate onSubmit={(event) => void submit(event)}>
      {failure.alert && <Notice kind="error">{failure.alert}</Notice>}
      <RadioGroupField
        id={aboutBoxId}
        legend={ABOUT_LABEL}
        required
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
      <PlainTextField
        name="path"
        label="Page"
        note={pageNote}
        autoComplete="off"
        limit={PATH_MAX_LENGTH}
        disabled={sending}
        value={page}
        error={shown.path}
        onChange={(next) => {
          setPage(next);
          edited('path');
        }}
      />
      {errorDetail && <ErrorDetails detail={errorDetail} />}
      <PlainTextField
        name="subject"
        label="Subject"
        required
        placeholder="Add a subject"
        autoComplete="off"
        limit={SUBJECT_MAX_LENGTH}
        disabled={sending}
        value={subject}
        error={shown.subject}
        onChange={(next) => {
          setSubject(next);
          edited('subject');
        }}
      />
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
        disabled={sending}
        value={message}
        error={shown.message}
        onChange={(next) => {
          setMessage(next);
          edited('message');
        }}
      />
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
