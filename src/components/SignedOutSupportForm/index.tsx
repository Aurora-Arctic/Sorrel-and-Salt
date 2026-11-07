'use client';

import { type FormEvent, type ReactElement, useId, useState } from 'react';
import { graphql } from '@/lib/graphql-document';
import type { SupportAbout } from '../../gql/graphql';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { SUPPORT_ABOUTS } from '../../lib/support-path';
import type { Failure } from '../../lib/types';
import { FieldShell, FormActions, RadioGroupField, fieldDescription } from '../Field';
import { DiscardQuestion, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import type { SignedOutSupportFormProps } from './types';

// Sends `sendSignedOutSupportRequest`; the reply comes by email alone.

const SendSignedOutSupportRequestDocument = graphql(`
  mutation SendSignedOutSupportRequest($input: SignedOutSupportRequestInput!) {
    sendSignedOutSupportRequest(input: $input)
  }
`);

const SUBJECT_LIMIT = 120;
const MESSAGE_LIMIT = 4000;

const SIGNED_OUT_TOPICS = SUPPORT_ABOUTS.filter(({ value }) =>
  ['accessibility', 'bug', 'account', 'privacy', 'question'].includes(value),
);

const ABOUT_REQUIRED = 'Choose what this is about.';

const SignedOutSupportForm = ({
  about: initialAbout,
  path,
}: SignedOutSupportFormProps): ReactElement => {
  const aboutId = useId();
  const emailId = useId();
  const subjectId = useId();
  const messageId = useId();
  const [about, setAbout] = useState<SupportAbout | null>(
    SIGNED_OUT_TOPICS.find(({ value }) => value === initialAbout)?.value ?? null,
  );
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  // The trap field: a person never sees it, so a value in it is a bot's.
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [aboutMissing, setAboutMissing] = useState(false);
  const [failure, setFailure] = useState<Failure>({});
  const [sent, setSent] = useState(false);

  const errorFor = (name: string) =>
    failure.field?.name === name ? failure.field.message : undefined;
  const emailField = fieldDescription({
    id: emailId,
    note: 'We reply to this address.',
    error: errorFor('email'),
  });
  const subjectField = fieldDescription({
    id: subjectId,
    note: `Up to ${SUBJECT_LIMIT} characters.`,
    error: errorFor('subject'),
  });
  const messageField = fieldDescription({
    id: messageId,
    note: `Up to ${MESSAGE_LIMIT} characters.`,
    error: errorFor('message'),
  });

  const ready = email.trim() !== '' && subject.trim() !== '' && message.trim() !== '';
  const discard = useDiscardGuard(!sent && (email !== '' || subject !== '' || message !== ''));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (about === null) {
      setAboutMissing(true);
      return;
    }
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
          ...(website !== '' && { website }),
        },
      });
      setSending(false);
      setSent(true);
    } catch (error) {
      setSending(false);
      setFailure(readGraphqlFailure(error, ['about', 'email', 'subject', 'message']));
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
    <form className="form" noValidate onSubmit={(event) => void submit(event)}>
      {failure.alert && <Notice kind="error">{failure.alert}</Notice>}
      <RadioGroupField
        legend="What Is This About?"
        required
        name={aboutId}
        layout="cards"
        options={SIGNED_OUT_TOPICS}
        value={about}
        disabled={sending}
        error={aboutMissing && about === null ? ABOUT_REQUIRED : errorFor('about')}
        onChange={setAbout}
      />
      <FieldShell label="Email" required note="We reply to this address." {...emailField}>
        <input
          id={emailField.controlId}
          className="input"
          type="email"
          autoComplete="email"
          placeholder="Add your email address"
          aria-required
          {...emailField.aria}
          value={email}
          disabled={sending}
          onChange={(event) => setEmail(event.target.value)}
        />
      </FieldShell>
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
        note={
          <>
            {`Up to ${MESSAGE_LIMIT} characters. `}
            <span className="field__warning">
              Don’t include passwords, payment details or other private information.
            </span>
          </>
        }
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
        dirty={ready}
        submitting={sending}
      />
    </form>
  );
};

export default SignedOutSupportForm;
