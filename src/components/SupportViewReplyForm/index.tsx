'use client';

import { type FormEvent, type ReactElement, useId, useState } from 'react';
import { graphql } from '@/lib/graphql-document';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import type { Failure } from '../../lib/types';
import BusyButton from '../BusyButton';
import { FieldShell, fieldDescription } from '../Field';
import { DiscardQuestion, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import type { SupportViewReplyFormProps } from './types';

// The reply box on the page a signed-out request's mailed link opens. It sends `replyToSupportRequestByViewToken`, which
// needs no session: the token is the proof.

const ReplyByViewTokenDocument = graphql(`
  mutation ReplyToSupportRequestByViewToken($token: String!, $body: String!, $website: String) {
    replyToSupportRequestByViewToken(token: $token, body: $body, website: $website)
  }
`);

const MESSAGE_LIMIT = 4000;

const SupportViewReplyForm = ({ token, onSent }: SupportViewReplyFormProps): ReactElement => {
  const bodyId = useId();
  const [body, setBody] = useState('');
  // The trap field: a person never sees it, so a value in it is a bot's.
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<Failure>({});

  const discard = useDiscardGuard(body !== '');
  const bodyField = fieldDescription({
    id: bodyId,
    error: failure.field?.name === 'body' ? failure.field.message : undefined,
  });

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
      // The page reads the request again, so the reply shows in the thread.
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
      <FieldShell label="Your Reply" {...bodyField}>
        <textarea
          id={bodyField.controlId}
          className="textarea"
          rows={4}
          placeholder="Write a reply."
          maxLength={MESSAGE_LIMIT}
          {...bodyField.aria}
          value={body}
          disabled={sending}
          onChange={(event) => setBody(event.target.value)}
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
      <div className="support-detail__actions">
        <BusyButton
          type="submit"
          className="btn btn--solid"
          disabled={body.trim() === '' || sending}
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
