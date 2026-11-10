'use client';

import { type FormEvent, type ReactElement, useId, useState } from 'react';
import { graphql } from '@/lib/graphql-document';
import type { SupportAbout } from '../../gql/graphql';
import { graphqlRequest } from '../../lib/graphql-client';
import { emailAddressProblem, normaliseEmail } from '../../lib/email-address';
import { useFormSend } from '../../lib/use-form-send';
import { SUPPORT_ABOUTS } from '../../lib/support-path';
import { ABOUT_REQUIRED } from '../../lib/support-messages';
import { MESSAGE_MAX_LENGTH, SUBJECT_MAX_LENGTH } from '../../modules/support/validation/limits';
import {
  EmailField,
  FormActions,
  PlainTextField,
  RadioGroupField,
  usePlainProblems,
  type PlainProblems,
} from '../Field';
import { DiscardQuestion, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import { ErrorDetails } from '../SupportForm/error-details';
import { subjectAndMessageProblems } from '../SupportForm/problems';
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

const FIELDS = ['about', 'email', 'subject', 'message'] as const;

const SignedOutSupportForm = ({
  about: initialAbout,
  errorReference,
  errorDetail,
  path,
}: SignedOutSupportFormProps): ReactElement => {
  const aboutId = useId();
  const aboutBoxId = `${aboutId}-choices`;
  const [about, setAbout] = useState<SupportAbout | null>(
    SIGNED_OUT_TOPICS.find(({ value }) => value === initialAbout)?.value ?? null,
  );
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  // The trap field: a person never sees it, so a value in it is a bot's.
  const [website, setWebsite] = useState('');
  const { sending, failure, setFailure, send } = useFormSend(FIELDS);
  const [sent, setSent] = useState(false);

  // The topic group's first radio stands for the group.
  const { formRef, shown, edited, refuse } = usePlainProblems(FIELDS, failure, {
    about: aboutBoxId,
  });

  function problemsOf() {
    const found: PlainProblems<(typeof FIELDS)[number]> = subjectAndMessageProblems(
      subject,
      message,
    );
    if (about === null) found.about = ABOUT_REQUIRED;
    const emailProblem = emailAddressProblem(normaliseEmail(email));
    if (emailProblem) found.email = emailProblem;
    return found;
  }
  const discard = useDiscardGuard(!sent && (email !== '' || subject !== '' || message !== ''));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (refuse(problemsOf())) return setFailure({});
    if (about === null) return;
    const done = await send(() =>
      graphqlRequest(SendSignedOutSupportRequestDocument, {
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
      }),
    );
    if (done) setSent(true);
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
      <EmailField
        name="email"
        label="Email"
        note="We reply to this address"
        autoComplete="email"
        placeholder="Add an email"
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
