import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SignedOutSupportForm from '@/components/SignedOutSupportForm';
import type {
  SendSignedOutSupportRequestMutation,
  SendSignedOutSupportRequestMutationVariables,
} from '@/gql/graphql';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

const send = () => screen.getByRole('button', { name: /Send Request|Sending/ });

function fill() {
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
    fill();

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

  it('says the limit was reached, with the server’s words, and keeps what was written', async () => {
    mockGraphQLError('SendSignedOutSupportRequest', {
      code: 'RATE_LIMITED',
      message: 'You have sent too many requests today. Try again later.',
    });
    render(<SignedOutSupportForm path="/support" />);
    fill();

    fireEvent.click(send());

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/too many requests/));
    expect(screen.getByRole('textbox', { name: /Subject/ })).toHaveValue('Cannot sign in');
  });
});
