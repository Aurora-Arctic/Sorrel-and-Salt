import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SupportList from '@/components/SupportList';
import type { SupportListEntry } from '@/components/SupportList/types';
import type { SupportSenderRequestEntry } from '@/components/SupportSenderRequest/types';

const request = (over: Partial<SupportListEntry> = {}): SupportListEntry => ({
  id: 'r1',
  about: 'question',
  subject: 'How do I join a coven?',
  status: 'open',
  createdAt: new Date('2030-01-02T03:04:00Z'),
  replyCount: 0,
  ...over,
});

const opened = (over: Partial<SupportSenderRequestEntry> = {}): SupportSenderRequestEntry => ({
  ...request(),
  path: '/coven/whitethorn',
  message: 'I was sent a card.',
  errorCode: null,
  errorReference: null,
  replies: [],
  ...over,
});

describe('SupportList', () => {
  it('says so when there are no requests', () => {
    render(<SupportList requests={[]} />);
    expect(screen.getByText(/no support requests/i)).toBeInTheDocument();
  });

  it('shows each request with its status, kind, sent day, reply count and a subject link that opens it', () => {
    render(
      <SupportList
        requests={[
          request({ replyCount: 1 }),
          request({
            id: 'r2',
            about: 'accessibility',
            subject: 'Faint text',
            status: 'resolved',
            replyCount: 2,
          }),
        ]}
      />,
    );
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]!).getByRole('link', { name: 'How do I join a coven?' })).toHaveAttribute(
      'href',
      '/account/support?request=r1',
    );
    expect(within(items[0]!).getByText('Open')).toBeInTheDocument();
    expect(within(items[0]!).getByText('Question')).toBeInTheDocument();
    expect(within(items[0]!).getByText('2 Jan 2030')).toBeInTheDocument();
    expect(within(items[0]!).getByText('1 reply')).toBeInTheDocument();
    expect(within(items[1]!).getByText('Resolved')).toBeInTheDocument();
    expect(within(items[1]!).getByText('Accessibility')).toBeInTheDocument();
    expect(within(items[1]!).getByText('2 replies')).toBeInTheDocument();
  });

  it('says a request nobody has answered has no reply yet', () => {
    render(<SupportList requests={[request()]} />);
    expect(screen.getByText('No reply yet')).toBeInTheDocument();
  });

  it('draws no page path on a row', () => {
    render(<SupportList requests={[request()]} />);
    expect(screen.queryByText(/\/coven\//)).toBeNull();
  });

  it('draws a bug with no link to an issue', () => {
    render(<SupportList requests={[request({ id: 'b', about: 'bug', subject: 'Broken' })]} />);
    expect(within(screen.getByRole('listitem')).getAllByRole('link')).toHaveLength(1);
  });

  it('draws no pager link where there is no page beyond', () => {
    render(<SupportList requests={[request()]} />);
    expect(screen.queryByRole('link', { name: /Next|Previous/ })).toBeNull();
  });

  it('draws no dialog while no request is opened', () => {
    render(<SupportList requests={[request()]} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens the request in a dialog named by its subject', () => {
    render(<SupportList requests={[request()]} opened={opened()} />);
    expect(screen.getByRole('dialog', { name: 'How do I join a coven?' })).toBeInTheDocument();
  });
});
