import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mockGraphQLMutation } from '../../support/msw/graphql';
import SupportSenderRequest from '@/components/SupportSenderRequest';
import { senderStatusLabel } from '@/components/SupportSenderRequest/status';
import type { SupportSenderRequestEntry } from '@/components/SupportSenderRequest/types';

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const request = (over: Partial<SupportSenderRequestEntry> = {}): SupportSenderRequestEntry => ({
  id: 'r1',
  about: 'question',
  subject: 'How do I join a coven?',
  status: 'open',
  message: 'I was sent a card.',
  createdAt: new Date('2030-01-02T03:04:00Z'),
  path: '/coven/whitethorn',
  errorCode: null,
  replies: [],
  followUpId: null,
  timedOutUntil: null,
  ...over,
});

describe('SupportSenderRequest', () => {
  it('draws the Page fact as the path alone', () => {
    render(<SupportSenderRequest request={request()} />);
    const page = screen.getByText('Page').closest('div');
    expect(page).toHaveTextContent(/^Page\/coven\/whitethorn$/);
  });

  it('draws the Error fact as the code alone', () => {
    render(<SupportSenderRequest request={request({ errorCode: 500 })} />);
    const error = screen.getByText('Error').closest('div');
    expect(error).toHaveTextContent(/^Error500$/);
  });

  it('shows the sender their own message tagged You', () => {
    render(<SupportSenderRequest request={request()} />);
    const thread = screen.getByRole('region', { name: 'Thread' });
    const [own] = within(thread).getAllByRole('listitem');
    expect(within(own!).getAllByText('You')).toHaveLength(2);
    expect(within(own!).getByText('I was sent a card.')).toBeInTheDocument();
  });

  it('names every reply for the site and tags it Staff, oldest first', () => {
    render(
      <SupportSenderRequest
        request={request({
          replies: [
            {
              id: 'p1',
              body: 'First answer.',
              createdAt: new Date('2030-01-03T00:00:00Z'),
              fromSender: false,
            },
            {
              id: 'p2',
              body: 'Second answer.',
              createdAt: new Date('2030-01-04T00:00:00Z'),
              fromSender: false,
            },
          ],
        })}
      />,
    );
    const items = within(screen.getByRole('region', { name: 'Thread' })).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(within(items[1]!).getByText('Staff')).toBeInTheDocument();
    expect(within(items[1]!).getByText('Sorrel & Salt')).toBeInTheDocument();
    expect(within(items[1]!).getByText('First answer.')).toBeInTheDocument();
    expect(within(items[2]!).getByText('Staff')).toBeInTheDocument();
    expect(within(items[2]!).getByText('Second answer.')).toBeInTheDocument();
  });

  it('shows the page the request was about', () => {
    render(<SupportSenderRequest request={request()} />);
    expect(screen.getByText('/coven/whitethorn')).toBeInTheDocument();
  });

  it('puts the sender’s own follow-ups in the thread in order, tagged You', () => {
    render(
      <SupportSenderRequest
        request={request({
          replies: [
            {
              id: 'p1',
              body: 'Which jar?',
              createdAt: new Date('2030-01-03T00:00:00Z'),
              fromSender: false,
            },
            {
              id: 'p2',
              body: 'The red one.',
              createdAt: new Date('2030-01-04T00:00:00Z'),
              fromSender: true,
            },
            {
              id: 'p3',
              body: 'Thanks.',
              createdAt: new Date('2030-01-05T00:00:00Z'),
              fromSender: false,
            },
          ],
        })}
      />,
    );
    const items = within(screen.getByRole('region', { name: 'Thread' })).getAllByRole('listitem');
    expect(items.map((item) => item.querySelector('p')?.textContent)).toEqual([
      'I was sent a card.',
      'Which jar?',
      'The red one.',
      'Thanks.',
    ]);
    expect(within(items[2]!).getAllByText('You')).toHaveLength(2);
    expect(within(items[3]!).getByText('Staff')).toBeInTheDocument();
  });

  it.each(['open', 'waiting_on_sender', 'resolved'] as const)(
    'has a reply box for a %s request, with no follow-up link',
    (status) => {
      render(<SupportSenderRequest request={request({ status })} />);
      expect(screen.getByRole('textbox', { name: 'Your Reply' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Reply' })).toBeDisabled();
      expect(screen.queryByRole('link')).toBeNull();
    },
  );

  it('has no reply box for a closed request, and links its follow-up', () => {
    render(<SupportSenderRequest request={request({ status: 'closed', followUpId: 'r2' })} />);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reply' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Open Your Follow-Up' })).toHaveAttribute(
      'href',
      '/account/support?request=r2',
    );
  });

  it('has no link for a closed request nobody has followed up', () => {
    render(<SupportSenderRequest request={request({ status: 'closed' })} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('sends the typed reply through the mutation and reads the page again', async () => {
    const sent: { requestId: string; body: string }[] = [];
    mockGraphQLMutation('SendSupportMessage', (variables: { requestId: string; body: string }) => {
      sent.push(variables);
      return { sendSupportMessage: { __typename: 'SupportRequest', id: 'r1' } };
    });
    render(<SupportSenderRequest request={request({ status: 'waiting_on_sender' })} />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Your Reply' }), 'The red one.');
    await userEvent.click(screen.getByRole('button', { name: 'Reply' }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(sent).toEqual([{ requestId: 'r1', body: 'The red one.' }]);
  });

  it('shuts the box and the button while timed out, with the end time in a notice above them', () => {
    render(
      <SupportSenderRequest
        request={request({ timedOutUntil: new Date('2999-01-01T00:00:00Z') })}
      />,
    );
    const notice = screen.getByText('You cannot reply until 2999-01-01 00:00 UTC.');
    const box = screen.getByRole('textbox', { name: 'Your Reply' });
    expect(box).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reply' })).toBeDisabled();
    expect(notice.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows no notice and an open box with no time-out', () => {
    render(<SupportSenderRequest request={request()} />);
    expect(screen.queryByText(/cannot reply until/)).toBeNull();
  });

  it('draws no issue link, assignment or settings', () => {
    render(<SupportSenderRequest request={request({ about: 'bug' })} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(screen.queryByLabelText('Assignee')).toBeNull();
  });
});

describe('senderStatusLabel', () => {
  it.each([
    ['open', false, 'Received'],
    ['open', true, 'Replied'],
    ['waiting_on_sender', true, 'Waiting for You'],
    ['resolved', true, 'Resolved'],
    ['closed', true, 'Closed'],
  ] as const)('names %s (staff wrote last: %s) %s', (status, staff, label) => {
    expect(senderStatusLabel(status, staff)).toBe(label);
  });

  describe('Resolve', () => {
    it('resolves a request waiting on the sender without a reply, and reads the page again', async () => {
      const sent: { id: string }[] = [];
      mockGraphQLMutation('ResolveMySupportRequest', (variables: { id: string }) => {
        sent.push(variables);
        return { resolveMySupportRequest: { __typename: 'SupportRequest', id: 'r1' } };
      });
      router.refresh.mockClear();
      render(<SupportSenderRequest request={request({ status: 'waiting_on_sender' })} />);
      await userEvent.click(screen.getByRole('button', { name: 'Resolve' }));
      await waitFor(() => expect(router.refresh).toHaveBeenCalled());
      expect(sent).toEqual([{ id: 'r1' }]);
    });

    it('is offered on an open request too', () => {
      render(<SupportSenderRequest request={request({ status: 'open' })} />);
      expect(screen.getByRole('button', { name: 'Resolve' })).toBeInTheDocument();
    });

    it('is not offered once resolved or closed', () => {
      const { rerender } = render(
        <SupportSenderRequest request={request({ status: 'resolved' })} />,
      );
      expect(screen.queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument();
      rerender(<SupportSenderRequest request={request({ status: 'closed' })} />);
      expect(screen.queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument();
    });
  });
});
