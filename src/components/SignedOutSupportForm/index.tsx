'use client';

import { type FormEvent, type ReactElement, useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { graphql } from '@/lib/graphql-document';
import type { SupportAbout } from '../../gql/graphql';
import { graphqlRequest } from '../../lib/graphql-client';
import { emailAddressProblem, emailFormat, normaliseEmail } from '../../lib/email-address';
import { limitMessage } from '../../lib/formats';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { SUPPORT_ABOUTS } from '../../lib/support-path';
import { ABOUT_REQUIRED, MESSAGE_REQUIRED, SUBJECT_REQUIRED } from '../../lib/support-messages';
import { MESSAGE_MAX_LENGTH, SUBJECT_MAX_LENGTH } from '../../modules/support/validation/limits';
import type { Failure } from '../../lib/types';
import { PlainTextField } from '../Field/plain-text-field';
import { FormActions } from '../Field/form-actions';
import { RadioGroupField } from '../Field/radio-group-field';
import { DiscardQuestion, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import { ErrorDetails } from '../SupportForm/error-details';
import type { SignedOutSupportFormProps } from './types';

// Sends `sendSignedOutSupportRequest`; the reply comes by email alone.

const SendSignedOutSupportRequestDocument = graphql(`
  mutation SendSignedOutSupportRequest($input: SignedOutSupportRequestInput!) {
    sendSignedOutSupportRequest(input: $input)
  }
`);

const SIGNED_OUT_TOPICS = SUPPORT_ABOUTS.filter(({ value }) =>
  ['accessibility', 'bug', 'account', 'privacy', 'question'].includes(value),
);

type Problems = Partial<Record<'about' | 'email' | 'subject' | 'message', string>>;

const SignedOutSupportForm = ({
  about: initialAbout,
  errorReference,
  errorDetail,
  path,
}: SignedOutSupportFormProps): ReactElement => {
  const aboutId = useId();
  const aboutBoxId = `${aboutId}-choices`;
  const formRef = useRef<HTMLFormElement>(null);
  const [about, setAbout] = useState<SupportAbout | null>(
    SIGNED_OUT_TOPICS.find(({ value }) => value === initialAbout)?.value ?? null,
  );
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  // The trap field: a person never sees it, so a value in it is a bot's.
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<Failure>({});
  const [sent, setSent] = useState(false);

  const [problems, setProblems] = useState<Problems>({});
  const shown: Problems = {
    ...(failure.field && { [failure.field.name]: failure.field.message }),
    ...problems,
  };
  const edited = (name: keyof Problems) => setProblems((now) => ({ ...now, [name]: undefined }));

  // The topic group's first radio stands for the group.
  function focusFirst(wrong: Problems) {
    const target = wrong.about
      ? document.getElementById(aboutBoxId)?.querySelector<HTMLElement>('input')
      : formRef.current?.querySelector<HTMLElement>(
          `[name="${wrong.email ? 'email' : wrong.subject ? 'subject' : 'message'}"]`,
        );
    target?.focus();
  }

  function problemsOf(): Problems {
    const found: Problems = {};
    if (about === null) found.about = ABOUT_REQUIRED;
    const emailProblem = emailAddressProblem(normaliseEmail(email));
    if (emailProblem) found.email = emailProblem;
    if (subject.trim() === '') found.subject = SUBJECT_REQUIRED;
    else if (subject.trim().length > SUBJECT_MAX_LENGTH)
      found.subject = limitMessage(SUBJECT_MAX_LENGTH);
    if (message.trim() === '') found.message = MESSAGE_REQUIRED;
    else if (message.trim().length > MESSAGE_MAX_LENGTH)
      found.message = limitMessage(MESSAGE_MAX_LENGTH);
    return found;
  }
  const discard = useDiscardGuard(!sent && (email !== '' || subject !== '' || message !== ''));

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
      await graphqlRequest(SendSignedOutSupportRequestDocument, {
        input: {
          about,
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
          path,
          ...(errorReference && { errorReference }),
          ...(errorDetail && { errorDetail }),
          ...(website !== '' && { website }),
        },
      });
      setSending(false);
      setSent(true);
    } catch (error) {
      setSending(false);
      const failed = readGraphqlFailure(error, ['about', 'email', 'subject', 'message']);
      flushSync(() => setFailure(failed));
      if (failed.field) focusFirst({ [failed.field.name]: failed.field.message });
    }
  }

  if (sent) {
    return (
      <Notice kind="success">
        Your message was received. We will reply by email within 5 working days.
      </Notice>
    );
  }

  return (
    <form ref={formRef} className="form" noValidate onSubmit={(event) => void submit(event)}>
      {failure.alert && <Notice kind="error">{failure.alert}</Notice>}
      <RadioGroupField
        id={aboutBoxId}
        legend="What Is This About?"
        required
        name={aboutId}
        layout="cards"
        options={SIGNED_OUT_TOPICS}
        value={about}
        disabled={sending}
        error={shown.about}
        onChange={(value) => {
          setAbout(value);
          edited('about');
        }}
      />
      <PlainTextField
        name="email"
        label="Email"
        required
        note="We reply to this address"
        type="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="Add an email"
        format={emailFormat}
        check={emailAddressProblem}
        disabled={sending}
        value={email}
        error={shown.email}
        onChange={(next) => {
          setEmail(next);
          edited('email');
        }}
      />
      <PlainTextField
        name="subject"
        label="Subject"
        required
        autoComplete="off"
        placeholder="Add a subject"
        limit={SUBJECT_MAX_LENGTH}
        disabled={sending}
        value={subject}
        error={shown.subject}
        onChange={(next) => {
          setSubject(next);
          edited('subject');
        }}
      />
      {errorDetail && <ErrorDetails detail={errorDetail} />}
      <PlainTextField
        name="message"
        label="Message"
        required
        multiline
        rows={6}
        note={
          <span className="field__warning">
            Don’t include passwords, payment details or other private information.
          </span>
        }
        placeholder="Write a message"
        limit={MESSAGE_MAX_LENGTH}
        disabled={sending}
        value={message}
        error={shown.message}
        onChange={(next) => {
          setMessage(next);
          edited('message');
        }}
      />
      <div hidden>
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>
      {discard.asking && <DiscardQuestion guard={discard} />}
      <FormActions
        noun="Request"
        label="Send Request"
        busyLabel="Sending"
        dirty
        submitting={sending}
      />
    </form>
  );
};

export default SignedOutSupportForm;
