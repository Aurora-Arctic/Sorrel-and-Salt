import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SupportForm from '@/components/SupportForm';
import type {
  SendSupportRequestMutation,
  SendSupportRequestMutationVariables,
} from '@/gql/graphql';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

const subject = () => screen.getByRole('textbox', { name: /Subject/ });
const message = () => screen.getByRole('textbox', { name: /Message/ });
const send = () => screen.getByRole('button', { name: /Send Request|Sending/ });

function mockSending() {
  const calls: SendSupportRequestMutationVariables[] = [];
  mockGraphQLMutation<SendSupportRequestMutation, SendSupportRequestMutationVariables>(
    'SendSupportRequest',
    (variables) => {
      calls.push(variables);
      return { sendSupportRequest: { id: 'r1' } };
    },
  );
  return calls;
}

function fill() {
  fireEvent.change(subject(), { target: { value: ' Cannot read the menu ' } });
  fireEvent.change(message(), { target: { value: ' The text is too faint. ' } });
}

describe('SupportForm', () => {
  it('offers accessibility first and selected, unless a kind is given', () => {
    const { unmount } = render(<SupportForm path="/a" />);
    expect(screen.getAllByRole('radio').map((r) => (r as HTMLInputElement).value)[0]).toBe(
      'accessibility',
    );
    expect(screen.getByRole('radio', { name: /Accessibility/ })).toBeChecked();
    unmount();

    render(<SupportForm path="/a" kind="bug" />);
    expect(screen.getByRole('radio', { name: /Bug/ })).toBeChecked();
  });

  it('keeps Send off until both a subject and a message are written', () => {
    render(<SupportForm path="/a" />);
    expect(send()).toBeDisabled();

    fireEvent.change(subject(), { target: { value: 'Hello' } });
    expect(send()).toBeDisabled();

    fireEvent.change(message(), { target: { value: '   ' } });
    expect(send()).toBeDisabled();

    fireEvent.change(message(), { target: { value: 'Body' } });
    expect(send()).toBeEnabled();
  });

  it('states the limits and enforces them on the fields', () => {
    render(<SupportForm path="/a" />);
    expect(subject()).toHaveAttribute('maxlength', '120');
    expect(message()).toHaveAttribute('maxlength', '4000');
    expect(subject()).toHaveAccessibleDescription(/120/);
    expect(message()).toHaveAccessibleDescription(/4000/);
  });

  it('shows the error number and page it was opened from', () => {
    render(<SupportForm path="/coven/x/missing" errorCode={404} kind="bug" />);
    expect(screen.getByText(/Error 404/)).toBeInTheDocument();
    expect(screen.getByText('/coven/x/missing')).toBeInTheDocument();
  });

  it('sends the trimmed text with the kind, page and error, then says it was received', async () => {
    const calls = mockSending();
    render(<SupportForm path="/coven/x/missing" errorCode={404} kind="bug" />);
    fill();
    fireEvent.click(send());

    expect(send()).toBeDisabled();
    expect(await screen.findByRole('status')).toHaveTextContent(/received/);
    expect(calls).toEqual([
      {
        input: {
          kind: 'bug',
          subject: 'Cannot read the menu',
          message: 'The text is too faint.',
          path: '/coven/x/missing',
          errorCode: 404,
        },
      },
    ]);
    // The form is gone, so nothing is sent twice.
    expect(screen.queryByRole('textbox', { name: /Subject/ })).toBeNull();
    expect(screen.getByRole('link', { name: 'Your Support Requests' })).toHaveAttribute(
      'href',
      '/account/support',
    );
  });

  it('sends no error number when there is none', async () => {
    const calls = mockSending();
    render(<SupportForm path="/a" />);
    fill();
    fireEvent.click(send());
    await screen.findByRole('status');
    expect(calls[0]?.input).not.toHaveProperty('errorCode');
  });

  it('says why a send was refused, keeps what was written, and allows another try', async () => {
    mockGraphQLError('SendSupportRequest', { code: 'FORBIDDEN', message: 'Forbidden' });
    render(<SupportForm path="/a" />);
    fill();
    fireEvent.click(send());

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(subject()).toHaveValue(' Cannot read the menu ');
    await waitFor(() => expect(send()).toBeEnabled());
  });

  it('closes from Cancel and, once sent, from Done', async () => {
    mockSending();
    const done = vi.fn();
    render(<SupportForm path="/a" onDone={done} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(done).toHaveBeenCalledTimes(1);

    fill();
    fireEvent.click(send());
    fireEvent.click(await screen.findByRole('button', { name: 'Done' }));
    expect(done).toHaveBeenCalledTimes(2);
  });
});
