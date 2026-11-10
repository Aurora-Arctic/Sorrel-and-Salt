'use client';

import { type FormEvent, type ReactElement, type ReactNode, useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { graphql } from '@/lib/graphql-document';
import { graphqlRequest } from '../../lib/graphql-client';
import { limitMessage } from '../../lib/formats';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import {
  MESSAGE_MAX_LENGTH,
  PATH_MAX_LENGTH,
  SUBJECT_MAX_LENGTH,
} from '../../modules/support/validation/limits';
import { SUPPORT_LIST_PATH } from '../../lib/support-path';
import {
  ABOUT_REQUIRED,
  MESSAGE_REQUIRED,
  PATH_TOO_LONG,
  SUBJECT_REQUIRED,
} from '../../lib/support-messages';
import type { Failure } from '../../lib/types';
import { PlainTextField } from '../Field/plain-text-field';
import { FormActions } from '../Field/form-actions';
import { RadioGroupField } from '../Field/radio-group-field';
import { DiscardQuestion, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import { PAGE_NOT_ON_SITE, SUPPORT_ABOUTS, isSitePage } from '../../lib/support-path';
import type { SupportAbout, SupportFormProps } from './types';
import { PendingLink } from '../../lib/navigation';

type Problems = Partial<Record<'about' | 'subject' | 'message' | 'path', string>>;

// The limits are the service's, said here so they are met before sending (claude-docs/components/support-form.md).

const SendSupportRequestDocument = graphql(`
  mutation SendSupportRequest($input: SupportRequestInput!) {
    sendSupportRequest(input: $input) {
      id
    }
  }
`);

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
  const formRef = useRef<HTMLFormElement>(null);
  const [about, setAbout] = useState<SupportAbout | null>(initialAbout ?? null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(path);
  const [sending, setSending] = useState(false);
  const [problems, setProblems] = useState<Problems>({});
  const [failure, setFailure] = useState<Failure>({});
  const [sent, setSent] = useState(false);
  const [sentSubject, setSentSubject] = useState('');

  const shown: Problems = {
    ...(failure.field && { [failure.field.name]: failure.field.message }),
    ...problems,
  };
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

  // The topic group's first radio stands for the group.
  function focusFirst(wrong: Problems) {
    const target = wrong.about
      ? document.getElementById(aboutBoxId)?.querySelector<HTMLElement>('input')
      : formRef.current?.querySelector<HTMLElement>(
          `[name="${wrong.path ? 'path' : wrong.subject ? 'subject' : 'message'}"]`,
        );
    target?.focus();
  }

  const discard = useDiscardGuard(!sent && (subject !== '' || message !== '' || page !== path));

  // By the service's own rules: the server stays the authority.
  function problemsOf(): Problems {
    const found: Problems = {};
    if (about === null) found.about = ABOUT_REQUIRED;
    if (page.trim().length > PATH_MAX_LENGTH) found.path = PATH_TOO_LONG;
    else if (!isSitePage(page)) found.path = PAGE_NOT_ON_SITE;
    if (subject.trim() === '') found.subject = SUBJECT_REQUIRED;
    else if (subject.trim().length > SUBJECT_MAX_LENGTH)
      found.subject = limitMessage(SUBJECT_MAX_LENGTH);
    if (message.trim() === '') found.message = MESSAGE_REQUIRED;
    else if (message.trim().length > MESSAGE_MAX_LENGTH)
      found.message = limitMessage(MESSAGE_MAX_LENGTH);
    return found;
  }

  function edited(name: keyof Problems) {
    setProblems((now) => ({ ...now, [name]: undefined }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = problemsOf();
    if (Object.keys(found).length > 0) {
      flushSync(() => setProblems(found));
      setFailure({});
      focusFirst(found);
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
      flushSync(() => setFailure(failed));
      if (failed.field) focusFirst({ [failed.field.name]: failed.field.message });
    }
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
