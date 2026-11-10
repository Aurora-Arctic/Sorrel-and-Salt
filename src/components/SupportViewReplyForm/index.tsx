'use client';

import { type FormEvent, type ReactElement, useState } from 'react';
import { graphql } from '@/lib/graphql-document';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { MESSAGE_MAX_LENGTH } from '../../modules/support/validation/limits';
import type { Failure } from '../../lib/types';
import BusyButton from '../BusyButton';
import { PlainTextField } from '../Field/plain-text-field';
import { DiscardQuestion, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import type { SupportViewReplyFormProps } from './types';

// Sends `replyToSupportRequestByViewToken`, which needs no session: the token is the proof.

const ReplyByViewTokenDocument = graphql(`
  mutation ReplyToSupportRequestByViewToken($token: String!, $body: String!, $website: String) {
    replyToSupportRequestByViewToken(token: $token, body: $body, website: $website)
  }
`);

const SupportViewReplyForm = ({ token, onSent }: SupportViewReplyFormProps): ReactElement => {
  const [body, setBody] = useState('');
  // The trap field: a person never sees it, so a value in it is a bot's.
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<Failure>({});

  const tooLong = body.trim().length > MESSAGE_MAX_LENGTH;
  const discard = useDiscardGuard(body.trim() !== '');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setFailure({});
    try {
      await graphqlRequest(ReplyByViewTokenDocument, {
        token,
        body: body.trim(),
        ...(website !== '' && { website }),
      });
      setBody('');
      setSending(false);
      onSent();
    } catch (error) {
      setSending(false);
      setFailure(readGraphqlFailure(error, ['body']));
    }
  }

  return (
    <form
      className="form support-detail__reply"
      noValidate
      onSubmit={(event) => void submit(event)}
    >
      {failure.alert && <Notice kind="error">{failure.alert}</Notice>}
      <PlainTextField
        name="body"
        label="Your Reply"
        multiline
        rows={4}
        placeholder="Write a reply"
        limit={MESSAGE_MAX_LENGTH}
        disabled={sending}
        value={body}
        error={failure.field?.name === 'body' ? failure.field.message : undefined}
        onChange={setBody}
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
      <div className="support-detail__actions">
        <BusyButton
          type="submit"
          className="btn btn--solid"
          disabled={body.trim() === '' || tooLong || sending}
          busy={sending}
          busyLabel="Sending"
        >
          Reply
        </BusyButton>
      </div>
    </form>
  );
};

export default SupportViewReplyForm;
