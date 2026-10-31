import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SupportRequests from '@/components/SupportRequests';
import type {
  SupportRequestDetailEntry,
  SupportRequestEntry,
  SupportViewer,
} from '@/components/SupportRequests/types';
import type {
  ReplyToSupportRequestMutation,
  ReplyToSupportRequestMutationVariables,
  SetSupportRequestIssueUrlMutation,
  SetSupportRequestIssueUrlMutationVariables,
  TimeOutSupportSenderMutation,
  TimeOutSupportSenderMutationVariables,
} from '@/gql/graphql';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

// The admin Support page, render-only: the page owns the reads, this owns what a viewer sees of a
// request and sends from it (claude-docs/components/support-requests.md).

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const ADMIN: SupportViewer = { id: 'admin-1', role: 'admin' };
const CURATOR: SupportViewer = { id: 'curator-1', role: 'curator' };
const ADMIN_ONLY = ['Assigned To', 'Issue Address', 'Time Out Until'];

const ROW: SupportRequestEntry = {
  id: 'r1',
  about: 'bug',
  subject: 'The moon icon is missing',
  status: 'open',
  sender: { id: 'u1', name: 'Ada Wortley', email: 'ada@example.test' },
  assignee: null,
  curatorVisible: false,
  errorCode: 500,
  errorReference: null,
};

const DETAIL: SupportRequestDetailEntry = {
  ...ROW,
  message: 'There is no moon on the spell page.',
  path: '/coven/[slug]/grimoire',
  issueUrl: null,
  resolvedBy: null,
  resolvedAt: null,
  replies: [],
  timeouts: [],
};

const open = (viewer: SupportViewer, detail: Partial<SupportRequestDetailEntry> = {}) =>
  render(
    <SupportRequests
      requests={[ROW]}
      viewer={viewer}
      opened={{ ...DETAIL, ...detail }}
      assignees={[{ id: 'curator-1', name: 'Curtis' }]}
    />,
  );

const dialog = () => screen.getByRole('dialog', { name: ROW.subject });

beforeEach(() => {
  router.refresh.mockClear();
});

describe('SupportRequests list', () => {
  it('shows about, subject, status, sender, assignee, curator visibility and error number per row', () => {
    render(<SupportRequests requests={[ROW]} viewer={ADMIN} />);
    const row = screen.getByRole('row', { name: /moon icon/ });
    for (const text of ['Bug', 'Open', 'Ada Wortley', 'Unassigned', 'Hidden', '500']) {
      expect(within(row).getByText(text)).toBeInTheDocument();
    }
    expect(within(row).getByRole('link', { name: ROW.subject })).toHaveAttribute(
      'href',
      '/admin/support?request=r1',
    );
  });

  it('says what the filter left out when no request matches', () => {
    render(
      <SupportRequests
        requests={[]}
        viewer={ADMIN}
        filter={{ about: 'bug', status: '', errorCode: '' }}
      />,
    );
    expect(screen.getByText(/No support requests match/)).toBeInTheDocument();
  });
});

describe('Error reference', () => {
  it('is shown beside the error number with a Copy button that copies it', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    open(ADMIN, { errorReference: 'abc123' });
    expect(within(dialog()).getByText('abc123')).toBeInTheDocument();
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith('abc123');
  });

  it('is left out when the request has none', () => {
    open(ADMIN);
    expect(within(dialog()).queryByRole('button', { name: 'Copy' })).toBeNull();
  });
});

describe('Reply', () => {
  it('is disabled until there is a body, then sends it and reads the page again', async () => {
    const sent: ReplyToSupportRequestMutationVariables[] = [];
    mockGraphQLMutation<ReplyToSupportRequestMutation, ReplyToSupportRequestMutationVariables>(
      'ReplyToSupportRequest',
      (variables) => {
        sent.push(variables);
        return { replyToSupportRequest: { __typename: 'SupportReply', id: 'x' } };
      },
    );
    open(ADMIN);
    const reply = within(dialog()).getByRole('button', { name: 'Reply' });
    expect(reply).toBeDisabled();

    fireEvent.change(within(dialog()).getByRole('textbox', { name: 'Your Reply' }), {
      target: { value: 'Thank you, we are looking.' },
    });
    expect(reply).toBeEnabled();
    fireEvent.click(reply);

    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(sent).toEqual([{ requestId: 'r1', body: 'Thank you, we are looking.' }]);
  });
});

describe('Time Out', () => {
  it('is disabled until a future end is given', () => {
    open(ADMIN);
    const timeOut = within(dialog()).getByRole('button', { name: 'Time Out' });
    const until = within(dialog()).getByLabelText('Time Out Until');
    expect(timeOut).toBeDisabled();

    fireEvent.change(until, { target: { value: '2001-01-01T00:00' } });
    expect(timeOut).toBeDisabled();

    fireEvent.change(until, { target: { value: '2999-01-01T00:00' } });
    expect(timeOut).toBeEnabled();
  });

  it('sends the sender and the end', async () => {
    const sent: TimeOutSupportSenderMutationVariables[] = [];
    mockGraphQLMutation<TimeOutSupportSenderMutation, TimeOutSupportSenderMutationVariables>(
      'TimeOutSupportSender',
      (variables) => {
        sent.push(variables);
        return { timeOutSupportSender: { __typename: 'SupportTimeout', id: 't' } };
      },
    );
    open(ADMIN);
    fireEvent.change(within(dialog()).getByLabelText('Time Out Until'), {
      target: { value: '2999-01-01T00:00' },
    });
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Time Out' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(sent[0]?.userId).toBe('u1');
    expect(new Date(sent[0]?.until as string).getFullYear()).toBe(2999);
  });

  it('lists past time-outs beside the sender, and offers Lift on an active one only', () => {
    open(ADMIN, {
      timeouts: [
        {
          id: 't2',
          until: new Date('2999-01-01T00:00:00Z'),
          note: 'Repeated sends',
          liftedAt: null,
        },
        {
          id: 't1',
          until: new Date('2001-01-01T00:00:00Z'),
          note: 'First warning',
          liftedAt: null,
        },
      ],
    });
    const panel = within(dialog()).getByRole('region', { name: 'Time-Outs' });
    expect(within(panel).getByText(/Ada Wortley/)).toBeInTheDocument();
    expect(within(panel).getByText(/First warning/)).toBeInTheDocument();
    expect(within(panel).getByText(/Repeated sends/)).toBeInTheDocument();
    expect(within(panel).getAllByRole('button', { name: 'Lift' })).toHaveLength(1);
  });
});

describe('Issue', () => {
  it('links Create Issue with the request written in, and not the sender', () => {
    open(ADMIN);
    const link = within(dialog()).getByRole('link', { name: 'Create Issue' });
    const url = new URL(link.getAttribute('href') ?? '');
    expect(url.searchParams.get('title')).toBe(ROW.subject);
    const body = url.searchParams.get('body') ?? '';
    expect(body).toContain(DETAIL.message);
    expect(body).toContain('/coven/[slug]/grimoire');
    expect(body).toContain('r1');
    expect(link.getAttribute('href')).not.toMatch(/Ada|ada%40|ada@/);
  });

  it('says a pasted address that is not an issue on the project beside its field', async () => {
    mockGraphQLError('SetSupportRequestIssueUrl', {
      code: 'VALIDATION',
      fieldErrors: [
        {
          path: ['issueUrl'],
          message: 'Give the address of an issue on Aurora-Arctic/Sorrel-and-Salt',
        },
      ],
    });
    open(ADMIN);
    const field = within(dialog()).getByRole('textbox', { name: 'Issue Address' });
    const save = within(dialog()).getByRole('button', { name: 'Save Address' });
    expect(save).toBeDisabled();

    fireEvent.change(field, { target: { value: 'https://example.test/issues/4' } });
    fireEvent.click(save);

    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'));
    expect(field).toHaveAccessibleDescription(/issue on Aurora-Arctic\/Sorrel-and-Salt/);
  });

  it('sends a good address once, with the request id', async () => {
    const sent: SetSupportRequestIssueUrlMutationVariables[] = [];
    mockGraphQLMutation<
      SetSupportRequestIssueUrlMutation,
      SetSupportRequestIssueUrlMutationVariables
    >('SetSupportRequestIssueUrl', (variables) => {
      sent.push(variables);
      return { setSupportRequestIssueUrl: { __typename: 'SupportRequest', id: 'r1' } };
    });
    open(ADMIN);
    fireEvent.change(within(dialog()).getByRole('textbox', { name: 'Issue Address' }), {
      target: { value: 'https://github.com/Aurora-Arctic/Sorrel-and-Salt/issues/12' },
    });
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Save Address' }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(sent).toEqual([
      { id: 'r1', issueUrl: 'https://github.com/Aurora-Arctic/Sorrel-and-Salt/issues/12' },
    ]);
  });
});

describe('What a viewer is shown', () => {
  it('gives an admin every control', () => {
    open(ADMIN);
    for (const name of ['Assigned To', 'Issue Address', 'Time Out Until', 'Your Reply']) {
      expect(within(dialog()).getByLabelText(name)).toBeInTheDocument();
    }
    expect(within(dialog()).getByRole('switch', { name: 'Curator-Visible' })).toBeInTheDocument();
    expect(within(dialog()).getByRole('button', { name: 'Resolve' })).toBeInTheDocument();
  });

  it('gives a curator Reply and Resolve on a request assigned to them, and no admin-only control', () => {
    open(CURATOR, { assignee: { id: CURATOR.id, name: 'Curtis' } });
    expect(within(dialog()).getByLabelText('Your Reply')).toBeInTheDocument();
    expect(within(dialog()).getByRole('button', { name: 'Resolve' })).toBeInTheDocument();
    for (const name of ADMIN_ONLY) {
      expect(within(dialog()).queryByLabelText(name)).not.toBeInTheDocument();
    }
    expect(within(dialog()).queryByRole('switch', { name: 'Curator-Visible' })).toBeNull();
    expect(within(dialog()).queryByRole('link', { name: 'Create Issue' })).toBeNull();
    expect(within(dialog()).queryByRole('button', { name: 'Lift' })).toBeNull();
  });

  it('gives a curator reading a request only shared with them no control at all', () => {
    open(CURATOR, { curatorVisible: true, assignee: null });
    expect(within(dialog()).getByText(DETAIL.message)).toBeInTheDocument();
    expect(within(dialog()).queryByLabelText('Your Reply')).toBeNull();
    expect(within(dialog()).queryByRole('button', { name: 'Resolve' })).toBeNull();
    for (const name of ADMIN_ONLY) {
      expect(within(dialog()).queryByLabelText(name)).not.toBeInTheDocument();
    }
  });

  it('gives a curator no reply on a request assigned to someone else', () => {
    open(CURATOR, { assignee: { id: 'admin-1', name: 'Ada' } });
    expect(within(dialog()).queryByLabelText('Your Reply')).toBeNull();
    expect(within(dialog()).queryByRole('button', { name: 'Resolve' })).toBeNull();
  });
});
