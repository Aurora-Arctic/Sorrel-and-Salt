import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SupportSenderRequest from '@/components/SupportSenderRequest';
import type { SupportSenderRequestEntry } from '@/components/SupportSenderRequest/types';

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
            { id: 'p1', body: 'First answer.', createdAt: new Date('2030-01-03T00:00:00Z') },
            { id: 'p2', body: 'Second answer.', createdAt: new Date('2030-01-04T00:00:00Z') },
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

  it('draws a shut reply box with a Reply button that cannot be pressed', () => {
    render(<SupportSenderRequest request={request()} />);
    expect(screen.getByRole('textbox', { name: 'Your Reply' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reply' })).toBeDisabled();
    expect(screen.queryByText('Replies are coming.')).toBeNull();
  });

  it('draws no issue link, assignment or settings', () => {
    render(<SupportSenderRequest request={request({ about: 'bug' })} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(screen.queryByLabelText('Assigned To')).toBeNull();
  });
});
