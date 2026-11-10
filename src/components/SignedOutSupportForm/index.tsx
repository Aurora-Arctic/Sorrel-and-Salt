'use client';

import { type FormEvent, type ReactElement, useId, useState } from 'react';
import { graphql } from '@/lib/graphql-document';
import type { SupportAbout } from '../../gql/graphql';
import { graphqlRequest } from '../../lib/graphql-client';
import { emailAddressProblem, emailFormat, normaliseEmail } from '../../lib/email-address';
import { limitMessage } from '../../lib/formats';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { SUPPORT_ABOUTS } from '../../lib/support-path';
import { MESSAGE_MAX_LENGTH, SUBJECT_MAX_LENGTH } from '../../modules/support/validation/limits';
import type { Failure } from '../../lib/types';
import { PlainTextField } from '../Field/plain-text-field';
import { FormActions } from '../Field/form-actions';
import { RadioGroupField } from '../Field/radio-group-field';
import { DiscardQuestion, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
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

const ABOUT_REQUIRED = 'Choose what this is about.';

const SignedOutSupportForm = ({
  about: initialAbout,
  path,
}: SignedOutSupportFormProps): ReactElement => {
  const aboutId = useId();
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

  const [problems, setProblems] = useState<
    Partial<Record<'email' | 'subject' | 'message', string>>
  >({});
  const errorFor = (name: string) =>
    failure.field?.name === name ? failure.field.message : undefined;
  const edited = (name: keyof typeof problems) =>
    setProblems((now) => ({ ...now, [name]: undefined }));

  const ready = email.trim() !== '' && subject.trim() !== '' && message.trim() !== '';
  const discard = useDiscardGuard(!sent && (email !== '' || subject !== '' || message !== ''));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (about === null) {
      setAboutMissing(true);
      return;
    }
    const found: typeof problems = {};
    const emailProblem = emailAddressProblem(normaliseEmail(email));
    if (emailProblem) found.email = emailProblem;
    if (subject.trim().length > SUBJECT_MAX_LENGTH)
      found.subject = limitMessage(SUBJECT_MAX_LENGTH);
    if (message.trim().length > MESSAGE_MAX_LENGTH)
      found.message = limitMessage(MESSAGE_MAX_LENGTH);
    setProblems(found);
    if (Object.keys(found).length > 0) return;
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
        error={problems.email ?? errorFor('email')}
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
        error={problems.subject ?? errorFor('subject')}
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
        note={
          <span className="field__warning">
            Don’t include passwords, payment details or other private information.
          </span>
        }
        placeholder="Write a message"
        limit={MESSAGE_MAX_LENGTH}
        disabled={sending}
        value={message}
        error={problems.message ?? errorFor('message')}
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
        dirty={ready}
        submitting={sending}
      />
    </form>
  );
};

export default SignedOutSupportForm;
