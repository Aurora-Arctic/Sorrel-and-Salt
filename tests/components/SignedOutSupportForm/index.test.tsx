import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SignedOutSupportForm from '@/components/SignedOutSupportForm';
import type {
  SendSignedOutSupportRequestMutation,
  SendSignedOutSupportRequestMutationVariables,
} from '@/gql/graphql';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { EMAIL_FORMAT_MESSAGE, emailAddressProblem } from '@/lib/email-address';
import { ABOUT_REQUIRED, MESSAGE_REQUIRED, SUBJECT_REQUIRED } from '@/lib/support-messages';

const aboutGroup = () => screen.getByRole('group', { name: /What Is This About/ });
const box = (name: RegExp) => screen.getByRole('textbox', { name });

function recordCalls() {
  const calls: SendSignedOutSupportRequestMutationVariables[] = [];
  mockGraphQLMutation<
    SendSignedOutSupportRequestMutation,
    SendSignedOutSupportRequestMutationVariables
  >('SendSignedOutSupportRequest', (variables) => {
    calls.push(variables);
    return { sendSignedOutSupportRequest: true };
  });
  return calls;
}

const send = () => screen.getByRole('button', { name: /Send Request|Sending/ });

function fillForm() {
  fireEvent.click(screen.getByRole('radio', { name: /^Account/ }));
  fireEvent.change(screen.getByRole('textbox', { name: /Email/ }), {
    target: { value: ' visitor@example.test ' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: /Subject/ }), {
    target: { value: 'Cannot sign in' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: /Message/ }), {
    target: { value: 'No code arrives.' },
  });
}

describe('SignedOutSupportForm', () => {
  it('offers the five topics open without an account and nothing else', () => {
    render(<SignedOutSupportForm path="/support" />);

    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(screen.getByRole('radio', { name: /^Accessibility/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^Account/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^Bug/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^Privacy/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^Question/ })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /^Feedback/ })).toBeNull();
  });

  it('opens with the topic chosen when it is one open without an account', () => {
    render(<SignedOutSupportForm about="privacy" path="/privacy" />);
    expect(screen.getByRole('radio', { name: /^Privacy/ })).toBeChecked();
  });

  it('chooses nothing for a topic that needs an account', () => {
    render(<SignedOutSupportForm about="compendium" path="/disclaimer" />);
    expect(
      screen.getAllByRole('radio').filter((radio) => (radio as HTMLInputElement).checked),
    ).toHaveLength(0);
  });

  it('sends the trimmed address with the request, then says the answer comes by email', async () => {
    const calls: SendSignedOutSupportRequestMutationVariables[] = [];
    mockGraphQLMutation<
      SendSignedOutSupportRequestMutation,
      SendSignedOutSupportRequestMutationVariables
    >('SendSignedOutSupportRequest', (variables) => {
      calls.push(variables);
      return { sendSignedOutSupportRequest: true };
    });
    render(<SignedOutSupportForm path="/support" />);
    fillForm();

    fireEvent.click(send());

    expect(await screen.findByRole('status')).toHaveTextContent(/by email within 5 working days/);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.input).toMatchObject({
      about: 'account',
      email: 'visitor@example.test',
      subject: 'Cannot sign in',
      path: '/support',
    });
    expect(calls[0]!.input.website).toBeUndefined();
  });

  it('shows the error detail read-only and sends it with the error reference', async () => {
    const calls = recordCalls();
    const detail = 'TypeError: Testwort is not a function';
    render(
      <SignedOutSupportForm path="/broken" errorReference="c0a1b2c3d4e" errorDetail={detail} />,
    );
    const shown = screen.getByRole('group', { name: 'Error Details' });
    expect(shown).toHaveTextContent(detail);
    expect(within(shown).queryByRole('textbox')).toBeNull();
    for (const field of screen.getAllByRole('textbox')) expect(field).not.toHaveValue(detail);
    fillForm();
    fireEvent.click(send());
    await screen.findByRole('status');
    expect(calls[0]?.input).toMatchObject({ errorReference: 'c0a1b2c3d4e', errorDetail: detail });
  });

  it('shows no error detail, and sends neither it nor a reference, when none is given', async () => {
    const calls = recordCalls();
    render(<SignedOutSupportForm path="/support" />);
    expect(screen.queryByRole('group', { name: 'Error Details' })).toBeNull();
    fillForm();
    fireEvent.click(send());
    await screen.findByRole('status');
    expect(calls[0]?.input).not.toHaveProperty('errorDetail');
    expect(calls[0]?.input).not.toHaveProperty('errorReference');
  });

  it('says the limit was reached, with the server’s words, and keeps what was written', async () => {
    mockGraphQLError('SendSignedOutSupportRequest', {
      code: 'RATE_LIMITED',
      message: 'You have sent too many requests today. Try again later.',
    });
    render(<SignedOutSupportForm path="/support" />);
    fillForm();

    fireEvent.click(send());

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/too many requests/));
    expect(screen.getByRole('textbox', { name: /Subject/ })).toHaveValue('Cannot sign in');
  });

  it('tidies the address on leaving the field', () => {
    render(<SignedOutSupportForm path="/support" />);
    const email = screen.getByRole('textbox', { name: /Email/ });
    fireEvent.change(email, { target: { value: '  Visitor@EXAMPLE.Test ' } });
    fireEvent.blur(email);
    expect(email).toHaveValue('visitor@example.test');
  });

  it('flags a malformed address when the field is left, linked to the field', () => {
    render(<SignedOutSupportForm path="/support" />);
    const email = screen.getByRole('textbox', { name: /Email/ });
    fireEvent.change(email, { target: { value: 'name@' } });
    fireEvent.blur(email);

    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription(expect.stringContaining(EMAIL_FORMAT_MESSAGE));
  });

  it('refuses on Send Request with the same words the box showed when it was left', async () => {
    render(<SignedOutSupportForm path="/support" />);
    fillForm();
    const email = screen.getByRole('textbox', { name: /Email/ });
    fireEvent.change(email, { target: { value: 'visitor@example.invalid' } });
    fireEvent.blur(email);
    const onLeaving = email.getAttribute('aria-describedby');
    const left = emailAddressProblem('visitor@example.invalid') as string;
    expect(email).toHaveAccessibleDescription(expect.stringContaining(left));

    fireEvent.click(send());

    await waitFor(() => expect(email).toHaveAccessibleDescription(expect.stringContaining(left)));
    expect(email.getAttribute('aria-describedby')).toBe(onLeaving);
  });

  it('refuses an address that is not one, and a subject past its limit, without sending', async () => {
    const calls: SendSignedOutSupportRequestMutationVariables[] = [];
    mockGraphQLMutation<
      SendSignedOutSupportRequestMutation,
      SendSignedOutSupportRequestMutationVariables
    >('SendSignedOutSupportRequest', (variables) => {
      calls.push(variables);
      return { sendSignedOutSupportRequest: true };
    });
    render(<SignedOutSupportForm path="/support" />);
    fillForm();
    fireEvent.change(screen.getByRole('textbox', { name: /Email/ }), {
      target: { value: 'visitor' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /Subject/ }), {
      target: { value: 'a'.repeat(121) },
    });

    fireEvent.click(send());

    await waitFor(() => expect(screen.getByRole('textbox', { name: /Email/ })).toBeInvalid());
    expect(screen.getByRole('textbox', { name: /Subject/ })).toBeInvalid();
    expect(calls).toHaveLength(0);
  });

  it('keeps Send Request usable on an empty form', () => {
    render(<SignedOutSupportForm path="/support" />);

    expect(send()).toBeEnabled();
    expect(send()).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('flags every empty required field through its field on Send Request, focuses the topics, and sends nothing', async () => {
    const calls = recordCalls();
    render(<SignedOutSupportForm path="/support" />);
    const cards = within(aboutGroup()).getAllByRole('radio');
    for (const card of cards) expect(card).not.toBeChecked();
    expect(box(/Email/)).not.toBeInvalid();

    fireEvent.click(send());

    await waitFor(() => expect(cards[0]).toHaveFocus());
    expect(aboutGroup()).toHaveAccessibleDescription(expect.stringContaining(ABOUT_REQUIRED));
    for (const card of cards)
      expect(card).toHaveAccessibleDescription(expect.stringContaining(ABOUT_REQUIRED));
    const emailEmpty = emailAddressProblem('') as string;
    expect(box(/Email/)).toBeInvalid();
    expect(box(/Email/)).toHaveAccessibleDescription(expect.stringContaining(emailEmpty));
    expect(box(/Subject/)).toBeInvalid();
    expect(box(/Subject/)).toHaveAccessibleDescription(expect.stringContaining(SUBJECT_REQUIRED));
    expect(box(/Message/)).toBeInvalid();
    expect(box(/Message/)).toHaveAccessibleDescription(expect.stringContaining(MESSAGE_REQUIRED));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(calls).toHaveLength(0);
  });

  it('focuses the first wrong field after the topics when a topic is chosen', async () => {
    const calls = recordCalls();
    render(<SignedOutSupportForm path="/support" />);
    fillForm();
    fireEvent.change(box(/Subject/), { target: { value: ' ' } });
    fireEvent.change(box(/Message/), { target: { value: '' } });

    fireEvent.click(send());

    await waitFor(() => expect(box(/Subject/)).toHaveFocus());
    expect(aboutGroup()).not.toHaveAccessibleDescription(expect.stringContaining(ABOUT_REQUIRED));
    expect(box(/Email/)).not.toBeInvalid();
    expect(box(/Message/)).toBeInvalid();
    expect(calls).toHaveLength(0);
  });

  it('focuses the address first when it is the first wrong field', async () => {
    recordCalls();
    render(<SignedOutSupportForm path="/support" />);
    fillForm();
    fireEvent.change(box(/Email/), { target: { value: '' } });
    fireEvent.change(box(/Message/), { target: { value: '' } });

    fireEvent.click(send());

    await waitFor(() => expect(box(/Email/)).toHaveFocus());
    expect(box(/Message/)).toBeInvalid();
  });

  it('clears a field’s Send Request error once it is filled in', async () => {
    recordCalls();
    render(<SignedOutSupportForm path="/support" />);
    fireEvent.click(send());
    await waitFor(() => expect(box(/Subject/)).toBeInvalid());

    fireEvent.click(within(aboutGroup()).getAllByRole('radio')[1]);
    fireEvent.change(box(/Subject/), { target: { value: 'Cannot sign in' } });

    expect(box(/Subject/)).not.toBeInvalid();
    expect(aboutGroup()).not.toHaveAccessibleDescription(expect.stringContaining(ABOUT_REQUIRED));
    expect(box(/Message/)).toBeInvalid();
  });
});
