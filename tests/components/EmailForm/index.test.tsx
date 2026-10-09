import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { HttpResponse } from 'msw';
import { describe, expect, it, onTestFinished, vi } from 'vitest';
import EmailForm from '@/components/EmailForm';
import type { SetEmailMutation, SetEmailMutationVariables } from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { graphqlLink, mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { server } from '../../support/msw/server';

// The /account/email form. The mutation is answered by MSW in the shape
// /api/graphql answers (tests/support/msw/graphql.ts), so what the component
// reads back is the route's own error mapping, not a hand-written body
// (claude-docs/components/email-form.md).

function renderForm(ui: ReactNode) {
  return render(<QueryClientProvider client={makeQueryClient()}>{ui}</QueryClientProvider>);
}

const emailField = () => screen.getByRole('textbox', { name: 'Email address' });
const submit = () => screen.getByRole('button', { name: 'Send Confirmation' });

/** Answers `SetEmail` with the row as it is, recording the variables it was sent. */
function acceptSetEmail() {
  const calls: SetEmailMutationVariables[] = [];
  mockGraphQLMutation<SetEmailMutation, SetEmailMutationVariables>('SetEmail', (variables) => {
    calls.push(variables);
    return { setEmail: { id: 'u1', email: 'old@example.test' } };
  });
  return calls;
}

describe('EmailForm', () => {
  it('prefills the field with the account address', () => {
    renderForm(<EmailForm email="ada@example.test" verified={false} landing="/coven" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Your email' })).toBeInTheDocument();
    expect(emailField()).toHaveValue('ada@example.test');
  });

  it('starts empty when the account has no address', () => {
    renderForm(<EmailForm email="" verified={false} landing="/coven" />);

    expect(emailField()).toHaveValue('');
    expect(screen.getByText(/no email yet/i)).toBeInTheDocument();
  });

  it('says an unverified address is waiting on its link', () => {
    renderForm(<EmailForm email="ada@example.test" verified={false} landing="/coven" />);

    expect(screen.getByText(/not yet verified/i)).toBeInTheDocument();
  });

  // A followed link's landing: the address is proved, so there is nothing to
  // type — only the address, its state, and the way on.
  it('shows only the verified line, the address and Continue once confirmed', () => {
    renderForm(
      <EmailForm
        email="ada@example.test"
        verified
        confirmed
        next="/coven/hearth"
        landing="/admin"
      />,
    );

    expect(screen.getByText('Verified: we will send emails to this address.')).toBeInTheDocument();
    expect(screen.getByText('ada@example.test')).toBeInTheDocument();
    // Where the account was going wins over its role's landing.
    expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute('href', '/coven/hearth');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it("continues to the account's landing when it was going nowhere else", () => {
    renderForm(<EmailForm email="ada@example.test" verified confirmed landing="/admin" />);

    expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute('href', '/admin');
  });

  // Back later to change it: neither the confirmation nor Continue, since
  // nothing was just proved; the field, prefilled, with nothing to send yet.
  it('offers a verified account the field alone when it comes back to change the address', () => {
    renderForm(<EmailForm email="ada@example.test" verified landing="/coven" />);

    expect(screen.queryByText(/^verified/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Continue' })).not.toBeInTheDocument();
    expect(emailField()).toHaveValue('ada@example.test');
    expect(screen.getByText(/enter a new address/i)).toBeInTheDocument();
  });

  it('has nothing to send for an unchanged verified address, until it is edited', () => {
    renderForm(<EmailForm email="ada@example.test" verified landing="/coven" />);

    expect(submit()).toBeDisabled();

    // Case is not a change: the server would store the same value. (Outer
    // whitespace never reaches the value — a `type="email"` input strips it.)
    fireEvent.change(emailField(), { target: { value: 'Ada@Example.test' } });
    expect(submit()).toBeDisabled();

    fireEvent.change(emailField(), { target: { value: 'ada@example.org' } });
    expect(submit()).toBeEnabled();
  });

  it('can resend the link for an unchanged unverified address', () => {
    renderForm(<EmailForm email="ada@example.test" verified={false} landing="/coven" />);

    expect(submit()).toBeEnabled();
  });

  it('sends the typed address and names it, normalised, in the confirmation', async () => {
    const calls = acceptSetEmail();
    renderForm(<EmailForm email="ada@example.test" verified={false} landing="/coven" />);

    fireEvent.change(emailField(), { target: { value: 'New@Example.test' } });
    fireEvent.submit(submit().closest('form') as HTMLFormElement);

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent(
      "We've sent a link to new@example.test. Open it in this browser within an hour to confirm it.",
    );
    // The typed value goes as typed; normalising is the service's job. With
    // no `next`, none is sent: the link lands by role when it is followed.
    expect(calls).toEqual([{ email: 'New@Example.test' }]);
    // The row's own address (still the old one) is never what the message names.
    expect(status).not.toHaveTextContent('old@example.test');
  });

  // The link it asks for lands back here, and Continue goes on from there.
  it('sends where Continue goes with the address, so the mailed link carries it', async () => {
    const calls = acceptSetEmail();
    renderForm(
      <EmailForm email="ada@example.test" verified={false} next="/admin" landing="/coven" />,
    );

    fireEvent.submit(submit().closest('form') as HTMLFormElement);

    await screen.findByRole('status');
    expect(calls).toEqual([{ email: 'ada@example.test', next: '/admin' }]);
  });

  // One mail per minute from a form, so a held-down Enter key or a nervous
  // reader cannot fill an inbox. The clock is faked, so the minute passes at
  // once; `shouldAdvanceTime` keeps it moving for MSW's fetch and `waitFor`,
  // as the IngredientForm files fake it.
  it('waits out a cooldown after a send, refusing a submit meanwhile, then offers to send again', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    onTestFinished(() => {
      vi.useRealTimers();
    });
    const calls = acceptSetEmail();
    renderForm(<EmailForm email="ada@example.test" verified={false} landing="/coven" />);

    fireEvent.submit(submit().closest('form') as HTMLFormElement);
    await screen.findByRole('status');

    const waiting = screen.getByRole('button', { name: 'Send Again in 60s' });
    expect(waiting).toBeDisabled();
    fireEvent.submit(waiting.closest('form') as HTMLFormElement);
    expect(calls).toHaveLength(1);

    await act(() => vi.advanceTimersByTimeAsync(59_000));
    expect(screen.getByRole('button', { name: 'Send Again in 1s' })).toBeDisabled();
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(screen.getByRole('button', { name: 'Send Confirmation' })).toBeEnabled();
  });

  it('puts a field error beside the input and marks the input invalid', async () => {
    mockGraphQLError('SetEmail', {
      code: 'VALIDATION',
      fieldErrors: [
        { path: ['email'], message: 'That address is already in use by another account' },
      ],
    });
    renderForm(<EmailForm email="ada@example.test" verified={false} landing="/coven" />);

    fireEvent.change(emailField(), { target: { value: 'taken@example.test' } });
    fireEvent.submit(submit().closest('form') as HTMLFormElement);

    await waitFor(() => expect(emailField()).toHaveAttribute('aria-invalid', 'true'));
    const describedBy = emailField().getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)).toHaveTextContent(
      'That address is already in use by another account',
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('puts a refusal with no field in the alert region', async () => {
    mockGraphQLError('SetEmail', { code: 'FORBIDDEN', message: 'Sign in to change your email' });
    renderForm(<EmailForm email="ada@example.test" verified={false} landing="/coven" />);

    fireEvent.submit(submit().closest('form') as HTMLFormElement);

    expect(await screen.findByRole('alert')).toHaveTextContent('Sign in to change your email');
    expect(emailField()).not.toHaveAttribute('aria-invalid');
  });

  it('says a send that never reached the server failed, without a reason it does not have', async () => {
    server.use(graphqlLink.mutation('SetEmail', () => HttpResponse.error()));
    renderForm(<EmailForm email="ada@example.test" verified={false} landing="/coven" />);

    fireEvent.submit(submit().closest('form') as HTMLFormElement);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "That didn't work. Please try again.",
    );
  });

  it('clears the last outcome when a new submit starts', async () => {
    mockGraphQLError('SetEmail', { code: 'FORBIDDEN' });
    renderForm(<EmailForm email="ada@example.test" verified={false} landing="/coven" />);

    fireEvent.submit(submit().closest('form') as HTMLFormElement);
    await screen.findByRole('alert');

    acceptSetEmail();
    fireEvent.submit(submit().closest('form') as HTMLFormElement);

    await screen.findByRole('status');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a passed-in error as an alert on mount', () => {
    renderForm(
      <EmailForm
        email="ada@example.test"
        verified={false}
        landing="/coven"
        error="That link has expired. Send a new one below."
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'That link has expired. Send a new one below.',
    );
  });

  it('renders no alert when there is no error', () => {
    renderForm(<EmailForm email="ada@example.test" verified={false} landing="/coven" />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('offers no Continue while the address is unverified', () => {
    renderForm(
      <EmailForm email="ada@example.test" verified={false} next="/coven/hearth" landing="/coven" />,
    );

    expect(screen.queryByRole('link', { name: 'Continue' })).not.toBeInTheDocument();
  });

  // The sign-up mail went out before the page was ever seen, so the server's
  // wait is the countdown's starting point rather than a surprise on submit.
  it('starts counting down from the wait the server reports', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    onTestFinished(() => {
      vi.useRealTimers();
    });
    renderForm(
      <EmailForm email="ada@example.test" verified={false} landing="/coven" waitSeconds={1} />,
    );

    expect(screen.getByRole('button', { name: 'Send Again in 1s' })).toBeDisabled();
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(screen.getByRole('button', { name: 'Send Confirmation' })).toBeEnabled();
  });

  // No browser bubble: the form is `noValidate` and the input not `required`,
  // so an empty field reaches the server and its sentence lands beside the
  // input like every other refusal.
  it("sends an empty field to the server and shows its refusal beside the input, not the browser's", async () => {
    mockGraphQLError('SetEmail', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['email'], message: 'Enter an email address' }],
    });
    renderForm(<EmailForm email="" verified={false} landing="/coven" />);

    expect(emailField().closest('form')).toHaveAttribute('novalidate');
    expect(emailField()).not.toBeRequired();
    fireEvent.submit(submit().closest('form') as HTMLFormElement);

    await waitFor(() => expect(emailField()).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.getByText('Enter an email address')).toBeInTheDocument();
  });
});
