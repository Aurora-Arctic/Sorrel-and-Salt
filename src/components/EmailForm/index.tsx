'use client';

import { useMutation } from '@tanstack/react-query';
import { ClientError } from 'graphql-request';
import { type FormEvent, type ReactElement, useEffect, useId, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import type { EmailFormProps, Failure } from './types';
import './index.scss';

// The `/account/email` page's one form: show the account's address and its
// verification state, and take a new one. Every submit sends mail rather than
// writing the row — the address changes only when the mailed link is followed
// — so the success message names what was typed, not what came back.
// See claude-docs/components/email-form.md.

// A plain controlled input rather than react-hook-form: one field, and
// DESIGN.md §7's resolver pattern arrives with the shared Zod schemas (M4.5).

const SetEmailDocument = graphql(`
  mutation SetEmail($email: String!) {
    setEmail(email: $email) {
      id
      email
    }
  }
`);

export const GENERIC_EMAIL_ERROR = "That didn't work. Please try again.";

/** How long the submit stays down after a send: one mail a minute from a form. */
export const RESEND_DELAY_SECONDS = 60;

/** As the column stores it, so "unchanged" compares what the server would see. */
function normalise(input: string): string {
  return input.trim().toLowerCase();
}

// The shape claude-docs/graphql.md, "Errors" describes: the first error's
// `extensions` carries the code and, for VALIDATION, the field errors.
function readFailure(error: unknown): Failure {
  if (!(error instanceof ClientError)) return { alert: GENERIC_EMAIL_ERROR };
  const first = error.response.errors?.[0];
  const extensions = first?.extensions as
    { code?: string; fieldErrors?: { path: (string | number)[]; message: string }[] } | undefined;
  if (extensions?.code === 'VALIDATION') {
    const issue = extensions.fieldErrors?.find(({ path }) => path[0] === 'email');
    if (issue) return { field: issue.message };
  }
  return { alert: first?.message || GENERIC_EMAIL_ERROR };
}

export const VERIFIED_STATUS = 'Verified: we will send emails to this address.';

function statusLine(email: string, verified: boolean): string {
  if (email === '') return 'No email yet. Enter the address Sorrel & Salt should write to.';
  // A verified account back to change it: the confirmation is the other view.
  if (verified) return "Enter a new address and we'll send it a confirmation link.";
  return 'Not yet verified. Check your inbox for a confirmation link, or send a new one.';
}

const EmailForm = ({
  email,
  verified,
  confirmed = false,
  next,
  error,
  waitSeconds = 0,
  resendDelaySeconds = RESEND_DELAY_SECONDS,
}: EmailFormProps): ReactElement => {
  const inputId = useId();
  const fieldErrorId = useId();
  const [value, setValue] = useState(email);
  const [sentTo, setSentTo] = useState<string>();
  const [alert, setAlert] = useState(error);
  const [fieldError, setFieldError] = useState<string>();
  // When the submit may be pressed again, as a clock time so a tab left in
  // the background counts the real wait rather than the ticks it was awake for.
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
    mutationFn: (address: string) => graphqlRequest(SetEmailDocument, { email: address }),
    onSuccess: (_data, address) => {
      setSentTo(normalise(address));
      setCooldownUntil(Date.now() + resendDelaySeconds * 1000);
    },
    onError: (failure) => {
      const { field, alert: message } = readFailure(failure);
      setFieldError(field);
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

  if (confirmed) {
    return (
      <div className="email-form">
        <h1 className="email-form__heading">Your email</h1>
        <p className="email-form__status">{VERIFIED_STATUS}</p>
        <p className="email-form__address">{email}</p>
        <p className="email-form__continue">
          {/* A plain anchor rather than <Link>: typed routes refuse a route
              that is not built yet, and `next` is whatever page sent us here. */}
          <a className="btn" href={next}>
            Continue
          </a>
        </p>
      </div>
    );
  }

  // Only a verified, unchanged address has nothing to send: an unverified one
  // resends its link, and any edit is a change request.
  const nothingToDo = verified && normalise(value) === email;

  return (
    <div className="email-form">
      <h1 className="email-form__heading">Your email</h1>
      <p className="email-form__status">{statusLine(email, verified)}</p>
      {alert && (
        <p className="email-form__error" role="alert">
          {alert}
        </p>
      )}
      {sentTo && (
        // `output` carries the status role itself, so no `role` attribute.
        <output className="email-form__sent">
          We&apos;ve sent a link to {sentTo}. Open it in this browser within an hour to confirm it.
        </output>
      )}
      {/* `noValidate`: every refusal is the server's, worded and placed like
          the rest, rather than the browser's own bubble. */}
      <form className="email-form__form" onSubmit={handleSubmit} noValidate>
        <div className="email-form__field">
          <label className="email-form__label" htmlFor={inputId}>
            Email address
          </label>
          <input
            id={inputId}
            className="email-form__input"
            type="email"
            autoComplete="email"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? fieldErrorId : undefined}
          />
          {fieldError && (
            <p id={fieldErrorId} className="email-form__field-error">
              {fieldError}
            </p>
          )}
        </div>
        <div className="email-form__actions">
          <button
            type="submit"
            className="btn email-form__submit"
            disabled={nothingToDo || mutation.isPending || coolingDown}
          >
            {coolingDown ? `Send Again in ${secondsLeft}s` : 'Send Confirmation'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmailForm;
