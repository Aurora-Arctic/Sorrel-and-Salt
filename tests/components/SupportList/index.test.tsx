import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SupportList from '@/components/SupportList';
import type { SupportListEntry } from '@/components/SupportList/types';
import type { SupportSenderRequestEntry } from '@/components/SupportSenderRequest/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/account/support',
  useSearchParams: () => new URLSearchParams(),
}));

const request = (over: Partial<SupportListEntry> = {}): SupportListEntry => ({
  id: 'r1',
  about: 'question',
  subject: 'How do I join a coven?',
  status: 'open',
  createdAt: new Date('2030-01-02T03:04:00Z'),
  replyCount: 0,
  staffWroteLast: false,
  ...over,
});

const opened = (over: Partial<SupportSenderRequestEntry> = {}): SupportSenderRequestEntry => ({
  ...request(),
  path: '/coven/whitethorn',
  message: 'I was sent a card.',
  errorCode: null,
  replies: [],
  followUpId: null,
  timedOutUntil: null,
  ...over,
});

const none = { open: 0, closed: 0 };

describe('SupportList', () => {
  it('counts open and closed requests across all of them, with singulars', () => {
    const { rerender } = render(<SupportList requests={[]} counts={{ open: 3, closed: 2 }} />);
    expect(screen.getByText('3 Open Requests / 2 Closed Requests')).toBeInTheDocument();
    rerender(<SupportList requests={[]} counts={{ open: 1, closed: 1 }} />);
    expect(screen.getByText('1 Open Request / 1 Closed Request')).toBeInTheDocument();
  });

  it('reads No Requests Yet with none', () => {
    render(<SupportList requests={[]} counts={none} />);
    expect(screen.getByText('No Requests Yet')).toBeInTheDocument();
  });

  it('offers New Request as a link, whether or not there are requests', () => {
    render(<SupportList counts={none} requests={[]} />);
    expect(screen.getByRole('link', { name: 'New Request' })).toBeInTheDocument();
  });

  it('says so when there are no requests', () => {
    render(<SupportList counts={none} requests={[]} />);
    expect(screen.getByText(/no support requests/i)).toBeInTheDocument();
  });

  it('shows each request with its status, kind, sent day, reply count and a subject link that opens it', () => {
    render(
      <SupportList
        counts={none}
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
    expect(within(items[0]!).getByText('Received')).toBeInTheDocument();
    expect(within(items[0]!).getByText('Question')).toBeInTheDocument();
    expect(within(items[0]!).getByText('2 Jan 2030')).toBeInTheDocument();
    expect(within(items[0]!).getByText('1 reply')).toBeInTheDocument();
    expect(within(items[1]!).getByText('Resolved')).toBeInTheDocument();
    expect(within(items[1]!).getByText('Accessibility')).toBeInTheDocument();
    expect(within(items[1]!).getByText('2 replies')).toBeInTheDocument();
  });

  it('says a request nobody has answered has no reply yet', () => {
    render(<SupportList counts={none} requests={[request()]} />);
    expect(screen.getByText('No reply yet')).toBeInTheDocument();
  });

  it('draws no page path on a row', () => {
    render(<SupportList counts={none} requests={[request()]} />);
    expect(screen.queryByText(/\/coven\//)).toBeNull();
  });

  it('draws a bug with no link to an issue', () => {
    render(
      <SupportList
        counts={none}
        requests={[request({ id: 'b', about: 'bug', subject: 'Broken' })]}
      />,
    );
    expect(within(screen.getByRole('listitem')).getAllByRole('link')).toHaveLength(1);
  });

  it('draws no pager link where there is no page beyond', () => {
    render(<SupportList counts={none} requests={[request()]} />);
    expect(screen.queryByRole('link', { name: /Next|Previous/ })).toBeNull();
  });

  it('draws no dialog while no request is opened', () => {
    render(<SupportList counts={none} requests={[request()]} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens the request in a dialog named by its subject', () => {
    render(<SupportList counts={none} requests={[request()]} opened={opened()} />);
    expect(screen.getByRole('dialog', { name: /How do I join a coven\?/ })).toBeInTheDocument();
  });

  it('marks a row waiting on the sender with a dot, and no other row', () => {
    render(
      <SupportList
        requests={[
          request({ id: 'a', subject: 'Waiting one', status: 'waiting_on_sender' }),
          request({ id: 'b', subject: 'Open one', status: 'open' }),
          request({ id: 'c', subject: 'Resolved one', status: 'resolved' }),
        ]}
        counts={none}
      />,
    );
    const dots = screen.getAllByRole('img', { name: 'Waiting on you' });
    expect(dots).toHaveLength(1);
    expect(dots[0]!.closest('li')).toHaveTextContent('Waiting one');
  });
});
