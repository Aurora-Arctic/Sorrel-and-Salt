import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SupportList from '@/components/SupportList';
import type { SupportListEntry } from '@/components/SupportList/types';

const request = (over: Partial<SupportListEntry> = {}): SupportListEntry => ({
  id: 'r1',
  kind: 'question',
  subject: 'How do I join a coven?',
  message: 'I was sent a card.',
  status: 'open',
  createdAt: new Date('2030-01-02T03:04:00Z'),
  issueUrl: null,
  replies: [],
  ...over,
});

describe('SupportList', () => {
  it('says so when there are no requests', () => {
    render(<SupportList requests={[]} />);
    expect(screen.getByText(/no support requests/i)).toBeInTheDocument();
  });

  it('shows each request with its kind, status and subject', () => {
    render(
      <SupportList
        requests={[
          request(),
          request({ id: 'r2', kind: 'accessibility', subject: 'Faint text', status: 'resolved' }),
        ]}
      />,
    );
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]!).getByText('How do I join a coven?')).toBeInTheDocument();
    expect(within(items[0]!).getByText('Question')).toBeInTheDocument();
    expect(within(items[0]!).getByText('Open')).toBeInTheDocument();
    expect(within(items[1]!).getByText('Accessibility')).toBeInTheDocument();
    expect(within(items[1]!).getByText('Resolved')).toBeInTheDocument();
  });

  it('shows the replies, oldest first, under their request', () => {
    render(
      <SupportList
        requests={[
          request({
            replies: [
              { id: 'p1', body: 'First answer.', createdAt: new Date('2030-01-03T00:00:00Z') },
              { id: 'p2', body: 'Second answer.', createdAt: new Date('2030-01-04T00:00:00Z') },
            ],
          }),
        ]}
      />,
    );
    const text = screen.getByRole('listitem').textContent ?? '';
    expect(text.indexOf('First answer.')).toBeGreaterThan(-1);
    expect(text.indexOf('Second answer.')).toBeGreaterThan(text.indexOf('First answer.'));
  });

  it('links a bug to its issue, and no other kind', () => {
    render(
      <SupportList
        requests={[
          request({
            id: 'b',
            kind: 'bug',
            subject: 'Broken',
            issueUrl: 'https://example.test/i/1',
          }),
          request({ id: 'q', issueUrl: 'https://example.test/i/2' }),
        ]}
      />,
    );
    const [bug, question] = screen.getAllByRole('listitem');
    expect(within(bug!).getByRole('link', { name: 'View Issue' })).toHaveAttribute(
      'href',
      'https://example.test/i/1',
    );
    expect(within(question!).queryByRole('link', { name: 'View Issue' })).toBeNull();
  });

  it('draws no pager link where there is no page beyond', () => {
    render(<SupportList requests={[request()]} />);
    expect(screen.queryByRole('link', { name: /Next|Previous/ })).toBeNull();
  });
});
