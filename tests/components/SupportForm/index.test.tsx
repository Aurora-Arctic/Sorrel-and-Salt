import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SupportForm from '@/components/SupportForm';
import { SUPPORT_ABOUTS } from '@/lib/support-path';
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
const aboutGroup = () => screen.getByRole('group', { name: 'What Is This About?' });
const aboutRadio = (label: string) =>
  within(aboutGroup()).getByRole('radio', { name: new RegExp(`^${label}`) });
const page = () => screen.getByRole('textbox', { name: 'Page' });
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
  it('offers seven cards, accessibility first and checked, unless an about is given', () => {
    const { unmount } = render(<SupportForm path="/a" />);
    const radios = within(aboutGroup()).getAllByRole('radio');
    expect(radios).toHaveLength(7);
    expect(radios[0]).toBeChecked();
    expect(radios.filter((radio) => (radio as HTMLInputElement).checked)).toHaveLength(1);
    unmount();

    render(<SupportForm path="/a" about="bug" />);
    expect(aboutRadio('Bug')).toBeChecked();
    expect(aboutRadio('Accessibility')).not.toBeChecked();
  });

  it('shows what each about means inside its card', () => {
    render(<SupportForm path="/a" />);
    for (const option of SUPPORT_ABOUTS) {
      expect(within(aboutGroup()).getByText(option.description)).toBeVisible();
    }
  });

  it('sends the about that was chosen', async () => {
    const calls = mockSending();
    render(<SupportForm path="/a" />);
    fill();
    fireEvent.click(aboutRadio('Privacy & Data'));
    fireEvent.click(send());
    await screen.findByRole('status');
    expect(calls[0]?.input.about).toBe('privacy');
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

  it('shows the error number, and the page it was opened from in a field', () => {
    render(<SupportForm path="/coven/x/missing" errorCode={404} about="bug" />);
    expect(screen.getByText(/Error 404/)).toBeInTheDocument();
    expect(page()).toHaveValue('/coven/x/missing');
    expect(page()).toHaveAttribute('maxlength', '500');
    expect(page()).toHaveAccessibleDescription(/500/);
  });

  it('sends an edited page', async () => {
    const calls = mockSending();
    render(<SupportForm path="/a" />);
    fill();
    fireEvent.change(page(), { target: { value: '/b' } });
    fireEvent.click(send());
    await screen.findByRole('status');
    expect(calls[0]?.input.path).toBe('/b');
  });

  it('sends no page when the field is cleared', async () => {
    const calls = mockSending();
    render(<SupportForm path="/a" />);
    fill();
    fireEvent.change(page(), { target: { value: '  ' } });
    fireEvent.click(send());
    await screen.findByRole('status');
    expect(calls[0]?.input).not.toHaveProperty('path');
  });

  it('shows the page error beside the field', async () => {
    mockGraphQLError('SendSupportRequest', {
      code: 'VALIDATION',
      message: 'Invalid',
      fieldErrors: [{ path: ['path'], message: 'That page address is too long' }],
    });
    render(<SupportForm path="/a" />);
    fill();
    fireEvent.click(send());
    await screen.findByText('That page address is too long');
    expect(page()).toHaveAccessibleDescription(/too long/);
    expect(page()).toBeInvalid();
  });

  it('sends the trimmed text with the about, page and error, then says it was received', async () => {
    const calls = mockSending();
    render(<SupportForm path="/coven/x/missing" errorCode={404} about="bug" />);
    fill();
    fireEvent.click(send());

    expect(send()).toBeDisabled();
    expect(await screen.findByRole('status')).toHaveTextContent(/received/);
    expect(calls).toEqual([
      {
        input: {
          about: 'bug',
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
