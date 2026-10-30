'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { type FormEvent, type ReactElement, useEffect, useId, useState } from 'react';
import { graphql } from '../../gql';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { graphqlRequest } from '../../lib/graphql-client';
import { FieldShell, FormActions, fieldDescription } from '../Field';
import Notice from '../Notice';
import PageHeader from '../PageHeader';
import type { EmailFormProps } from './types';
import './index.scss';

// The `/account/email` page's form and the account page's Email section (`embedded`): the address, its
// verification state, and a new one. Every submit sends mail rather than writing the row, so success
// names what was typed (claude-docs/components/email-form.md).

// A plain controlled input rather than react-hook-form: one field, and DESIGN.md §7's
// resolver pattern arrives with the shared Zod schemas.

const SetEmailDocument = graphql(`
  mutation SetEmail($email: String!, $next: String) {
    setEmail(email: $email, next: $next) {
      id
      email
    }
  }
`);

/** How long the submit stays down after a send: one mail a minute from a form. */
export const RESEND_DELAY_SECONDS = 60;

/** As the column stores it, so "unchanged" compares what the server would see. */
function normalise(input: string): string {
  return input.trim().toLowerCase();
}

// The status line, one per state of the address: the only rendering of that
// state, so the tests read them from here rather than restating the words.
export const VERIFIED_STATUS = "Your email address is confirmed. We'll send your emails here.";
export const NO_EMAIL_STATUS = 'No email address yet. Enter the one we should write to.';
export const UNVERIFIED_STATUS =
  "Your email address isn't confirmed yet. Open the link we sent you, or send a new one.";
export const CHANGE_STATUS = "Enter a new email address and we'll send it a confirmation link.";

function statusLine(email: string, verified: boolean): string {
  if (email === '') return NO_EMAIL_STATUS;
  // A verified account back to change it: the confirmation is the other view.
  if (verified) return CHANGE_STATUS;
  return UNVERIFIED_STATUS;
}

const EmailForm = ({
  email,
  verified,
  confirmed = false,
  next,
  landing,
  error,
  waitSeconds = 0,
  embedded = false,
  accountPath,
}: EmailFormProps): ReactElement => {
  const fieldId = useId();
  const [value, setValue] = useState(email);
  const [sentTo, setSentTo] = useState<string>();
  const [alert, setAlert] = useState(error);
  const [fieldError, setFieldError] = useState<string>();
  // When the submit may be pressed again, as a clock time so a tab left in the
  // background counts the real wait.
  const [cooldownUntil, setCooldownUntil] = useState<number | undefined>(() =>
    waitSeconds > 0 ? Date.now() + waitSeconds * 1000 : undefined,
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (cooldownUntil === undefined) return;
    const tick = () => {
      const at = Date.now();
      setNow(at);
      if (at >= cooldownUntil) setCooldownUntil(undefined);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const secondsLeft =
    cooldownUntil === undefined ? 0 : Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const coolingDown = secondsLeft > 0;

  const mutation = useMutation({
    // The link it asks for lands back here, and Continue goes on to `next`.
    mutationFn: (address: string) => graphqlRequest(SetEmailDocument, { email: address, next }),
    onSuccess: (_data, address) => {
      setSentTo(normalise(address));
      setCooldownUntil(Date.now() + RESEND_DELAY_SECONDS * 1000);
    },
    onError: (failure) => {
      const { field, alert: message } = readGraphqlFailure(failure, ['email']);
      setFieldError(field?.message);
      setAlert(message);
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    // A disabled submit stops a click, not a form submitted by other means.
    if (coolingDown) return;
    setSentTo(undefined);
    setAlert(undefined);
    setFieldError(undefined);
    mutation.mutate(value);
  };

  // Standalone, the page's head: the heading and, as its lede, the line saying where
  // the address stands. Embedded, the section heads the form, and there is no confirmed
  // view: a followed link lands on the email page, never the account page.
  const head = (status: string) =>
    embedded ? (
      <p className="lede email-form__status">{status}</p>
    ) : (
      <PageHeader title="Your Email" lede={status} />
    );

  if (confirmed && !embedded) {
    return (
      <div className="email-form">
        {head(VERIFIED_STATUS)}
        <p className="email-form__address">{email}</p>
        <p className="email-form__continue">
          {/* Cast: `next` is whatever page sent us here, already run through
              safeReturnPath, so it is a same-site path but not a known route. */}
          <Link className="btn btn--solid" href={(next as Route | undefined) ?? landing}>
            Continue
          </Link>
          {accountPath && (
            <a className="btn btn--quiet" href={accountPath}>
              Continue to Account
            </a>
          )}
        </p>
      </div>
    );
  }

  // Only a verified, unchanged address has nothing to send: an unverified one
  // resends its link, and any edit is a change request.
  const nothingToDo = verified && normalise(value) === email;
  const { aria, ...field } = fieldDescription({ id: fieldId, error: fieldError });

  return (
    <div className="email-form">
      {head(statusLine(email, verified))}
      {alert && <Notice kind="error">{alert}</Notice>}
      {sentTo && (
        <Notice kind="success">
          We&apos;ve sent a link to {sentTo}. Open it in this browser within an hour to confirm it.
        </Notice>
      )}
      {/* `noValidate`: every refusal is the server's, worded and placed like
          the rest, rather than the browser's own bubble. */}
      <form className="form" onSubmit={handleSubmit} noValidate>
        <FieldShell label="Email Address" {...field}>
          <input
            id={field.controlId}
            className="input"
            type="email"
            autoComplete="email"
            placeholder="Add your email"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            {...aria}
          />
        </FieldShell>
        <FormActions
          noun="Confirmation"
          label={coolingDown ? `Send Again in ${secondsLeft}s` : 'Send Confirmation'}
          busyLabel="Sending Confirmation"
          dirty={!nothingToDo && !coolingDown}
          submitting={mutation.isPending}
        />
      </form>
      {/* The way on for an account that can leave: an unverified one reaches
          no other page, so it is offered none. */}
      {accountPath && verified && !embedded && (
        <p className="email-form__continue">
          <a className="btn btn--quiet" href={accountPath}>
            Continue to Account
          </a>
        </p>
      )}
    </div>
  );
};

export default EmailForm;
