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

function fillText() {
  fireEvent.change(subject(), { target: { value: ' Cannot read the menu ' } });
  fireEvent.change(message(), { target: { value: ' The text is too faint. ' } });
}

// Writes the subject and message, and chooses Bug when the form opened with nothing chosen.
function fill() {
  fillText();
  if (!within(aboutGroup()).queryByRole('radio', { checked: true })) {
    fireEvent.click(aboutRadio('Bug'));
  }
}

describe('SupportForm', () => {
  it('offers seven cards with none chosen, unless an about is given', () => {
    const { unmount } = render(<SupportForm path="/a" />);
    const radios = within(aboutGroup()).getAllByRole('radio');
    expect(radios).toHaveLength(7);
    for (const radio of radios) expect(radio).not.toBeChecked();
    unmount();

    render(<SupportForm path="/a" about="bug" />);
    expect(aboutRadio('Bug')).toBeChecked();
    expect(aboutRadio('Accessibility')).not.toBeChecked();
  });

  it('sends nothing and says so while no about is chosen', () => {
    const calls = mockSending();
    render(<SupportForm path="/a" />);
    fillText();
    fireEvent.click(send());
    expect(aboutGroup()).toHaveAccessibleDescription('Choose what this is about.');
    expect(calls).toHaveLength(0);
    expect(screen.queryByRole('status')).toBeNull();

    fireEvent.click(aboutRadio('Question'));
    expect(aboutGroup()).not.toHaveAccessibleDescription('Choose what this is about.');
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

  it('keeps Send enabled from the start', () => {
    render(<SupportForm path="/a" />);
    expect(send()).toBeEnabled();
  });

  it('shows each problem beside its field and focuses the first when sent with nothing filled in', async () => {
    const calls = mockSending();
    render(<SupportForm path="/a" />);
    fireEvent.click(send());

    await waitFor(() => expect(within(aboutGroup()).getAllByRole('radio')[0]).toHaveFocus());
    expect(calls).toHaveLength(0);
    expect(screen.getByText('Choose what this is about.')).toBeInTheDocument();
    expect(subject()).toHaveAccessibleDescription(/Write a subject/);
    expect(message()).toHaveAccessibleDescription(/Write a message/);
    expect(subject()).toBeInvalid();
    expect(screen.queryByText('There is a problem')).toBeNull();
  });

  it('flags only what is wrong, focuses it, and clears the errors once a send goes through', async () => {
    mockSending();
    render(<SupportForm path="/a" about="bug" />);
    fireEvent.change(subject(), { target: { value: 'Hello' } });
    fireEvent.click(send());
    await waitFor(() => expect(message()).toHaveFocus());
    expect(message()).toHaveAccessibleDescription(/Write a message/);
    expect(subject()).not.toBeInvalid();

    fireEvent.change(message(), { target: { value: 'Body' } });
    fireEvent.click(send());
    await screen.findByRole('status');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('states the limits without blocking typing', () => {
    render(<SupportForm path="/a" />);
    expect(subject()).not.toHaveAttribute('maxlength');
    expect(message()).not.toHaveAttribute('maxlength');
    expect(subject()).toHaveAccessibleDescription(/120/);
    expect(message()).toHaveAccessibleDescription(/4000/);
  });

  it('counts the characters left only once a field passes 75% of its limit', () => {
    render(<SupportForm path="/a" />);
    fireEvent.change(subject(), { target: { value: 'a'.repeat(90) } });
    expect(screen.queryByText(/characters left/)).toBeNull();

    fireEvent.change(subject(), { target: { value: 'a'.repeat(91) } });
    expect(screen.getByText('29 characters left')).toBeInTheDocument();
    expect(subject()).toHaveAccessibleDescription(/29 characters left/);

    fireEvent.change(subject(), { target: { value: 'a'.repeat(119) } });
    expect(screen.getByText('1 character left')).toBeInTheDocument();

    fireEvent.change(message(), { target: { value: 'a'.repeat(3000) } });
    fireEvent.change(message(), { target: { value: 'a'.repeat(3001) } });
    expect(screen.getByText('999 characters left')).toBeInTheDocument();

    fireEvent.change(page(), { target: { value: 'a'.repeat(376) } });
    expect(screen.getByText('124 characters left')).toBeInTheDocument();
  });

  it('lets a field run past its limit, says so, and refuses the send', async () => {
    const calls = mockSending();
    render(<SupportForm path="/a" about="bug" />);
    fireEvent.change(subject(), { target: { value: 'a'.repeat(125) } });
    fireEvent.change(message(), { target: { value: 'Body' } });
    expect(subject()).toHaveValue('a'.repeat(125));
    expect(screen.getByText('5 characters over')).toBeInTheDocument();

    fireEvent.click(send());
    await waitFor(() => expect(subject()).toHaveFocus());
    expect(subject()).toHaveAccessibleDescription(/Keep the subject to 120 characters/);
    expect(calls).toHaveLength(0);
  });

  it('refuses a page address past its limit before sending', async () => {
    const calls = mockSending();
    render(<SupportForm path="/a" about="bug" />);
    fill();
    fireEvent.change(page(), { target: { value: '/'.repeat(501) } });
    fireEvent.click(send());
    await waitFor(() => expect(page()).toHaveFocus());
    expect(page()).toHaveAccessibleDescription(/too long/);
    expect(calls).toHaveLength(0);
  });

  it('refuses a page that is not on this site before sending, and accepts the site address', async () => {
    const calls = mockSending();
    render(<SupportForm path="/a" about="bug" />);
    fill();
    fireEvent.change(page(), { target: { value: 'https://example.test/a' } });
    fireEvent.click(send());
    await waitFor(() => expect(page()).toHaveFocus());
    expect(page()).toHaveAccessibleDescription(/Start with \/ or the site's address/);
    expect(calls).toHaveLength(0);
    fireEvent.change(page(), { target: { value: 'https://sorrelandsalt.com/a' } });
    fireEvent.click(send());
    await screen.findByRole('status');
    expect(calls).toHaveLength(1);
  });

  it('shows the error number, and the page it was opened from in a field', () => {
    render(<SupportForm path="/coven/x/missing" errorCode={404} about="bug" />);
    expect(page()).toHaveAccessibleDescription(/Opened from the Error 404 page/);
    expect(page()).toHaveValue('/coven/x/missing');
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
    await waitFor(() => expect(page()).toHaveFocus());
    expect(page()).toHaveAccessibleDescription(/too long/);
    expect(page()).toBeInvalid();
  });

  it('sends a path with a coven slug as it is, never a route pattern', async () => {
    const calls = mockSending();
    render(<SupportForm path="/coven/whitethorn-coven/grimoire" about="bug" />);
    fill();
    fireEvent.click(send());

    await screen.findByRole('status');
    expect(calls[0]?.input.path).toBe('/coven/whitethorn-coven/grimoire');
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

  it('shows the reference as fixed text and sends it as errorReference', async () => {
    const calls = mockSending();
    render(<SupportForm path="/x" errorCode={500} errorReference="abc123" about="bug" />);
    expect(screen.getByRole('textbox', { name: 'Page' })).toHaveAccessibleDescription(
      /Opened from the Error 500 page, reference abc123\. You can change it\./,
    );
    fill();
    fireEvent.click(send());
    await screen.findByRole('status');
    expect(calls[0]?.input).toMatchObject({ errorCode: 500, errorReference: 'abc123' });
  });

  it('names the request in the received notice, links it, and gives the promise', async () => {
    mockSending();
    render(<SupportForm path="/a" />);
    fill();
    fireEvent.click(send());
    const notice = await screen.findByRole('status');
    expect(within(notice).getByRole('link', { name: /Cannot read the menu/ })).toHaveAttribute(
      'href',
      '/account/support',
    );
    expect(notice).toHaveTextContent('within 5 working days');
    expect(notice).toHaveTextContent('small team');
    expect(notice).toHaveTextContent('we mail you when one arrives');
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
