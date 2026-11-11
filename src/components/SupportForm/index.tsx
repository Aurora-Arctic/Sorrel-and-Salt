'use client';

import { type FormEvent, type ReactElement, type ReactNode, useId, useState } from 'react';
import { graphql } from '@/lib/graphql-document';
import { graphqlRequest } from '../../lib/graphql-client';
import { useFormSend } from '../../lib/use-form-send';
import { PATH_MAX_LENGTH } from '../../modules/support/validation/limits';
import { SUPPORT_LIST_PATH } from '../../lib/support-path';
import { ABOUT_REQUIRED, PATH_TOO_LONG } from '../../lib/support-messages';
import { PlainTextField } from '../Field/plain-text-field';
import { FormActions } from '../Field/form-actions';
import { RadioGroupField } from '../Field/radio-group-field';
import { usePlainProblems, type PlainProblems } from '../Field/use-plain-problems';
import { DiscardQuestion, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import { ErrorDetails } from './error-details';
import { SupportMessageFields } from './message-fields';
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
      <SupportMessageFields
        subject={subject}
        message={message}
        onSubject={(next) => {
          setSubject(next);
          edited('subject');
        }}
        onMessage={(next) => {
          setMessage(next);
          edited('message');
        }}
        subjectError={shown.subject}
        messageError={shown.message}
        disabled={sending}
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
